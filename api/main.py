# TODO: Split up, make modular

import asyncio
import json
import logging
import os
import random
import uuid
from collections import defaultdict
from contextlib import asynccontextmanager
from time import time_ns

import aioredis
from chess import Board, Move
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi_socketio import SocketManager

from api.constants import BROADCAST_KEY, MAX_EMIT_RETRIES, RateLimitConfig, TimeConstants
from api.log_formatter import custom_formatter
from api.models import Castles, Colour, Event, Game, Outcome
from api.rmq import RMQConnectionManager

load_dotenv()

# logging config (override uvicorn default)
logger = logging.getLogger("uvicorn")
logger.handlers[0].setFormatter(custom_formatter)

# map of players to ongoing games
players_to_games = dict()

# map of game ids to consumer tags
gids_to_ctags = defaultdict(list)

# connection token bucket (rate limiting)
token_bucket = RateLimitConfig.INITIAL_TOKENS

# Redis client and MQ setup
redis_client = aioredis.Redis.from_url(os.environ.get("REDIS_URL"))

# RabbitMQ setup

rmq = RMQConnectionManager(os.environ.get("CLOUDAMQP_URL"), logger)

# Token refill function (rate limiting)


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
    # Start token refiller
    refiller = asyncio.create_task(refill_tokens())

    yield

    # Clean up before shutdown
    refiller.cancel()
    players_to_games.clear()
    gids_to_ctags.clear()
    # close MQ
    if rmq.channel is not None and rmq.channel.is_open:
        rmq.channel.close()
    # clear all games from redis cache
    async for key in redis_client.scan_iter("game:*"):
        await redis_client.delete(key)
    await redis_client.close()


chess_api = FastAPI(lifespan=lifespan)

chess_api.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://unichess.netlify.app",
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

socket_manager = SocketManager(app=chess_api)

# Helper functions


def get_queue_name(gid, sid):
    return f"{gid}::{sid}"


def get_redis_key(gid):
    return f"game:{gid}"


def on_emit_done(task, event, sid, attempts):
    try:
        task.result()  #  raises exception if task failed
    except Exception as e:
        if attempts < MAX_EMIT_RETRIES:
            logger.error(f"Emit event failed with exception: {e}, retrying...")
            new_task = asyncio.create_task(chess_api.sio.emit(event.name, event.data, to=sid))
            new_task.add_done_callback(lambda t, sid=sid: on_emit_done(t, event, sid, attempts + 1))
        else:
            logger.error(f"Emit event failed {MAX_EMIT_RETRIES} times, giving up")


async def init_listener(gid, sid):
    logger.info("Initialising listener for game " + gid + ", user " + sid + ", on process ID " + str(os.getpid()))

    def on_message(_, __, ___, body):
        message = json.loads(body)
        event = Event(**message)
        task = asyncio.create_task(chess_api.sio.emit(event.name, event.data, to=sid))
        task.add_done_callback(lambda t, sid=sid: on_emit_done(t, event, sid, 1))

    gids_to_ctags[gid].append(rmq.channel.basic_consume(queue=get_queue_name(gid, sid), on_message_callback=on_message, auto_ack=True))


def opponent_ind(turn: int):
    return int(not bool(turn))


async def get_game(sid, emiterr=True):
    """Get game state from redis with player ID"""
    gid = players_to_games.get(sid, None)
    try:
        game = deserialise_game_state(await redis_client.get(get_redis_key(gid)))
    except aioredis.RedisError as e:
        logger.error(e)
        if emiterr:
            await emit_error_local(sid)
        return
    if not game and emiterr:
        await emit_error_local(gid, sid)
        logger.error(f"Game not found for player {sid}")
    return game, gid


async def get_game_by_gid(gid, sid):
    """Get game state from redis with game ID"""
    try:
        game = deserialise_game_state(await redis_client.get(get_redis_key(gid)))
    except aioredis.RedisError as e:
        logger.error(e)
        return
    if not game:
        await emit_error_local(sid)
        return
    return game


