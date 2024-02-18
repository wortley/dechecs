from enum import Enum


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
