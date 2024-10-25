import asyncio

from app.constants import BUCKET_CAPACITY


class TokenBucketRateLimiter:
    def __init__(self):
        self.bucket = 100
        self.refill_rate = 10  # per minute
        self.refiller = None

    async def refill_tokens(self):
        """
        Refills tokens in the token bucket every minute based on REFILL_RATE_MINUTE
        """
        while True:
            await asyncio.sleep(60)
            self.bucket = min(self.bucket + self.refill_rate, BUCKET_CAPACITY)

    def start_refiller(self):
        asyncio.create_task(self.refill_tokens())

    def stop_refiller(self):
        if self.refiller:
            self.refiller.cancel()

    def consume_token(self):
        if self.bucket > 0:
            self.bucket -= 1
            return True
        return False
