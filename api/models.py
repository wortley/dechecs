from asyncio import Task
from dataclasses import dataclass
from enum import Enum
from typing import List, Optional

from chess import Board


@dataclass
class Timer:
    white: int
    black: int
    task: Optional[Task] = None


@dataclass
class Game:
    created_by: str
    players: List[str]  # [0] white, [1] black
    board: Board
    time_control: int
    timer: Timer


class Castles(Enum):
    KINGSIDE = "K"
    QUEENSIDE = "Q"
