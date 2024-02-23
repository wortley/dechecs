from dataclasses import dataclass
from typing import Any, List

from chess import Board


@dataclass
class Game:
    players: List[str]  # [0] white, [1] black
    board: Board  # pychess board object
    tr_w: int  # time remaining for white
    tr_b: int  # time remaining for black
    turn_start_time: float  # timestamp when the turn started
    time_control: int  # time control (minutes)


@dataclass
class Event:
    name: str
    data: Any
