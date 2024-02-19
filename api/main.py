"""
WCHESS API

Run locally: uvicorn main:chess_api --reload
Swagger docs: http://localhost:8000/docs

Manually push to heroku: git subtree push --prefix api heroku master
Logs: heroku logs --tail -a wchess-api

"""

import asyncio
import json
import logging
import os
import random
import uuid
from contextlib import asynccontextmanager
from time import time_ns

import redis
from chess import Board, Move
from constants import AppConstants, RateLimitConfig
from dotenv import load_dotenv
from enums import Castles, Colour, Outcome
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi_socketio import SocketManager
from log_formatting import custom_formatter
from models import Game

load_dotenv()

# logging config (override uvicorn default)
logger = logging.getLogger("uvicorn")
logger.handlers[0].setFormatter(custom_formatter)

# map of players to ongoing games
players_to_games = {}

# connection token bucket (rate limiting)
token_bucket = RateLimitConfig.INITIAL_TOKENS

# redis client setup
# TODO: Heroku Redis
redis_client = redis.from_url(os.getenv("REDIS_URL"))


async def refill_tokens():
    """
    Refills tokens in the token bucket every minute based on REFILL_RATE_MINUTE.
    """
    global token_bucket
    while True:
        await asyncio.sleep(60)
        if token_bucket <= RateLimitConfig.BUCKET_CAPACITY:
            token_bucket += RateLimitConfig.REFILL_RATE_MINUTE


@asynccontextmanager
async def lifespan(_):
    """Handles startup/shutdown"""
    refiller = asyncio.create_task(refill_tokens())
    yield
    # clean up
    refiller.cancel()
    players_to_games.clear()
    # clear all games from redis cache
    for key in redis_client.scan_iter("game:*"):
        redis_client.delete(key)


chess_api = FastAPI(lifespan=lifespan)

chess_api.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://wchess.netlify.app",
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

socket_manager = SocketManager(app=chess_api)

# Helper functions


def opponent_ind(turn: int):
    return int(not bool(turn))


async def get_game(sid, emiterr=True):
    """Get game state from redis with player ID"""
    gid = players_to_games.get(sid, None)
    game = deserialise_game_state(redis_client.get(f"game:{gid}"))
    if not game and emiterr:
        await emit_error(sid)
    return game, gid


async def save_game(gid, game, sid):
    """Set game state in Redis"""
    try:
        redis_client.set(f"game:{gid}", serialise_game_state(game))
        return 0
    except redis.RedisError as e:
        await emit_error(sid, "An error occurred while saving game state")
        logger.error(e)
        return 1


async def clear_game(sid):
    """Clears a user's game(s) from memory"""
    game, gid = await get_game(sid, emiterr=False)
    if not game:
        return
    for p in game.players:
        players_to_games.pop(p, None)
    redis_client.delete(f"game:{gid}")


async def emit_error(sid, message="Something went wrong"):
    """Emits an error event to a client"""
    await chess_api.sio.emit("error", message, to=sid)


async def player_flagged(gid, flagged):
    await chess_api.sio.emit(
        "move",
        {
            "winner": opponent_ind(flagged),
            "outcome": Outcome.TIMEOUT.value,
        },
        room=gid,
    )


def serialise_game_state(game):
    """Serialise game state to JSON string for storage in Redis"""
    game.board = game.board.fen()
    game_dict = game.__dict__
    return json.dumps(game_dict)


def deserialise_game_state(game):
    """Deserialise game state from Redis JSON string"""
    game_dict = json.loads(game)
    game_dict["board"] = Board(game_dict["board"])
    return Game(**game_dict)


# WebSocket event handlers

# Connect/disconnect


@chess_api.sio.on("connect")
async def connect(sid, _):
    global token_bucket
    if token_bucket > 0:
        logger.info(f"Client {sid} connected")
        token_bucket -= 1
    else:
        await emit_error(sid, "Connection limit exceeded")
        logger.warning(f"Connection limit exceeded. Disconnecting {sid}")
        await chess_api.sio.disconnect(sid)


@chess_api.sio.on("disconnect")
async def disconnect(sid):
    await clear_game(sid)
    logger.info(f"Client {sid} disconnected")


# Game management


@chess_api.sio.on("create")
async def create(sid, time_control):
    gid = str(uuid.uuid4())
    chess_api.sio.enter_room(sid, gid)  # create a room for the game
    games_inpr = sum(1 for _ in redis_client.scan_iter("game:*"))
    if games_inpr > RateLimitConfig.CONCURRENT_GAME_LIMIT:
        await emit_error(sid, "Game limit exceeded. Please try again later")
        return
    game = Game(
        players=[sid],
        board=Board(),
        tr_w=time_control * AppConstants.MILLISECONDS_PER_MINUTE,
        tr_b=time_control * AppConstants.MILLISECONDS_PER_MINUTE,
        start_end=(-1, -1),
    )

    players_to_games[sid] = gid
    if await save_game(gid, game, sid):  # if error saving game state
        return

    # send game id to client
    await chess_api.sio.emit("gameId", gid, room=gid)


