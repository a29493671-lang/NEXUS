
import os
import requests
from datetime import datetime, timezone

DEMO_APP_URL = os.getenv(
    "DEMO_APP_URL",
    "http://127.0.0.1:8000/health"
)


def check_application_health():
    """Check whether the demo application is healthy."""

    try:
        response = requests.get(
            DEMO_APP_URL,
            timeout=5
        )

        if response.status_code == 200:
            data = response.json()

            if data.get("status") == "healthy":
                return {
                    "status": "healthy",
                    "message": "Demo application is running",
                    "checked_at": datetime.now(
                        timezone.utc
                    ).isoformat()
                }

        return {
            "status": "unhealthy",
            "message": (
                f"Unexpected response: HTTP {response.status_code}"
            ),
            "checked_at": datetime.now(
                timezone.utc
            ).isoformat()
        }

    except requests.RequestException as error:
        return {
            "status": "unhealthy",
            "message": str(error),
            "checked_at": datetime.now(
                timezone.utc
            ).isoformat()
        }
