"""
WCHESS API

Run locally: uvicorn main:chess_api --reload
Swagger docs: http://localhost:8000/docs

Push to heroku: git subtree push --prefix api heroku master
Heroku logs: heroku logs --tail

"""

import asyncio
import random
import uuid

from chess import Board, Move
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi_socketio import SocketManager

from constants import AGREEMENT, DS_MINUTE, RESIGNATION, TIMEOUT
from models import Castles, Game, Timer

chess_api = FastAPI()

chess_api.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://wchess.netlify.app",
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

socket_manager = SocketManager(app=chess_api, mount_location="")

# store ongoing games in memory
current_games = {}
# map of players to ongoing games
players_to_games = {}


def clear_game(game_id):
    game = current_games.get(game_id, None)
    if game:
        for p in game.players:
            players_to_games.pop(p, None)
        if game.timer.task:
            game.timer.task.cancel()
        current_games.pop(game_id, None)


async def emit_error(sid, message="Something went wrong"):
    await chess_api.sio.emit("error", message, to=sid)


async def countdown(game_id):
    game = current_games.get(game_id, None)
    while True:
        turn = int(game.board.turn)
        await asyncio.sleep(0.1)
        if turn == 0:
            # black
            if game.timer.black > 0:
                game.timer.black -= 1
            else:
                # black flagged
                await chess_api.sio.emit(
                    "move",
                    {
                        "winner": 1,
                        "outcome": TIMEOUT,
                    },
                    room=game_id,
                )
                game.timer.task.cancel()
        else:
            # white
            if game.timer.white > 0:
                game.timer.white -= 1
            else:
                # white flagged
                await chess_api.sio.emit(
                    "move",
                    {
                        "winner": 0,
                        "outcome": TIMEOUT,
                    },
                    room=game_id,
                )
                game.timer.task.cancel()

        if (turn == 0 and game.timer.black % 10 == 0) or (
            turn == 1 and game.timer.white % 10 == 0
        ):
            # if multiple of 10 ds (1s), emit timer state
            await chess_api.sio.emit(
                "time",
                {"white": game.timer.white, "black": game.timer.black},
                room=game_id,
            )


@chess_api.sio.on("connect")
async def connect(sid, _):
    print(f"Client {sid} connected")


@chess_api.sio.on("disconnect")
async def disconnect(sid):
    clear_game(players_to_games.get(sid, None))
    print(f"Client {sid} disconnected")


@chess_api.sio.on("create")
async def create(sid, time_control):
    game_id = str(uuid.uuid4())
    chess_api.sio.enter_room(sid, game_id)  # create a room for the game
    current_games[game_id] = Game(
        players=[sid],
        board=Board(),
        time_control=time_control,
        timer=Timer(white=time_control * DS_MINUTE, black=time_control * DS_MINUTE),
    )
    players_to_games[sid] = game_id

    # debug
    print("create()")
    print(current_games)
    print(players_to_games)
    print("---------")
    # send game id to client
    await chess_api.sio.emit("gameId", game_id, room=game_id)


@chess_api.sio.on("join")
async def join(sid, game_id):
    # debug
    print("join()")
    print(current_games)
    print(players_to_games)
    print("---------")

    game = current_games.get(game_id, None)
    if not game:
        await emit_error(sid, "Game not found")
        return
    if len(game.players) > 1:
        await emit_error(sid, "This game already has two players")
        return
    chess_api.sio.enter_room(sid, game_id)  # join room
    game.players.append(sid)
    players_to_games[sid] = game_id

    random.shuffle(game.players)  # pick white and black

    # start timer
    game.timer.task = asyncio.create_task(countdown(game_id))
    # start game
    await chess_api.sio.emit(
        "start", {"colour": 1, "timeControl": game.time_control}, to=game.players[0]
    )
    await chess_api.sio.emit(
        "start", {"colour": 0, "timeControl": game.time_control}, to=game.players[1]
    )


@chess_api.sio.on("move")
async def move(sid, uci):
    game_id = players_to_games.get(sid, None)
    game = current_games.get(game_id, None)
    if game:
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
            await emit_error(sid, "Illegal move")
            return

        data = {
            "turn": int(board.turn),  # 1: white, 0: black
            "winner": int(outcome.winner) if outcome else None,
            "outcome": outcome.termination.value if outcome else None,
            "move": str(board.peek()),
            "castles": castles.value if castles else None,
            "enPassant": en_passant,
            "legalMoves": [str(m) for m in board.legal_moves],
            "moveStack": [str(m) for m in board.move_stack],
        }

        # send updated game state to clients in room
        await chess_api.sio.emit("move", data, room=game_id)
        # stop timer if game finished
        if outcome:
            game.timer.task.cancel()
    else:
        await emit_error(sid)


@chess_api.sio.on("offerDraw")
async def offer_draw(sid):
    game_id = players_to_games.get(sid, None)
    game = current_games.get(game_id, None)

    if game:
        await chess_api.sio.emit(
            "drawOffer", to=next(p for p in game.players if p != sid)
        )
    else:
        await emit_error(sid)


@chess_api.sio.on("acceptDraw")
async def accept_draw(sid):
    game_id = players_to_games.get(sid, None)
    game = current_games.get(game_id, None)

    if game:
        await chess_api.sio.emit(
            "move",
            {
                "winner": None,
                "outcome": AGREEMENT,
            },
            room=game_id,
        )
        game.timer.task.cancel()
    else:
        await emit_error(sid)


@chess_api.sio.on("resign")
async def resign(sid):
    game_id = players_to_games.get(sid, None)
    game = current_games.get(game_id, None)

    if game:
        await chess_api.sio.emit(
            "move",
            {
                "winner": game.players.index(sid),
                "outcome": RESIGNATION,
            },
            room=game_id,
        )
        game.timer.task.cancel()
    else:
        await emit_error(sid)


@chess_api.sio.on("offerRematch")
async def offer_rematch(sid):
    game_id = players_to_games.get(sid, None)
    game = current_games.get(game_id, None)
    if game:
        await chess_api.sio.emit(
            "rematchOffer", 1, to=next(p for p in game.players if p != sid)
        )
    else:
        await emit_error(sid)


@chess_api.sio.on("acceptRematch")
async def accept_rematch(sid):
    game_id = players_to_games.get(sid, None)
    game = current_games.get(game_id, None)
    if game:
        game.board.reset()
        game.players.reverse()  # switch white and black
        game.timer = Timer(
            white=game.time_control * DS_MINUTE, black=game.time_control * DS_MINUTE
        )  # reset timer

        game.timer.task = asyncio.create_task(countdown(game_id))
        await chess_api.sio.emit(
            "start", {"colour": 1, "timeControl": game.time_control}, to=game.players[0]
        )
        await chess_api.sio.emit(
            "start", {"colour": 0, "timeControl": game.time_control}, to=game.players[1]
        )
    else:
        await emit_error(sid)


@chess_api.sio.on("exit")
async def exit(sid):
    clear_game(players_to_games.get(sid, None))
