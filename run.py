"""
Local development runner.
Usage: python run.py

Note: This project lives in a non-ASCII directory path (Hebrew on Windows).
The dotenv path is resolved from __file__ which Python handles correctly
even when the console code page can't print the path.
"""
import os
import sys
import pathlib

# Force UTF-8 output (handles Hebrew paths in logging)
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if sys.stderr.encoding != 'utf-8':
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

# Load .env using __file__ — works correctly even in non-ASCII directories
_here = pathlib.Path(__file__).resolve().parent
_env_path = _here / ".env"

from dotenv import load_dotenv
loaded = load_dotenv(dotenv_path=_env_path, override=True)

import uvicorn

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    reload = os.environ.get("RELOAD", "false").lower() == "true"
    uvicorn.run(
        "app.api.main:app",
        host="0.0.0.0",
        port=port,
        reload=reload,
        log_level="info",
    )
