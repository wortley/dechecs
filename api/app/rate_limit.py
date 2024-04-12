import asyncio


class RateLimitConfig:
    CONCURRENT_GAME_LIMIT = 100
    BUCKET_CAPACITY = 100
    INITIAL_TOKENS = 20
    REFILL_RATE_MINUTE = 4


class TokenBucketRateLimiter:
    def __init__(self):
        self.bucket = RateLimitConfig.INITIAL_TOKENS
        self.refiller = None

    async def refill_tokens(self):
        """
        Refills tokens in the token bucket every minute based on REFILL_RATE_MINUTE
        """
        while True:
            await asyncio.sleep(60)
            self.bucket = min(self.bucket + RateLimitConfig.REFILL_RATE_MINUTE, RateLimitConfig.BUCKET_CAPACITY)

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
