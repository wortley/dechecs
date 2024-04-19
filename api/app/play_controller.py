from dataclasses import dataclass
from time import time_ns
from typing import List, Optional

import app.utils as utils
from app.exceptions import CustomException
from app.models import Castles, Event, Outcome
from chess import Move


@dataclass
class MoveData:
    # NOTE: we break naming conventions here to avoid using hindering var name conversion
    turn: int
    winner: int
    outcome: int
    move: str
    castles: Optional[str]
    isCheck: bool
    enPassant: bool
    legalMoves: List[str]
    moveStack: List[str]
    timeRemainingWhite: int
    timeRemainingBlack: int


class PlayController:

    def __init__(self, rmq, sio, contract, gc):
        self.rmq = rmq
        self.sio = sio
        self.contract = contract
        self.gc = gc

    async def move(self, sid, uci):
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
            game.outcome = outcome.termination.value if outcome else None
        except AssertionError:
            # move not pseudo-legal
            raise CustomException("Ilegal move", sid)

        time_now = time_ns() / 1_000_000
        if utils.opponent_ind(game.board.turn) == 0:
            game.tr_b -= time_now - game.turn_start_time
        else:
            game.tr_w -= time_now - game.turn_start_time

        game.turn_start_time = time_now

        move_data = MoveData(
            turn=int(board.turn),
            winner=int(outcome.winner) if outcome else None,
            outcome=game.outcome,
            move=str(board.peek()),
            castles=castles.value if castles else None,
            isCheck=board.is_check(),
            enPassant=en_passant,
            legalMoves=[str(m) for m in board.legal_moves],
            moveStack=[str(m) for m in board.move_stack],
            timeRemainingWhite=game.tr_w,
            timeRemainingBlack=game.tr_b,
        )

        # send updated game state to clients in room
        utils.publish_event(self.rmq.channel, gid, Event("move", move_data.__dict__))

        await self.gc.save_game(gid, game, sid)

    async def offer_draw(self, sid):
        game, gid = await self.gc.get_game_by_sid(sid)
        utils.publish_event(self.rmq.channel, gid, Event("drawOffer", None), next(p for p in game.players if p != sid))

    async def accept_draw(self, sid):
        game, gid = await self.gc.get_game_by_sid(sid)
        game.outcome = Outcome.AGREEMENT.value
        utils.publish_event(self.rmq.channel, gid, Event("move", {"winner": None, "outcome": Outcome.AGREEMENT.value}))
        await self.gc.save_game(gid, game, sid)

    async def resign(self, sid):
        game, gid = await self.gc.get_game_by_sid(sid)
        game.outcome = Outcome.RESIGNATION.value
        # outcome event
        utils.publish_event(self.rmq.channel, gid, Event("move", {"winner": int(game.players.index(sid)), "outcome": Outcome.RESIGNATION.value}))
        # send payment instruction to loser
        await self.gc.save_game(gid, game, sid)

    async def flag(self, sid, flagged):
        game, gid = await self.gc.get_game_by_sid(sid)
        game.outcome = Outcome.TIMEOUT.value
        # outcome event
        utils.publish_event(self.rmq.channel, gid, Event("move", {"winner": utils.opponent_ind(flagged), "outcome": Outcome.TIMEOUT.value}))
        # send payment instruction to loser
        await self.gc.save_game(gid, game, sid)
