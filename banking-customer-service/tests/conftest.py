import os


def pytest_configure(config) -> None:
    if os.getenv("TEST_DATABASE_URL"):
        os.environ["DATABASE_URL"] = os.environ["TEST_DATABASE_URL"]
