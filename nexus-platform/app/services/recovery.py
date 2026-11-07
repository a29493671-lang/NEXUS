
import os
import subprocess
import sys
import time
from pathlib import Path

import requests


DEMO_APP_URL = os.getenv(
    "DEMO_APP_URL",
    "http://127.0.0.1:8000/health"
)

RECOVERY_MODE = os.getenv("RECOVERY_MODE", "local").lower()

DEMO_CONTAINER_NAME = os.getenv(
    "DEMO_CONTAINER_NAME",
    "nexus-demo"
)

STARTUP_TIMEOUT = 20

NEXUS_ROOT = Path(__file__).resolve().parents[3]
DEMO_APP_FOLDER = NEXUS_ROOT / "nexus-demo-app"


def is_demo_application_healthy():
    """Check whether the demo application responds successfully."""

    try:
        response = requests.get(DEMO_APP_URL, timeout=3)

        return (
            response.status_code == 200
            and response.json().get("status") == "healthy"
        )

    except (requests.RequestException, ValueError):
        return False


def recover_demo_application():
    """Recover the demo application in local or Docker mode."""

    if is_demo_application_healthy():
        return {
            "success": True,
            "message": "Demo application is already healthy.",
            "recovery_action": "not_required"
        }

    if RECOVERY_MODE == "docker":
        return recover_docker_container()

    return recover_local_application()


def recover_docker_container():
    """Restart the demo application Docker container."""

    try:
        import docker

        client = docker.from_env()

        container = client.containers.get(DEMO_CONTAINER_NAME)

        container.restart(timeout=10)

        for attempt in range(STARTUP_TIMEOUT):
            time.sleep(1)

            if is_demo_application_healthy():
                client.close()

                return {
                    "success": True,
                    "message": "Demo Docker container restarted and is healthy.",
                    "recovery_action": "container_restarted",
                    "startup_time_seconds": attempt + 1
                }

        client.close()

        return {
            "success": False,
            "message": (
                f"Docker container did not become healthy "
                f"within {STARTUP_TIMEOUT} seconds."
            ),
            "recovery_action": "failed"
        }

    except Exception as error:
        return {
            "success": False,
            "message": f"Docker recovery failed: {str(error)}",
            "recovery_action": "failed"
        }


def recover_local_application():
    """Start the demo application using the local Python environment."""

    app_file = DEMO_APP_FOLDER / "app.py"

    if not app_file.exists():
        return {
            "success": False,
            "message": f"Demo application file not found: {app_file}",
            "recovery_action": "failed"
        }

    try:
        log_file = DEMO_APP_FOLDER / "nexus-recovery.log"

        with open(log_file, "a", encoding="utf-8") as log:
            subprocess.Popen(
                [
                    sys.executable,
                    "-m",
                    "uvicorn",
                    "app:app",
                    "--host",
                    "127.0.0.1",
                    "--port",
                    "8000"
                ],
                cwd=str(DEMO_APP_FOLDER),
                stdout=log,
                stderr=subprocess.STDOUT,
                creationflags=getattr(
                    subprocess,
                    "CREATE_NEW_PROCESS_GROUP",
                    0
                )
            )

        for attempt in range(STARTUP_TIMEOUT):
            time.sleep(1)

            if is_demo_application_healthy():
                return {
                    "success": True,
                    "message": "Demo application restarted and is healthy.",
                    "recovery_action": "application_restarted",
                    "startup_time_seconds": attempt + 1
                }

        return {
            "success": False,
            "message": (
                f"Demo application did not become healthy "
                f"within {STARTUP_TIMEOUT} seconds. "
                f"Check the log file: {log_file}"
            ),
            "recovery_action": "failed"
        }

    except Exception as error:
        return {
            "success": False,
            "message": f"Local recovery failed: {str(error)}",
            "recovery_action": "failed"
        }
