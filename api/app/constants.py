import os

from dotenv import load_dotenv

load_dotenv()


MILLISECONDS_PER_MINUTE = 60_000


VALID_WAGER_RANGE = (1, 100)
VALID_TIME_CONTROLS = {3, 5, 10, 30}
VALID_N_ROUNDS_RANGE = (1, 10)


MAX_EMIT_RETRIES = 5
BROADCAST_KEY = "all"

REDIS_URL = os.environ.get("REDIS_URL")
ALCHEMY_API_URL = os.environ.get("ALCHEMY_API_URL")
CLOUDAMQP_URL = os.environ.get("CLOUDAMQP_URL")

SC_ADDRESS = os.environ.get("SC_ADDRESS")
WALLET_PK = os.environ.get("WALLET_PK")

CMC_API_KEY = os.environ.get("CMC_API_KEY")

CONCURRENT_GAME_LIMIT = os.environ.get("CONCURRENT_GAME_LIMIT")
BUCKET_CAPACITY = os.environ.get("BUCKET_CAPACITY")
