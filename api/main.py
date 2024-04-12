import logging
import os
from contextlib import asynccontextmanager

import aioredis
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi_socketio import SocketManager

import api.utils as utils
from api.game_controller import GameController
from api.game_registry import GameRegistry
from api.log_formatter import custom_formatter
from api.models import Event
from api.play_controller import PlayController
from api.rate_limit import TokenBucketRateLimiter
from api.rmq import RMQConnectionManager

load_dotenv("api/.env")

# logging config (override uvicorn default)
logger = logging.getLogger("uvicorn")
logger.handlers[0].setFormatter(custom_formatter)

# game registry
gr = GameRegistry()

# connection token bucket (rate limiting)
rate_limiter = TokenBucketRateLimiter()

# Redis client and MQ setup
redis_client = aioredis.Redis.from_url(os.environ.get("REDIS_URL"))

# RabbitMQ connection manager (pika)
rmq = RMQConnectionManager(os.environ.get("CLOUDAMQP_URL"), logger)


@asynccontextmanager
async def lifespan(_):
    """Handles startup/shutdown"""
    # Start token refiller
    rate_limiter.start_refiller()

    yield

    # Clean up before shutdown
    rate_limiter.stop_refiller()
    gr.clear()  # clear game registry
    if rmq.channel is not None and rmq.channel.is_open:  # close MQ
        rmq.channel.close()
    async for key in redis_client.scan_iter("game:*"):  # clear all games from redis cache
        await redis_client.delete(key)
    await redis_client.close()  # close redis connection


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

# Game controller

gc = GameController(rmq, redis_client, chess_api.sio, gr, logger)

# Play (in game events) controller

pc = PlayController(rmq, gc)

# Error emit functions (TODO: global error catcher, rethrow errors)


async def emit_error(gid, sid, message="Something went wrong"):
    """Emits an error event to game channel"""
    await utils.publish_event(rmq.channel, gid, Event("error", message), sid)


async def emit_error_local(sid, message="Something went wrong"):
    """Emits an error event to a client"""
    await chess_api.sio.emit("error", message, to=sid)


# Connect/disconnect handlers


@chess_api.sio.on("connect")
async def connect(sid, _):
    if rate_limiter.bucket > 0:
        logger.info(f"Client {sid} connected")
        rate_limiter.bucket -= 1
    else:
        await emit_error_local(sid, "Connection limit exceeded")
        logger.warning(f"Connection limit exceeded. Disconnecting {sid}")
        await chess_api.sio.disconnect(sid)


@chess_api.sio.on("disconnect")
async def disconnect(sid):
    await gc.clear_game(sid)
    logger.info(f"Client {sid} disconnected")


# Game management event handlers


@chess_api.sio.on("create")
async def create(sid, time_control):
    await gc.create(sid, time_control)


@chess_api.sio.on("join")
async def join(sid, gid):
    await gc.join(sid, gid)


# In-game event handlers


@chess_api.sio.on("move")
async def move(sid, uci):
    await pc.move(sid, uci)


@chess_api.sio.on("offerDraw")
async def offer_draw(sid):
    await pc.offer_draw(sid)


@chess_api.sio.on("acceptDraw")
async def accept_draw(sid):
    await pc.accept_draw(sid)


@chess_api.sio.on("resign")
async def resign(sid):
    await pc.resign(sid)


# NOTE: flag means run out of clock time


@chess_api.sio.on("flag")
async def flag(sid, flagged):
    await pc.flag(sid, flagged)


# Rematch (offer and accept)


@chess_api.sio.on("offerRematch")
async def offer_rematch(sid):
    await gc.offer_rematch(sid)


@chess_api.sio.on("acceptRematch")
async def accept_rematch(sid):
    await gc.accept_rematch(sid)


@chess_api.sio.on("exit")
async def exit(sid):
    """When a client exits the game/match, clear it from the cache"""
    await gc.clear_game(sid)
