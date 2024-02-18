"""
WCHESS API

Run locally: uvicorn main:chess_api --reload
Swagger docs: http://localhost:8000/docs

Manually push to heroku: git subtree push --prefix api heroku master
Logs: heroku logs --tail -a wchess-api

"""

import asyncio
import logging
import random
import uuid
from contextlib import asynccontextmanager

from chess import Board, Move
from constants import AppConstants, RateLimitConfig
from enums import Castles, Colour, Outcome
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi_socketio import SocketManager
from log_formatting import custom_formatter
from models import Game, Timer

# logging config (override uvicorn default)
logger = logging.getLogger("uvicorn")
logger.handlers[0].setFormatter(custom_formatter)

# store ongoing games in memory
current_games = {}
# map of players to ongoing games
players_to_games = {}

# connection token bucket (rate limiting)
token_bucket = RateLimitConfig.INITIAL_TOKENS


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
    current_games.clear()
    players_to_games.clear()


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

# helper functions


def opponent_ind(turn: int):
    return int(not bool(turn))


async def get_game(sid, emiterr=True):
    "Get game record from memory using player ID"
    gid = players_to_games.get(sid, None)
    game = current_games.get(gid, None)
    if not game and emiterr:
        await emit_error(sid)
    return game, gid


async def clear_games(sid):
    """Clears a user's games from memory"""
    game, gid = await get_game(sid, emiterr=False)
    if not game:
        return
    for p in game.players:
        players_to_games.pop(p, None)
    if game.timer.task:
        game.timer.task.cancel()
    current_games.pop(gid, None)


async def emit_error(sid, message="Something went wrong"):
    """Emits an error event to a client"""
    await chess_api.sio.emit("error", message, to=sid)


async def player_flagged(gid, flagged):
    game = current_games.get(gid, None)
    await chess_api.sio.emit(
        "move",
        {
            "winner": opponent_ind(flagged),
            "outcome": Outcome.TIMEOUT.value,
        },
        room=gid,
    )
    game.timer.task.cancel()


async def countdown(gid):
    """Coroutine that counts down game timer and emits time events to clients in the game room"""
    game = current_games.get(gid, None)
    while True:
        turn = int(game.board.turn)
        colour = list(Colour)[turn].value[1]
        opponent_colour = list(Colour)[opponent_ind(turn)].value[1]
        await asyncio.sleep(0.1)
        if getattr(game.timer, colour) > 0:
            setattr(game.timer, colour, getattr(game.timer, colour) - 1)
        else:
            await player_flagged(gid, turn)  # flagged

        if getattr(game.timer, colour) % 10 == 0:
            # if multiple of 10 ds (1s), emit timer state
            await chess_api.sio.emit(
                "time",
                {colour: getattr(game.timer, colour), opponent_colour: getattr(game.timer, opponent_colour)},
                room=gid,
            )


# WebSocket event handlers


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
    clear_games(sid)
    logger.info(f"Client {sid} disconnected")


@chess_api.sio.on("create")
async def create(sid, time_control):
    gid = str(uuid.uuid4())
    chess_api.sio.enter_room(sid, gid)  # create a room for the game
    if len(current_games) > RateLimitConfig.CONCURRENT_GAME_LIMIT:
        await emit_error(sid, "Game limit exceeded. Please try again later")
        return
    current_games[gid] = Game(
        players=[sid],
        board=Board(),
        time_control=time_control,
        timer=Timer(
            white=time_control * AppConstants.DECISECONDS_PER_MINUTE,
            black=time_control * AppConstants.DECISECONDS_PER_MINUTE,
        ),
    )
    players_to_games[sid] = gid

    # send game id to client
    await chess_api.sio.emit("gameId", gid, room=gid)


@chess_api.sio.on("join")
async def join(sid, gid):
    game = current_games.get(gid, None)
    if not game:
        await emit_error(sid, "Game not found")
        return
    if len(game.players) > 1:
        await emit_error(sid, "This game already has two players")
        return
    chess_api.sio.enter_room(sid, gid)  # join room
    game.players.append(sid)
    players_to_games[sid] = gid

    random.shuffle(game.players)  # pick white and black

    # start timer
    game.timer.task = asyncio.create_task(countdown(gid))
    # start game
    await chess_api.sio.emit(
        "start", {"colour": Colour.WHITE.value[0], "timeControl": game.time_control}, to=game.players[0]
    )
    await chess_api.sio.emit(
        "start", {"colour": Colour.BLACK.value[0], "timeControl": game.time_control}, to=game.players[1]
    )


@chess_api.sio.on("move")
async def move(sid, uci):
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

    data = {
        "turn": int(board.turn),  # 1: white, 0: black
        "winner": int(outcome.winner) if outcome else None,
        "outcome": outcome.termination.value if outcome else None,
        "move": str(board.peek()),
        "castles": castles.value if castles else None,
        "enPassant": en_passant,
        "legalMoves": [str(m) for m in board.legal_moves],
        "moveStack": [str(m) for m in board.move_stack],
    }

    # send updated game state to clients in room
    await chess_api.sio.emit("move", data, room=gid)
    # stop timer if game finished
    if outcome:
        game.timer.task.cancel()


@chess_api.sio.on("offerDraw")
async def offer_draw(sid):
    game, _ = await get_game(sid)
    if not game:
        return
    await chess_api.sio.emit("drawOffer", to=next(p for p in game.players if p != sid))


@chess_api.sio.on("acceptDraw")
async def accept_draw(sid):
    game, gid = await get_game(sid)
    if not game:
        return

    await chess_api.sio.emit(
        "move",
        {
            "winner": None,
            "outcome": Outcome.AGREEMENT.value,
        },
        room=gid,
    )
    game.timer.task.cancel()


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
    game.timer.task.cancel()


@chess_api.sio.on("offerRematch")
async def offer_rematch(sid):
    game, _ = await get_game(sid)
    if game:
        await chess_api.sio.emit("rematchOffer", 1, to=next(p for p in game.players if p != sid))


@chess_api.sio.on("acceptRematch")
async def accept_rematch(sid):
    game, gid = await get_game(sid)
    if not game:
        return
    game.board.reset()
    game.players.reverse()  # switch white and black
    game.timer = Timer(
        white=game.time_control * AppConstants.DECISECONDS_PER_MINUTE,
        black=game.time_control * AppConstants.DECISECONDS_PER_MINUTE,
    )  # reset timer

    game.timer.task = asyncio.create_task(countdown(gid))
    await chess_api.sio.emit(
        "start", {"colour": Colour.WHITE.value[0], "timeControl": game.time_control}, to=game.players[0]
    )
    await chess_api.sio.emit(
        "start", {"colour": Colour.BLACK.value[0], "timeControl": game.time_control}, to=game.players[1]
    )


@chess_api.sio.on("exit")
async def exit(sid):
    """When a client exits the app, clear the game from memory"""
    clear_games(sid)
