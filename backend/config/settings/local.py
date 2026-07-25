import os

from .base import *

DEBUG = True

sqlite_default = "0" if os.getenv("POSTGRES_HOST") else "1"
if os.getenv("USE_SQLITE", sqlite_default) == "1":
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }
