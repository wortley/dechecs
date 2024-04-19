import os

from dotenv import load_dotenv

load_dotenv()


class TimeConstants:
    DECISECONDS_PER_MINUTE = 600
    MILLISECONDS_PER_MINUTE = 60000


MAX_EMIT_RETRIES = 5
BROADCAST_KEY = "all"

REDIS_URL = os.environ.get("REDIS_URL")
ALCHEMY_API_KEY = os.environ.get("ALCHEMY_API_KEY")
CLOUDAMQP_URL = os.environ.get("CLOUDAMQP_URL")