async def save_game(gid, game, sid):
    """Set game state in Redis"""
    try:
        await redis_client.set(get_redis_key(gid), serialise_game_state(game))
        return 0
    except aioredis.RedisError as e:
        await emit_error(gid, sid, "An error occurred while saving game state")
        logger.error(e)
        return 1


async def clear_game(sid):
    """Clears a user's game(s) from memory"""
    game, gid = await get_game(sid, emiterr=False)
    if not game:
        return
    for pid in game.players:
        players_to_games.pop(pid, None)
        rmq.channel.queue_unbind(get_queue_name(gid, pid), exchange=gid, routing_key=pid)
        rmq.channel.queue_unbind(get_queue_name(gid, pid), exchange=gid, routing_key=BROADCAST_KEY)
    for ctag in gids_to_ctags[gid]:
        rmq.channel.basic_cancel(consumer_tag=ctag)
    gids_to_ctags.pop(gid, None)
    rmq.channel.exchange_delete(exchange=gid)
    await redis_client.delete(get_redis_key(gid))


async def emit_error(gid, sid, message="Something went wrong"):
    """Emits an error event to game channel"""
    await publish_event(gid, Event("error", message), sid)


async def emit_error_local(sid, message="Something went wrong"):
    """Emits an error event to a client"""
    await chess_api.sio.emit("error", message, to=sid)


def serialise_game_state(game):
    """Serialise game state to JSON string for storage in Redis"""
    if not game:
        return
    game.board = game.board.fen()
    game_dict = game.__dict__
    return json.dumps(game_dict)


def deserialise_game_state(game):
    """Deserialise game state from Redis JSON string"""
    if not game:
        return
    game_dict = json.loads(game)
    game_dict["board"] = Board(game_dict["board"])
    return Game(**game_dict)


async def publish_event(gid, event: Event, rk=BROADCAST_KEY):
    rmq.channel.basic_publish(exchange=gid, routing_key=rk, body=json.dumps(event.__dict__))


# WebSocket event handlers

# Connect/disconnect


@chess_api.sio.on("connect")
async def connect(sid, _):
    global token_bucket
    if token_bucket > 0:
        logger.info(f"Client {sid} connected")
        token_bucket -= 1
    else:
        await emit_error_local(sid, "Connection limit exceeded")
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

    games_inpr = 0
    async for _ in redis_client.scan_iter("game:*"):  # count games in progress
        games_inpr += 1
    if games_inpr > RateLimitConfig.CONCURRENT_GAME_LIMIT:
        await emit_error_local(sid, "Game limit exceeded. Please try again later")
        return

    game = Game(
        players=[sid],
        board=Board(),
        tr_w=time_control * TimeConstants.MILLISECONDS_PER_MINUTE,
        tr_b=time_control * TimeConstants.MILLISECONDS_PER_MINUTE,
        turn_start_time=-1,
        time_control=time_control,
    )

    players_to_games[sid] = gid
    if await save_game(gid, game, sid) > 0:  # if error saving game state
        return

    # send game id to client
    await chess_api.sio.emit("gameId", gid, to=sid)  # N.B no need to publish this to MQ

    # create fanout exchange for game
    rmq.channel.exchange_declare(exchange=gid, exchange_type="topic")

    # create player 1 queue
    rmq.channel.queue_declare(queue=get_queue_name(gid, sid))
    # bind the queue to the game exchange
    rmq.channel.queue_bind(exchange=gid, queue=get_queue_name(gid, sid), routing_key=sid)
    rmq.channel.queue_bind(exchange=gid, queue=get_queue_name(gid, sid), routing_key=BROADCAST_KEY)

    # init listener
    await init_listener(gid, sid)


