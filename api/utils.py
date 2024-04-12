def get_queue_name(gid, sid):
    return f"{gid}::{sid}"


def get_redis_key(gid):
    return f"game:{gid}"


def opponent_ind(turn: int):
    # TODO: benchmark this - probs slower than using dict
    return int(not bool(turn))
