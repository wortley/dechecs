import app.utils as utils
from app.models import Event


class CustomException(Exception):
    """Allows for easy handling and routing of error messages to relevant users"""

    def __init__(self, message, sid=None, emit_local=True, gid=None):
        self.message = message
        self.emit_local = emit_local
        self.sid = sid
        self.gid = gid

    def __str__(self):
        return self.message


class SocketIOExceptionHandler:
    def __init__(self, sio, rmq, logger):
        self.sio = sio
        self.rmq = rmq
        self.logger = logger

    def sio_exception_handler(self, handler):
        """Produces a wrapper that goes around SIO event handlers"""

        async def wrapper(*args, **kwargs):
            try:
                return await handler(*args, **kwargs)
            except CustomException as exc:
                self.logger.error(f"Exception caught in {handler.__name__}: {exc}")
                if exc.emit_local:  # emit to single recipient on local SIO server
                    await self.sio.emit("error", exc.message, to=exc.sid)
                else:  # emit to every player in game
                    await utils.publish_event(self.rmq.channel, exc.gid, Event("error", exc.message))

        return wrapper
