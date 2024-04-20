from dataclasses import dataclass
from enum import Enum
from typing import Dict, List, Optional

from chess import Board


class Colour(Enum):
    BLACK = (0, "black")
    WHITE = (1, "white")


class Castles(Enum):
    KINGSIDE = "K"
    QUEENSIDE = "Q"


class Outcome(Enum):
    TIMEOUT = 11
    RESIGNATION = 12
    AGREEMENT = 13
    ABANDONED = 14


@dataclass
class Game:
    players: List[str]  # [0] white, [1] black
    board: Board | str  # pychess board object or string when serialised
    tr_w: int  # time remaining for white
    tr_b: int  # time remaining for black
    turn_start_time: float  # timestamp when the turn started
    time_control: int  # time control (minutes)
    wager: float  # wager amount
    player_wallet_addrs: Dict[str, str]  # maps sids to wallet addresses
    finished: bool = False  # whether the game has finished
    match_score: Dict[str, int]  # keeps track of how many rounds each player has won
    round: int  # current round
    n_rounds: int  # number of rounds


@dataclass
class Event:
    name: str
    data: int | str | dict
