import asyncio
import json
import uuid

from chess import Board

import api.utils as utils
from api.constants import BROADCAST_KEY, TimeConstants
from api.models import Event, Game
from api.rate_limit import RateLimitConfig


class GameController:
    def __init__(self, rmq, redis_client, sio, gr, logger):
        self.rmq = rmq
        self.redis_client = redis_client
        self.sio = sio
        self.gr = gr
        self.logger = logger

    async def init_listener(self, gid, sid):
        self.logger.info("Initialising listener for game " + gid + ", user " + sid + ", on worker ID " + str(os.getpid()))

        def on_message(_, __, ___, body):
            message = json.loads(body)
            event = Event(**message)
            task = asyncio.create_task(chess_api.sio.emit(event.name, event.data, to=sid))
            task.add_done_callback(lambda t, sid=sid: on_emit_done(t, event, sid, 1))

        self.gr.add_game_ctag(gid, self.rmq.channel.basic_consume(queue=utils.get_queue_name(gid, sid), on_message_callback=on_message, auto_ack=True))

    async def create(self, sid, time_control):
        gid = str(uuid.uuid4())
        self.sio.enter_room(sid, gid)  # create a room for the game

        games_inpr = 0
        async for _ in self.redis_client.scan_iter("game:*"):  # count games in progress
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

        self.gr.add_player_gid_record(sid, gid)
        if await save_game(gid, game, sid) > 0:  # if error saving game state
            return

        # send game id to client
        await self.sio.emit("gameId", gid, to=sid)  # N.B no need to publish this to MQ

        # create fanout exchange for game
        self.rmq.channel.exchange_declare(exchange=gid, exchange_type="topic")

        # create player 1 queue
        self.rmq.channel.queue_declare(queue=utils.get_queue_name(gid, sid))
        # bind the queue to the game exchange
        self.rmq.channel.queue_bind(exchange=gid, queue=utils.get_queue_name(gid, sid), routing_key=sid)
        self.rmq.channel.queue_bind(exchange=gid, queue=utils.get_queue_name(gid, sid), routing_key=BROADCAST_KEY)

        # init listener
        await self.init_listener(gid, sid)
