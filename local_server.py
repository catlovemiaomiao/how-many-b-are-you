#!/usr/bin/env python3
"""Open the fully local quiz on an available loopback port."""

from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Timer
from functools import partial
import webbrowser

ROOT = Path(__file__).resolve().parent
handler = partial(SimpleHTTPRequestHandler, directory=str(ROOT))
server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
url = f"http://127.0.0.1:{server.server_port}/"
print(f"呆萌监考团已就位：{url}", flush=True)
print("关闭这个终端窗口即可结束本机网页。", flush=True)
Timer(0.4, lambda: webbrowser.open(url)).start()
try:
    server.serve_forever()
except KeyboardInterrupt:
    pass
finally:
    server.server_close()
