# Code translated from https://wismuth.com/elo/calculator.html

import math
from pyerf import erf, erfinv

FIRST_MOVE_ADVANTAGE = 0.1
DRAW_ODDS_ADVANTAGE = 0.6

FIDE_STDDEV = 2000 / 7


def erfc(x):
    return 1 - erf(x)


def erfcinv(x):
    return erfinv(1 - x)


def elo_normal(elo_diff):
    return erfc(-elo_diff / (FIDE_STDDEV * math.sqrt(2))) / 2


def inv_elo_normal(p):
    return -(FIDE_STDDEV * math.sqrt(2)) * erfcinv(p * 2)


def elo_per_pawn_at_elo(elo):
    return math.exp(elo / 1020) * 26.59


def compute_prob_best_of(n, win_prob, draw_prob):
    # Allocate tables. Indexed by units of half-points.
    win_table = [[0] * (2 * n + 1) for _ in range(2 * n + 1)]
    draw_table = [[0] * (2 * n + 1) for _ in range(2 * n + 1)]

    # Boundary conditions.
    for i in range(2 * n + 1):
        j = 2 * n - i
        win_table[i][j] = 1 if i > j else 0
        draw_table[i][j] = 1 if i == j else 0

    # Fill rest using recurrence.
    lose_prob = 1 - win_prob - draw_prob
    for summation in range(n - 1, -1, -1):
        for i in range(2 * summation + 1):
            j = 2 * summation - i
            win_table[i][j] = win_prob * win_table[i + 2][j] + draw_prob * win_table[i + 1][j + 1] + lose_prob * win_table[i][j + 2]
            draw_table[i][j] = win_prob * draw_table[i + 2][j] + draw_prob * draw_table[i + 1][j + 1] + lose_prob * draw_table[i][j + 2]

    win = win_table[0][0]
    draw = draw_table[0][0]
    lose = 1 - win - draw

    # Prevent small negative results due to floating-point errors.
    win = 0 if abs(win) < 1e-10 else win
    lose = 0 if abs(lose) < 1e-10 else lose
    draw = 0 if abs(draw) < 1e-10 else draw

    return [f"{win:.9f}", f"{lose:.9f}", f"{draw:.9f}"]


def add_elo(diff, delta):
    if diff * delta >= 0:
        return diff + delta
    else:
        if diff > 0:
            return -inv_elo_normal(2 * elo_normal(-diff) - elo_normal(-diff + delta))
        else:
            return inv_elo_normal(2 * elo_normal(diff) - elo_normal(diff - delta))


def shifted_diffs(elo_1, elo_2, first_move):
    diff = elo_1 - elo_2
    ave = (elo_1 + elo_2) / 2
    elo_per_pawn = elo_per_pawn_at_elo(ave)
    c1 = elo_per_pawn * FIRST_MOVE_ADVANTAGE
    c2 = elo_per_pawn * DRAW_ODDS_ADVANTAGE
    if first_move:  # if player 1 (elo_1) moves first
        diff_W = add_elo(diff, c1 - c2)
        diff_WD = add_elo(diff, c1 + c2)
        return [diff_W, diff_WD]
    else:
        diff_W = add_elo(diff, -c1 - c2)
        diff_WD = add_elo(diff, -c1 + c2)
        return [diff_W, diff_WD]


def draw_prob(elo_1, elo_2, first_move=None):
    if first_move is None:
        return (draw_prob(elo_1, elo_2, True) + draw_prob(elo_1, elo_2, False)) / 2
    diffs = shifted_diffs(elo_1, elo_2, first_move)
    return elo_normal(diffs[1]) - elo_normal(diffs[0])


def best_of_n(n, elo_1, elo_2):
    elo_diff = elo_1 - elo_2
    e_score = elo_normal(elo_diff)
    draw_prob_ = draw_prob(elo_1, elo_2)
    win_prob = e_score - draw_prob_ / 2
    return compute_prob_best_of(n, win_prob, draw_prob_)


elo_1 = 1000
elo_2 = 800

for n in range(1, 6):
    print(best_of_n(n, elo_1, elo_2))
