from logging import Logger

from pika import URLParameters
from pika.adapters.asyncio_connection import AsyncioConnection

# TODO: just use aio-pika - much better than callback hell


class RMQConnectionManager:
    def __init__(self, url: str, logger: Logger):
        self.channel = None
        self.logger = logger
        self.rmq_params = URLParameters(url)
        self.rmq_conn = AsyncioConnection(
            self.rmq_params,
            on_open_callback=lambda conn: self.setup_rmq(conn, self.set_channel),
            on_open_error_callback=lambda _, err: self.on_connection_open_error(
                err,
            ),
            on_close_callback=lambda _, reason: self.on_connection_closed(reason),
        )

    def set_channel(self, ch):
        self.channel = ch

    def setup_rmq(self, conn, set_channel):
        conn.channel(on_open_callback=lambda ch: self.on_channel_open(ch, conn, set_channel))

    def on_connection_open_error(self, err):
        self.logger.error("Connection open failed: %s", err)

    def on_connection_closed(self, reason):
        self.logger.warning("Connection closed: %s", reason)

    def on_channel_closed(self, conn):
        conn.close()

    def on_channel_open(self, ch, conn, set_channel):
        self.logger.info("Channel opened")
        set_channel(ch)
        ch.add_on_close_callback(lambda _, __: self.on_channel_closed(conn))
