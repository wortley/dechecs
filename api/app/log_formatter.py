import logging


class CustomLogFormatter(logging.Formatter):
    def format(self, record):
        # if stack trace, add new line before it
        if record.exc_info:
            record.nl = "\n"
        else:
            record.nl = ""
            record.exc_info = ""
        return super().format(record)


custom_formatter = CustomLogFormatter(
    "%(asctime)s %(levelname)s - %(message)s%(nl)s%(exc_info)s"
)
