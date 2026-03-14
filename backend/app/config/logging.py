import logging
import re


class SensitiveFilter(logging.Filter):
    SENSITIVE_KEYS = [
        r"sk-[a-zA-Z0-9]{32,}",
        r"AIza[a-zA-Z0-9_-]{35}",
        r"Bearer\s+[a-zA-Z0-9\._-]+",
        r"[\w\.-]+@[\w\.-]+\.\w+",
    ]

    def filter(self, record):
        msg = str(record.msg)
        for pattern in self.SENSITIVE_KEYS:
            msg = re.sub(pattern, "******", msg)
        record.msg = msg
        return True


def setup_logging():
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )

    logger = logging.getLogger()

    sensitive_filter = SensitiveFilter()
    for handler in logger.handlers:
        handler.addFilter(sensitive_filter)

    for logger_name in ["uvicorn", "uvicorn.access", "fastapi"]:
        l = logging.getLogger(logger_name)
        l.addFilter(sensitive_filter)

    print("[SYSTEM] Logging initialized with desensitization filters.")
