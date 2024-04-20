from dataclasses import dataclass
from time import time_ns
from typing import List, Optional, Tuple

import app.utils as utils
from app.exceptions import CustomException
from app.game_contract import GameContract
from app.game_controller import GameController
from app.models import Castles, Event, Outcome
from chess import Move


@dataclass
class MoveData:
    # NOTE: we break naming conventions here to avoid using hindering var name conversion
    turn: int
    winner: int
    outcome: int
    matchScore: Optional[Tuple[int, int]]  # TODO: move winner, outcome, matchScore to separate event
    move: str
    castles: Optional[str]
    isCheck: bool
    enPassant: bool
    legalMoves: List[str]
    moveStack: List[str]
    timeRemainingWhite: int
    timeRemainingBlack: int


class PlayController:

    def __init__(self, rmq, sio, contract: GameContract, gc: GameController):
        self.rmq = rmq
        self.sio = sio
        self.contract = contract
        self.gc = gc

    def _update_match_score(self, game, outcome, winner_sid):
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

        time_now = time_ns() / 1_000_000
        if utils.opponent_ind(game.board.turn) == 0:
            game.tr_b -= time_now - game.turn_start_time
        else:
            game.tr_w -= time_now - game.turn_start_time

        game.turn_start_time = time_now

        move_data = MoveData(
            turn=int(board.turn),
            winner=int(outcome.winner) if outcome else None,
            outcome=outcome.termination.value if outcome else None,
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
        outcome = Outcome.AGREEMENT.value
        # update match score
        game, match_score = self._update_match_score(game, outcome, None)
        utils.publish_event(self.rmq.channel, gid, Event("move", {"winner": None, "outcome": outcome, "matchScore": match_score}))
        await self.contract.declare_draw(gid)
        await self.gc.handle_end_of_round(gid, game)  # NOTE: this will save the updated match score to redis and start next round

    async def resign(self, sid):
        game, gid = await self.gc.get_game_by_sid(sid)
        winner_ind = utils.opponent_ind(game.players.index(sid))
        outcome = Outcome.RESIGNATION.value
        # update match score
        game, match_score = self._update_match_score(game, outcome, game.players[winner_ind])
        # outcome event
        utils.publish_event(self.rmq.channel, gid, Event("move", {"winner": winner_ind, "outcome": outcome, "matchScore": match_score}))
        # declare winner on SC
        await self.contract.declare_winner(gid, game.player_wallet_addrs[game.players[winner_ind]])
        # handle end of round (+ save match score)
        await self.gc.handle_end_of_round(gid, game)

    async def flag(self, sid, flagged):
        game, gid = await self.gc.get_game_by_sid(sid)
        winner_ind = utils.opponent_ind(flagged)
        outcome = Outcome.TIMEOUT.value
        # update match score
        game, match_score = self._update_match_score(game, outcome, game.players[winner_ind])
        # outcome event
        utils.publish_event(self.rmq.channel, gid, Event("move", {"winner": winner_ind, "outcome": outcome, "matchScore": match_score}))
        # declare winner on SC
        await self.contract.declare_winner(gid, game.player_wallet_addrs[game.players[winner_ind]])
        # save game
        await self.gc.handle_end_of_round(gid, game)
