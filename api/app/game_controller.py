import asyncio
import json
import os
import random
import uuid
from logging import Logger
from time import time_ns

import aioredis
import app.utils as utils
from aioredis.client import Redis
from app.constants import BROADCAST_KEY, MAX_EMIT_RETRIES, TimeConstants
from app.exceptions import CustomException
from app.game_contract import GameContract
from app.game_registry import GameRegistry
from app.models import Colour, Event, Game, Outcome
from app.rate_limit import RateLimitConfig
from app.rmq import RMQConnectionManager
from chess import Board
from socketio.asyncio_server import AsyncServer


class GameController:

    def __init__(self, rmq: RMQConnectionManager, redis_client: Redis, sio: AsyncServer, gr: GameRegistry, contract: GameContract, logger: Logger):
        self.rmq = rmq
        self.redis_client = redis_client
        self.sio = sio
        self.gr = gr
        self.contract = contract
        self.logger = logger

    def _on_emit_done(self, task, event, sid, attempts):
        try:
            task.result()  #  raises exception if task failed
        except Exception as e:
            if attempts < MAX_EMIT_RETRIES:
                self.logger.error(f"Emit event failed with exception: {e}, retrying...")
                new_task = asyncio.create_task(self.sio.emit(event.name, event.data, to=sid))
                new_task.add_done_callback(lambda t, sid=sid: self._on_emit_done(t, event, sid, attempts + 1))
            else:
                self.logger.error(f"Emit event failed {MAX_EMIT_RETRIES} times, giving up")

    async def init_listener(self, gid, sid):
        self.logger.info("Initialising listener for game " + gid + ", user " + sid + ", on worker ID " + str(os.getpid()))

        def on_message(_, __, ___, body):
            message = json.loads(body)
            event = Event(**message)
            task = asyncio.create_task(self.sio.emit(event.name, event.data, to=sid))
            task.add_done_callback(lambda t, sid=sid: self._on_emit_done(t, event, sid, 1))

        self.gr.add_game_ctag(gid, self.rmq.channel.basic_consume(queue=utils.get_queue_name(gid, sid), on_message_callback=on_message, auto_ack=True))

    async def get_game_by_gid(self, gid, sid):
        """Get game state from redis by game ID"""
        try:
            game = utils.deserialise_game_state(await self.redis_client.get(utils.get_redis_key(gid)))
        except aioredis.RedisError as exc:
            raise CustomException(f"Redis error: {exc}", sid)
        if not game:
            raise CustomException("Game not found", sid)
        return game

    async def get_game_by_sid(self, sid):
        """Get game state from redis by player ID"""
        gid = self.gr.get_gid(sid)
        game = await self.get_game_by_gid(gid, sid)
        return game, gid

    async def save_game(self, gid, game, _=None):
        """Save game state in Redis"""
        try:
            await self.redis_client.set(utils.get_redis_key(gid), utils.serialise_game_state(game))
        except aioredis.RedisError as exc:
            raise CustomException(f"Redis error: {exc}", emit_local=False, gid=gid)

    async def create(self, sid, time_control, wager, wallet_addr, n_rounds):
        """
        Create a new game

        :param sid: player's socket ID
        :param time_control: time control in minutes
        :param wager: wager amount (MATIC)
        :param wallet_addr: player's wallet address
        :param n_rounds: number of rounds in the game
        """
        gid = str(uuid.uuid4())
        self.sio.enter_room(sid, gid)  # create a room for the game

        games_inpr = 0
        async for _ in self.redis_client.scan_iter("game:*"):  # count games in progress
            games_inpr += 1
        if games_inpr > RateLimitConfig.CONCURRENT_GAME_LIMIT:
            raise CustomException("Server concurrent game limit reached. Please try again later", sid)

        tr = time_control * TimeConstants.MILLISECONDS_PER_MINUTE
        game = Game(
            players=[sid],
            board=Board(),
            wager=wager,
            player_wallet_addrs={sid: wallet_addr},
            tr_w=tr,
            tr_b=tr,
            turn_start_time=-1,
            time_control=time_control,
            match_score={sid: 0},
            n_rounds=n_rounds,
            round=1,
        )

        self.gr.add_player_gid_record(sid, gid)
        await self.save_game(gid, game, sid)

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

    async def join(self, sid, gid):
        """
        Player request to join a game

        Returns game information (time control and wager amount)
          - gives user joining game a chance to review and accept wager amount before joining
          - this flow also allows for us to check other player has sufficient MATIC balance

        :param sid: player's socket ID
        :param gid: game ID
        """
        game = await self.get_game_by_gid(gid, sid)
        if len(game.players) > 1:
            raise CustomException("This game already has two players", sid)

        game_info = {
            "wagerAmount": game.wager,
            "timeControl": game.time_control,
            "totalRounds": game.n_rounds,
        }
        await self.sio.emit("gameInfo", game_info, to=sid)

    async def accept_game(self, sid, gid, wallet_addr):
        """
        Accept game
          - for when user has reviewed game info and is ready to start

        :param sid: player's socket ID
        :param gid: game ID
        :param wallet_addr: player's wallet address
        """
        game = await self.get_game_by_gid(gid, sid)

        self.sio.enter_room(sid, gid)  # join room
        game.players.append(sid)
        game.player_wallet_addrs[sid] = wallet_addr
        game.match_score[sid] = 0

        self.gr.add_player_gid_record(sid, gid)

        # randomly pick white and black
        random.shuffle(game.players)

        game.turn_start_time = time_ns() / 1_000_000  # reset turn start time

        await self.save_game(gid, game, sid)

        # create player 2 queue
        self.rmq.channel.queue_declare(queue=utils.get_queue_name(gid, sid))
        # bind the queue to the game exchange
        self.rmq.channel.queue_bind(exchange=gid, queue=utils.get_queue_name(gid, sid), routing_key=sid)
        self.rmq.channel.queue_bind(exchange=gid, queue=utils.get_queue_name(gid, sid), routing_key=BROADCAST_KEY)

        await self.init_listener(gid, sid)

        # start the game
        utils.publish_event(
            self.rmq.channel,
            gid,
            Event(
                "start",
                {"colour": Colour.BLACK.value[0], "timeRemaining": game.tr_b, "round": game.round, "totalRounds": game.n_rounds},
            ),
            game.players[0],
        )
        utils.publish_event(
            self.rmq.channel,
            gid,
            Event(
                "start",
                {"colour": Colour.WHITE.value[0], "timeRemaining": game.tr_w, "round": game.round, "totalRounds": game.n_rounds},
            ),
            game.players[1],
        )

    async def handle_end_of_round(self, gid: str, game: Game):
        overall_winner = None
        if game.round == game.n_rounds:
            # end of match
            if game.match_score[game.players[0]] > game.match_score[game.players[1]]:  # player who had black in last round wins overall
                overall_winner = 0
            elif game.match_score[game.players[0]] < game.match_score[game.players[1]]:  # player who had white in last round wins overall
                overall_winner = 1

            # publish matchEnded event
            utils.publish_event(self.rmq.channel, gid, Event("matchEnded", {"overallWinner": overall_winner}))
            # save game
            game.finished = True
            await self.save_game(gid, game)

            # declare result on SC
            if overall_winner:
                await self.contract.declare_winner(gid, game.player_wallet_addrs[game.players[overall_winner]])
            else:  # draw
                await self.contract.declare_draw(gid)
        else:
            # start next round
            await asyncio.sleep(20)  # wait 20 seconds before starting next round
            game = await self.get_game_by_gid(gid, game.players[0])  # refresh game in memory
            game.round += 1
            game.board.reset()  # reset board
            game.players.reverse()  # switch white and black
            game.tr_w = game.tr_b = TimeConstants.MILLISECONDS_PER_MINUTE * game.time_control
            game.turn_start_time = time_ns() / 1_000_000

            if not game.finished:  # if game has not been abandoned, send start event
                utils.publish_event(
                    self.rmq.channel,
                    gid,
                    Event(
                        "start",
                        {"colour": Colour.BLACK.value[0], "timeRemaining": game.tr_b, "round": game.round, "totalRounds": game.n_rounds},
                    ),
                    game.players[0],
                )
                utils.publish_event(
                    self.rmq.channel,
                    gid,
                    Event(
                        "start",
                        {"colour": Colour.WHITE.value[0], "timeRemaining": game.tr_w, "round": game.round, "totalRounds": game.n_rounds},
                    ),
                    game.players[1],
                )
            await self.save_game(gid, game)

    async def handle_exit(self, sid):
        if not self.gr.get_gid(sid):
            # if player already removed from game or game deleted, return
            return

        game, gid = await self.get_game_by_sid(sid)
        if len(game.players) > 1 and not game.finished:
            # if game not finished, the player automatically loses the game
            winner_ind = utils.opponent_ind(game.players.index(sid))
            utils.publish_event(self.rmq.channel, gid, Event("move", {"winner": winner_ind, "outcome": Outcome.ABANDONED.value, "matchScore": game.match_score}))
            utils.publish_event(self.rmq.channel, gid, Event("matchEnded", {"overallWinner": winner_ind}))
            game.finished = True
            await self.save_game(gid, game)
            await self.contract.declare_winner(gid, game.player_wallet_addrs[game.players[winner_ind]])

        await self.clear_game(sid, game, gid)

    async def clear_game(self, sid, game, gid):
        """Clears a user's game(s) from memory"""
        self.gr.remove_player_gid_record(sid)
        self.rmq.channel.queue_unbind(utils.get_queue_name(gid, sid), exchange=gid, routing_key=sid)
        self.rmq.channel.queue_unbind(utils.get_queue_name(gid, sid), exchange=gid, routing_key=BROADCAST_KEY)
        self.sio.leave_room(sid, gid)

        if len(game.players) > 1:  # remove player from game.players
            game.players.remove(sid)
            await self.save_game(gid, game, sid)
        else:  # last player to leave game
            await self.sio.close_room(gid)
            for ctag in self.gr.get_game_ctags(gid):
                self.rmq.channel.basic_cancel(consumer_tag=ctag)
            self.gr.remove_all_game_ctags(gid)
            self.rmq.channel.exchange_delete(exchange=gid)
            await self.redis_client.delete(utils.get_redis_key(gid))
