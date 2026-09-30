#!/bin/zsh
cd -- "${0:A:h}"
exec python3 local_server.py
