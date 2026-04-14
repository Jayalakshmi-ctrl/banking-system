from __future__ import annotations

from typing import Any

from pymongo import MongoClient
from pymongo.database import Database


def create_mongo_client(uri: str) -> MongoClient[Any]:
    return MongoClient(uri, serverSelectionTimeoutMS=5000)


def get_database(client: MongoClient[Any], name: str) -> Database[Any]:
    return client[name]


def ping_database(client: MongoClient[Any]) -> None:
    client.admin.command("ping")
