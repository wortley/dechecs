import time
from logging import Logger

import app.utils as utils
from app.exceptions import CustomException
from app.game_controller import GameController
from app.models import Castles, Colour, Event, MoveData, Outcome, TimerData
from app.rmq import RMQConnectionManager
from chess import Move
from socketio.asyncio_server import AsyncServer


class PlayController:

    TIMER_HALF_PRECISION = 100  # ms

    def __init__(self, rmq: RMQConnectionManager, sio: AsyncServer, gc: GameController, logger: Logger):
        self.rmq = rmq
        self.sio = sio
        self.gc = gc
        self.logger = logger

    def _update_match_score(self, game, outcome, winner_sid=None):
        if outcome == Outcome.AGREEMENT.value:
            for pid in game.players:
                game.match_score[pid] += 0.5
        else:
            game.match_score[winner_sid] += 1
        match_score = [0, 0]  # dumb match score [black, white]
        for idx, pid in enumerate(game.players):
            match_score[idx] = game.match_score[pid]
        return game, tuple(match_score)

    async def move(self, sid, uci):
        move_timestamp = time.time_ns() // 1_000_000

        game, gid = await self.gc.get_game_by_sid(sid)
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
            raise CustomException("Ilegal move", sid)

        match_score = None
        if outcome:
            winner_sid = None
            if outcome.winner is not None:
                winner_sid = game.players[int(outcome.winner)]
            game, match_score = self._update_match_score(game, outcome.termination.value, winner_sid)

        move_data = MoveData(
            turn=int(board.turn),
            winner=int(outcome.winner) if outcome else None,
            matchScore=match_score,
            outcome=outcome.termination.value if outcome else None,
            move=str(board.peek()),
            castles=castles.value if castles else None,
            isCheck=board.is_check(),
            enPassant=en_passant,
            legalMoves=[str(m) for m in board.legal_moves],
            moveStack=[str(m) for m in board.move_stack],
        )

        move_time = move_timestamp - game.last_turn_timestamp
        game.last_turn_timestamp = move_timestamp

        timer_data = None
        if move_data.turn == 0:  # last turn was white
            game.tr_white -= move_time
        else:  # last turn was black
            game.tr_black -= move_time

        timer_data = TimerData(white=game.tr_white, black=game.tr_black)

        # send updated game state to clients in room
        utils.publish_event(self.rmq.channel, gid, Event("move", move_data.__dict__))
        # send GT clock times
        utils.publish_event(self.rmq.channel, gid, Event("clockSync", timer_data.__dict__))

        if outcome:
            await self.gc.handle_end_of_round(gid, game)
        else:
            await self.gc.save_game(gid, game, sid)

    async def offer_draw(self, sid):
        game, gid = await self.gc.get_game_by_sid(sid)
        utils.publish_event(self.rmq.channel, gid, Event("drawOffer", None), next(p for p in game.players if p != sid))

    async def accept_draw(self, sid):
        game, gid = await self.gc.get_game_by_sid(sid)
        outcome = Outcome.AGREEMENT.value
        # update match score
        game, match_score = self._update_match_score(game, outcome, None)
        utils.publish_event(self.rmq.channel, gid, Event("move", {"winner": None, "outcome": outcome, "matchScore": match_score}))
        await self.gc.handle_end_of_round(gid, game)  # NOTE: this will save the updated match score to redis and start next round

    async def resign(self, sid):
        game, gid = await self.gc.get_game_by_sid(sid)
        winner_ind = utils.opponent_ind(game.players.index(sid))
        outcome = Outcome.RESIGNATION.value
        # update match score
        game, match_score = self._update_match_score(game, outcome, game.players[winner_ind])
        # outcome event
        utils.publish_event(self.rmq.channel, gid, Event("move", {"winner": winner_ind, "outcome": outcome, "matchScore": match_score}))
        # handle end of round (+ save match score)
        await self.gc.handle_end_of_round(gid, game)

    async def flag(self, sid, flagged):
        flag_received = time.time_ns() // 1_000_000
        game, gid = await self.gc.get_game_by_sid(sid)

        # validate flag request
        if int(game.board.turn) != flagged:
            self.logger.warning(f"Flag request in game {gid} from client {sid} dismissed as flagged colour does not match turn")
            return
        tr = game.tr_white if flagged == Colour.WHITE.value[0] else game.tr_black
        move_time = flag_received - game.last_turn_timestamp
        if move_time < tr - self.TIMER_HALF_PRECISION:
            self.logger.warning(f"Flag request in game {gid} from client {sid} dismissed as player still has time remaining")
            return 

        # set winner and outcome
        winner_ind = utils.opponent_ind(flagged)
        outcome = Outcome.TIMEOUT.value
        # update match score
        game, match_score = self._update_match_score(game, outcome, game.players[winner_ind])
        # outcome event
        utils.publish_event(self.rmq.channel, gid, Event("move", {"winner": winner_ind, "outcome": outcome, "matchScore": match_score}))
        # save game
        await self.gc.handle_end_of_round(gid, game)
