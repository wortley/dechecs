import os

from dotenv import load_dotenv

load_dotenv()


class TimeConstants:
    DECISECONDS_PER_MINUTE = 600
    MILLISECONDS_PER_MINUTE = 60000


MAX_EMIT_RETRIES = 5
BROADCAST_KEY = "all"

REDIS_URL = os.environ.get("REDIS_URL")
ALCHEMY_API_URL = os.environ.get("ALCHEMY_API_URL")
CLOUDAMQP_URL = os.environ.get("CLOUDAMQP_URL")
SC_ADDRESS = os.environ.get("SC_ADDRESS")
WALLET_PK = os.environ.get("WALLET_PK")
CMC_API_KEY = os.environ.get("CMC_API_KEY")