@chess_api.sio.on("join")
async def join(sid, gid):
    game = await get_game_by_gid(gid, sid)
    if not game:
        await emit_error_local(sid, "Game not found")
        return
    elif len(game.players) > 1:
        await emit_error_local(sid, "This game already has two players")
        return
    chess_api.sio.enter_room(sid, gid)  # join room
    game.players.append(sid)
    players_to_games[sid] = gid

    random.shuffle(game.players)  # randomly pick white and black

    game.turn_start_time = time_ns() / 1_000_000

    await save_game(gid, game, sid)

    # create player 2 queue
    rmq.channel.queue_declare(queue=get_queue_name(gid, sid))
    # bind the queue to the game exchange
    rmq.channel.queue_bind(exchange=gid, queue=get_queue_name(gid, sid), routing_key=sid)
    rmq.channel.queue_bind(exchange=gid, queue=get_queue_name(gid, sid), routing_key=BROADCAST_KEY)

    await init_listener(gid, sid)

    await publish_event(
        gid,
        Event(
            "start",
            {"colour": Colour.WHITE.value[0], "timeRemaining": game.tr_w},
        ),
        game.players[0],
    )
    await publish_event(
        gid,
        Event(
            "start",
            {"colour": Colour.BLACK.value[0], "timeRemaining": game.tr_b},
        ),
        game.players[1],
    )


# Move


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
        await emit_error_local(sid, "Illegal move")
        return

    time_now = time_ns() / 1_000_000
    if opponent_ind(game.board.turn) == 0:
        game.tr_b -= time_now - game.turn_start_time
    else:
        game.tr_w -= time_now - game.turn_start_time

    game.turn_start_time = time_now

    data = {
        "turn": int(board.turn),  # 1: white, 0: black
        "winner": int(outcome.winner) if outcome else None,
        "outcome": outcome.termination.value if outcome else None,
        "move": str(board.peek()),
        "castles": castles.value if castles else None,
        "isCheck": board.is_check(),
        "enPassant": en_passant,
        "legalMoves": [str(m) for m in board.legal_moves],
        "moveStack": [str(m) for m in board.move_stack],
        "timeRemainingWhite": game.tr_w,
        "timeRemainingBlack": game.tr_b,
    }

    # send updated game state to clients in room
    await publish_event(gid, Event("move", data))

    await save_game(gid, game, sid)


# Draws


@chess_api.sio.on("offerDraw")
async def offer_draw(sid):
    game, gid = await get_game(sid)
    if not game:
        return
    await publish_event(gid, Event("drawOffer", None), next(p for p in game.players if p != sid))


@chess_api.sio.on("acceptDraw")
async def accept_draw(sid):
    game, gid = await get_game(sid)
    if not game:
        return

    await publish_event(gid, Event("move", {"winner": None, "outcome": Outcome.AGREEMENT.value}))


# Resign


@chess_api.sio.on("resign")
async def resign(sid):
    game, gid = await get_game(sid)
    if not game:
        return
    await publish_event(gid, Event("move", {"winner": int(game.players.index(sid)), "outcome": Outcome.RESIGNATION.value}))


# Flag


@chess_api.sio.on("flag")
async def flag(sid, flagged):
    game, gid = await get_game(sid)
    if not game:
        return
    await publish_event(gid, Event("move", {"winner": opponent_ind(flagged), "outcome": Outcome.TIMEOUT.value}))


# Rematch (offer and accept)


@chess_api.sio.on("offerRematch")
async def offer_rematch(sid):
    game, gid = await get_game(sid)
    if game:
        await publish_event(gid, Event("rematchOffer", 1), next(p for p in game.players if p != sid))


@chess_api.sio.on("acceptRematch")
async def accept_rematch(sid):
    game, gid = await get_game(sid)
    if not game:
        return
    game.board.reset()
    game.players.reverse()  # switch white and black
    game.tr_w = TimeConstants.MILLISECONDS_PER_MINUTE * game.time_control
    game.tr_b = TimeConstants.MILLISECONDS_PER_MINUTE * game.time_control
    game.turn_start_time = time_ns() / 1_000_000

    await save_game(gid, game, sid)

    await publish_event(
        gid,
        Event(
            "start",
            {"colour": Colour.WHITE.value[0], "timeRemaining": game.tr_w},
        ),
        game.players[0],
    )

    await publish_event(
        gid,
        Event(
            "start",
            {"colour": Colour.BLACK.value[0], "timeRemaining": game.tr_b},
        ),
        game.players[1],
    )


@chess_api.sio.on("exit")
async def exit(sid):
    """When a client exits the game, clear it from memory"""
    await clear_game(sid)
