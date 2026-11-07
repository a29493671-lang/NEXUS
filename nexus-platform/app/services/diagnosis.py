
import os
import json
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv
from google import genai
from google.genai import types


# Load API key from backend .env
BASE_DIR = Path(__file__).resolve().parents[2]
load_dotenv(BASE_DIR / ".env")


def diagnose_with_rules(incident):
    """Fallback diagnosis when Gemini is unavailable."""

    title = str(getattr(incident, "title", "") or "").lower()
    description = str(getattr(incident, "description", "") or "").lower()
    message = title + " " + description

    diagnosis = {
        "diagnosis": "Unknown application issue",
        "root_cause": "The system could not identify a specific cause.",
        "severity": getattr(incident, "severity", "unknown"),
        "recommendation": "Inspect application logs and system resources.",
        "confidence": 40
    }

    if any(word in message for word in [
        "connection refused", "connection error", "database"
    ]):
        diagnosis.update({
            "diagnosis": "Database or connection failure",
            "root_cause": "The application may be unable to connect to its database.",
            "recommendation": "Check database availability, connection settings and network connectivity.",
            "confidence": 90
        })

    elif any(word in message for word in [
        "timeout", "slow response", "response time"
    ]):
        diagnosis.update({
            "diagnosis": "Application response timeout",
            "root_cause": "The application is taking too long to respond.",
            "recommendation": "Inspect server load, application logs and slow API requests.",
            "confidence": 85
        })

    elif any(word in message for word in [
        "500", "internal server error"
    ]):
        diagnosis.update({
            "diagnosis": "Internal server error",
            "root_cause": "The application encountered an internal processing error.",
            "recommendation": "Inspect backend logs and identify the failing function or service.",
            "confidence": 90
        })

    elif any(word in message for word in [
        "unavailable", "health check failed", "offline"
    ]):
        diagnosis.update({
            "diagnosis": "Application service unavailable",
            "root_cause": "The monitored application is not responding to health checks.",
            "recommendation": "Verify that the application is running, check its health endpoint and inspect server logs.",
            "confidence": 95
        })

    diagnosis["diagnosed_at"] = datetime.now().isoformat()
    diagnosis["diagnosis_engine"] = "Rule-based fallback"

    return diagnosis


def diagnose_incident(incident):
    """Diagnose an incident using Google Gemini."""

    api_key = os.getenv("GEMINI_API_KEY")

    if not api_key:
        result = diagnose_with_rules(incident)
        result["ai_status"] = "API key not configured"
        return result

    title = str(getattr(incident, "title", "") or "")
    description = str(getattr(incident, "description", "") or "")
    severity = str(getattr(incident, "severity", "unknown") or "unknown")

    prompt = f"""
You are the incident diagnosis engine of NEXUS,
an intelligent monitoring and self-healing platform.

Analyze this incident:

Title: {title}
Description: {description}
Reported severity: {severity}

Provide:
1. The likely technical problem.
2. The likely root cause based on available evidence.
3. Severity: low, medium, high, or critical.
4. A practical recommendation.
5. Confidence score between 0 and 100.

Rules:
- Do not invent logs, metrics or evidence.
- Clearly state uncertainty when evidence is insufficient.
- Do not claim that recovery has already happened.
- Recommend safe diagnostic actions.
"""

    try:
        client = genai.Client(api_key=api_key)

        response = client.models.generate_content(
            model="gemini-3.5-flash-lite",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=types.Schema(
                    type=types.Type.OBJECT,
                    properties={
                        "diagnosis": types.Schema(
                            type=types.Type.STRING
                        ),
                        "root_cause": types.Schema(
                            type=types.Type.STRING
                        ),
                        "severity": types.Schema(
                            type=types.Type.STRING
                        ),
                        "recommendation": types.Schema(
                            type=types.Type.STRING
                        ),
                        "confidence": types.Schema(
                            type=types.Type.INTEGER
                        )
                    },
                    required=[
                        "diagnosis",
                        "root_cause",
                        "severity",
                        "recommendation",
                        "confidence"
                    ]
                ),
                temperature=0.2,
                max_output_tokens=800
            )
        )

        if not response.text:
            raise ValueError("Gemini returned an empty response.")

        result = json.loads(response.text)

        required_fields = [
            "diagnosis",
            "root_cause",
            "severity",
            "recommendation",
            "confidence"
        ]

        for field in required_fields:
            if field not in result:
                raise ValueError(f"Missing Gemini response field: {field}")

        result["confidence"] = max(
            0, min(100, int(result["confidence"]))
        )

        result["diagnosed_at"] = datetime.now().isoformat()
        result["diagnosis_engine"] = "Google Gemini"
        result["ai_status"] = "success"

        return result

    except Exception as error:
        print(f"Gemini diagnosis error: {error}")

        result = diagnose_with_rules(incident)
        result["ai_status"] = "Gemini failed; rule-based fallback used"

        return result
