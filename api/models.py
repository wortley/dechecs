from dataclasses import dataclass
from typing import List

from chess import Board


@dataclass
class Game:
    players: List[str]  # [0] white, [1] black
    board: Board  # pychess board object
    start_end: (float, float)  # timestamp trackers for start and end time of each turn
    tr_w: int  # time remaining for white
    tr_b: int  # time remaining for black