@chess_api.sio.on("join")
async def join(sid, gid):
    game = deserialise_game_state(redis_client.get(f"game:{gid}"))
    if not game:
        await emit_error(sid, "Game not found")
        return
    elif len(game.players) > 1:
        await emit_error(sid, "This game already has two players")
        return
    chess_api.sio.enter_room(sid, gid)  # join room
    game.players.append(sid)
    players_to_games[sid] = gid

    random.shuffle(game.players)  # randomly pick white and black

    game.start_end = (time_ns() / 1_000_000, -1)

    await chess_api.sio.emit(
        "start",
        {"colour": Colour.WHITE.value[0], "timeRemaining": game.tr_w, "initTimestamp": game.start_end[0]},
        to=game.players[0],
    )
    await chess_api.sio.emit(
        "start",
        {"colour": Colour.BLACK.value[0], "timeRemaining": game.tr_b, "initTimestamp": game.start_end[0]},
        to=game.players[1],
    )

    await save_game(gid, game, sid)


# Move


@chess_api.sio.on("move")
async def move(sid, uci, start_end):
    game, gid = await get_game(sid)
    if not game:
        return
    board = game.board
    move = Move.from_uci(uci)
    castles, en_passant = None, False
    if board.is_kingside_castling(move):
        castles = Castles.KINGSIDE
    elif board.is_queenside_castling(move):
        castles = Castles.QUEENSIDE
    elif board.is_en_passant(move):
        en_passant = True

    try:
        board.push(move)
        outcome = board.outcome(claim_draw=True)
    except AssertionError:
        # move not pseudo-legal
        await emit_error(sid, "Illegal move")
        return

    if opponent_ind(game.board.turn) == 0:
        game.tr_b -= start_end[1] - start_end[0]
    else:
        game.tr_w -= start_end[1] - start_end[0]

    game.start_end = (time_ns() / 1_000_000, -1)

    data = {
        "turn": int(board.turn),  # 1: white, 0: black
        "winner": int(outcome.winner) if outcome else None,
        "outcome": outcome.termination.value if outcome else None,
        "move": str(board.peek()),
        "castles": castles.value if castles else None,
        "enPassant": en_passant,
        "legalMoves": [str(m) for m in board.legal_moves],
        "moveStack": [str(m) for m in board.move_stack],
        "turnStartTime": game.start_end[0],
        "timeRemainingWhite": game.tr_w,
        "timeRemainingBlack": game.tr_b,
    }

    # send updated game state to clients in room
    await chess_api.sio.emit("move", data, room=gid)

    await save_game(gid, game, sid)


# Draws


@chess_api.sio.on("offerDraw")
async def offer_draw(sid):
    game, _ = await get_game(sid)
    if not game:
        return
    chess_api.sio.emit("drawOffer", to=next(p for p in game.players if p != sid))


@chess_api.sio.on("acceptDraw")
async def accept_draw(sid):
    game, gid = await get_game(sid)
    if not game:
        return

    chess_api.sio.emit(
        "move",
        {
            "winner": None,
            "outcome": Outcome.AGREEMENT.value,
        },
        room=gid,
    )


# Resign


@chess_api.sio.on("resign")
async def resign(sid):
    game, gid = await get_game(sid)
    if not game:
        return
    await chess_api.sio.emit(
        "move",
        {
            "winner": int(game.players.index(sid)),
            "outcome": Outcome.RESIGNATION.value,
        },
        room=gid,
    )


# Flag


@chess_api.sio.on("flag")
async def flag(sid, flagged):
    game, gid = await get_game(sid)
    if not game:
        return
    await player_flagged(gid, flagged)


# Rematch (offer and accept)


@chess_api.sio.on("offerRematch")
async def offer_rematch(sid):
    game, _ = await get_game(sid)
    if game:
        chess_api.sio.emit("rematchOffer", 1, to=next(p for p in game.players if p != sid))


@chess_api.sio.on("acceptRematch")
async def accept_rematch(sid):
    game, _ = await get_game(sid)
    if not game:
        return
    game.board.reset()
    game.players.reverse()  # switch white and black

    await chess_api.sio.emit(
        "start",
        {"colour": Colour.WHITE.value[0], "timeRemaining": game.tr_w, "initTimestamp": game.start_end[0]},
        to=game.players[0],
    )
    await chess_api.sio.emit(
        "start",
        {"colour": Colour.BLACK.value[0], "timeRemaining": game.tr_b, "initTimestamp": game.start_end[0]},
        to=game.players[1],
    )


@chess_api.sio.on("exit")
async def exit(sid):
    """When a client exits the game, clear it from memory"""
    clear_game(sid)
