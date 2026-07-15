#!/usr/bin/env python3
"""WebDAV server for J.NAS - started as subprocess."""
import os
import sys

# Same config as unified_nexus
ROOT_DIR = "/home/jerry/workspace"
NAS_PASSWORD = "JERRY_NEXUS_2026"
PORT = 8001

from wsgidav.wsgidav_app import WsgiDAVApp
from wsgidav.dc.simple_dc import SimpleDomainController
from wsgidav.fs_dav_provider import FilesystemProvider

config = {
    "host": "0.0.0.0",
    "port": PORT,
    "provider_mapping": {
        "/": FilesystemProvider(ROOT_DIR),
    },
    "http_authenticator": {
        "domain_controller": SimpleDomainController,
        "accept_basic": True,
        "accept_digest": False,
        "default_to_digest": False,
    },
    "simple_dc": {
        "user_mapping": {
            "*": {
                "jerry": {
                    "password": NAS_PASSWORD,
                    "description": "J.NAS WebDAV User",
                }
            }
        }
    },
    "property_manager": True,
    "lock_storage": True,
    "verbose": 0,
    "hotfixes": {
        "re_encode_path_info": False,
        "unquote_path_info": False,
    },
}

app = WsgiDAVApp(config)

if __name__ == '__main__':
    from cheroot import wsgi
    server = wsgi.Server(('0.0.0.0', PORT), app)
    print(f"WebDAV server running on port {PORT}")
    try:
        server.start()
    except KeyboardInterrupt:
        server.stop()
