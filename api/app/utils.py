import json

from app.constants import BROADCAST_KEY
from app.models import Event, Game
from chess import Board
from pika.channel import Channel


def get_queue_name(gid: str, sid: str):
    return f"{gid}::{sid}"


def get_redis_key(gid: str):
    return f"game:{gid}"


def opponent_ind(turn: int):
    return int(not bool(turn))


def serialise_game_state(game: Game):
    """Serialise game state to JSON string for storage in Redis"""
    if not game:
        return
    game_dict = game.__dict__
    game_dict["board"] = game.board.fen()
    return json.dumps(game_dict)


def deserialise_game_state(game: str):
    """Deserialise game state from Redis JSON string"""
    if not game:
        return
    game_dict = json.loads(game)
    game_dict["board"] = Board(game_dict["board"])
    return Game(**game_dict)


def publish_event(channel: Channel, gid: str, event: Event, rk=BROADCAST_KEY):
    # TODO: better place to put this?
    channel.basic_publish(exchange=gid, routing_key=rk, body=json.dumps(event.__dict__))
