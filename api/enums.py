from enum import Enum


class Colour(Enum):
    WHITE = 1
    BLACK = 0


class Castles(Enum):
    KINGSIDE = "K"
    QUEENSIDE = "Q"


class Outcome(Enum):
    TIMEOUT = 11
    RESIGNATION = 12
    AGREEMENT = 13
