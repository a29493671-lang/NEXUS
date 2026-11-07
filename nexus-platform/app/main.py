
import asyncio
import time
from contextlib import asynccontextmanager, suppress
from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine, Base, SessionLocal
from app import models
from app.models import Incident, RecoveryLog
from app.routers import incidents
from app.services.monitor import check_application_health
from app.services.diagnosis import diagnose_incident
from app.services.recovery import recover_demo_application


# --------------------------------------------------
# DATABASE INITIALIZATION
# --------------------------------------------------

Base.metadata.create_all(bind=engine)


# --------------------------------------------------
# MONITORING CONFIGURATION
# --------------------------------------------------

MONITORING_INTERVAL = 10

processed_incidents = set()


# --------------------------------------------------
# AUTONOMOUS INCIDENT HANDLING
# --------------------------------------------------

async def handle_incident(incident_id: int):
    """
    Automatically diagnoses, recovers, verifies,
    and records the recovery history of an incident.
    """

    db = None

    try:
        db = SessionLocal()

        incident = db.query(Incident).filter(
            Incident.id == incident_id
        ).first()

        if incident is None:
            print(f"Incident {incident_id} not found.")
            return

        if incident.status != "open":
            print(f"Incident {incident_id} is not open.")
            return

        print(f"\nNEXUS: Processing incident {incident_id}.")

        # STEP 1: AI DIAGNOSIS

        print("NEXUS AI: Starting Gemini diagnosis...")

        diagnosis_report = await asyncio.to_thread(
            diagnose_incident,
            incident
        )

        print("NEXUS AI: Diagnosis completed.")

        print(
            "Diagnosis:",
            diagnosis_report.get("diagnosis", "Not available")
        )

        print(
            "Root cause:",
            diagnosis_report.get("root_cause", "Not available")
        )

        print(
            "Recommendation:",
            diagnosis_report.get("recommendation", "Not available")
        )

        print(
            "Diagnosis engine:",
            diagnosis_report.get("diagnosis_engine", "Unknown")
        )

        # STEP 2: AUTONOMOUS RECOVERY

        print(
            f"NEXUS RECOVERY: Recovering incident {incident_id}..."
        )

        recovery_start = time.perf_counter()

        recovery_report = await asyncio.to_thread(
            recover_demo_application
        )

        measured_duration = time.perf_counter() - recovery_start

        print("Recovery result:", recovery_report)

        # STEP 3: VERIFY APPLICATION HEALTH

        health = await asyncio.to_thread(
            check_application_health
        )

        final_health = health.get("status", "unknown")

        recovery_success = (
            recovery_report.get("success", False)
            and final_health == "healthy"
        )

        if recovery_success:

            incident.status = "resolved"

            print(
                f"NEXUS SUCCESS: Incident {incident_id} resolved."
            )

        else:

            print(
                f"NEXUS ALERT: Incident {incident_id} "
                "could not be fully recovered."
            )

        # STEP 4: PREPARE RECOVERY HISTORY

        recovery_duration = recovery_report.get(
            "startup_time_seconds",
            measured_duration
        )

        recovery_log = RecoveryLog(
            incident_id=incident.id,

            diagnosis=str(
                diagnosis_report.get(
                    "diagnosis",
                    "Not available"
                )
            ),

            root_cause=str(
                diagnosis_report.get(
                    "root_cause",
                    "Not available"
                )
            ),

            diagnosis_engine=str(
                diagnosis_report.get(
                    "diagnosis_engine",
                    "Unknown"
                )
            ),

            recovery_action=str(
                recovery_report.get(
                    "recovery_action",
                    "unknown"
                )
            ),

            recovery_status=(
                "success" if recovery_success else "failed"
            ),

            recovery_message=str(
                recovery_report.get(
                    "message",
                    "No recovery message"
                )
            ),

            duration_seconds=float(recovery_duration),

            final_health=final_health
        )

        # STEP 5: SAVE TO DATABASE

        db.add(recovery_log)
        db.commit()

        print(
            f"NEXUS HISTORY: Recovery log saved "
            f"for incident {incident_id}."
        )

    except Exception as error:

        if db is not None:
            db.rollback()

        print(
            f"NEXUS INCIDENT HANDLING ERROR "
            f"(Incident {incident_id}): {error}"
        )

    finally:

        if db is not None:
            db.close()


# --------------------------------------------------
# CONTINUOUS MONITORING SERVICE
# --------------------------------------------------

async def continuous_monitoring():
    """
    Checks application health every 10 seconds.
    Creates incidents automatically and triggers
    AI diagnosis and recovery for new incidents.
    """

    print("NEXUS continuous monitoring started.")

    print(
        f"Monitoring interval: {MONITORING_INTERVAL} seconds."
    )

    print("Autonomous diagnosis: enabled.")
    print("Autonomous recovery: enabled.")

    while True:

        db = None

        try:

            # STEP 1: CHECK APPLICATION HEALTH

            health = await asyncio.to_thread(
                check_application_health
            )

            db = SessionLocal()

            if health.get("status") == "unhealthy":

                print(
                    "\nNEXUS ALERT: Application failure detected."
                )

                print("Reason:", health.get("message"))

                # STEP 2: FIND OR CREATE OPEN INCIDENT

                existing_incident = db.query(Incident).filter(
                    Incident.title
                    == "Demo Application Health Check Failed",
                    Incident.status == "open"
                ).first()

                if existing_incident is None:

                    new_incident = Incident(
                        title="Demo Application Health Check Failed",
                        description=health.get(
                            "message",
                            "Application health check failed."
                        ),
                        severity="high",
                        status="open"
                    )

                    db.add(new_incident)
                    db.commit()
                    db.refresh(new_incident)

                    incident_id = new_incident.id

                    print(
                        f"NEXUS: New incident created. "
                        f"ID: {incident_id}"
                    )

                else:

                    incident_id = existing_incident.id

                    print(
                        f"NEXUS: Existing open incident found. "
                        f"ID: {incident_id}"
                    )

                # STEP 3: TRIGGER AUTONOMOUS HANDLING ONCE

                if incident_id not in processed_incidents:

                    processed_incidents.add(incident_id)

                    db.close()
                    db = None

                    await handle_incident(incident_id)

                else:

                    print(
                        f"NEXUS: Incident {incident_id} "
                        "was already processed in this session."
                    )

            else:

                print(
                    "NEXUS MONITOR: Demo application is healthy."
                )

        except Exception as error:

            if db is not None:
                db.rollback()

            print(
                f"NEXUS monitoring error: {error}"
            )

        finally:

            if db is not None:
                db.close()

        await asyncio.sleep(MONITORING_INTERVAL)


# --------------------------------------------------
# APPLICATION LIFECYCLE
# --------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):

    monitoring_task = asyncio.create_task(
        continuous_monitoring()
    )

    yield

    monitoring_task.cancel()

    with suppress(asyncio.CancelledError):
        await monitoring_task

    print("NEXUS continuous monitoring stopped.")


# --------------------------------------------------
# FASTAPI APPLICATION
# --------------------------------------------------

app = FastAPI(
    title="NEXUS Platform API",
    description=(
        "AI-Powered Autonomous Incident Recovery "
        "for DevOps"
    ),
    version="1.0.0",
    lifespan=lifespan
)


# --------------------------------------------------
# CORS CONFIGURATION
# --------------------------------------------------

app.add_middleware(
    CORSMiddleware,

    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],

    allow_credentials=True,

    allow_methods=["*"],

    allow_headers=["*"]
)


# --------------------------------------------------
# REGISTER ROUTERS
# --------------------------------------------------

app.include_router(incidents.router)


# --------------------------------------------------
# HOME ENDPOINT
# --------------------------------------------------

@app.get("/")
def home():

    return {
        "project": "NEXUS",
        "message": "NEXUS Platform Backend is running",
        "status": "operational"
    }


# --------------------------------------------------
# BACKEND HEALTH CHECK
# --------------------------------------------------

@app.get("/health")
def health():

    return {
        "status": "healthy",
        "service": "NEXUS Platform",
        "timestamp": datetime.now(
            timezone.utc
        ).isoformat()
    }


# --------------------------------------------------
# PLATFORM STATUS
# --------------------------------------------------

@app.get("/api/status")
def platform_status():

    return {
        "platform": "NEXUS",

        "components": {
            "api": "running",
            "database": "connected",
            "monitoring": "continuous monitoring enabled",
            "monitoring_interval_seconds": MONITORING_INTERVAL,
            "incident_management": "enabled",
            "ai_diagnosis": "enabled",
            "recovery_engine": "enabled",
            "autonomous_recovery": "enabled",
            "recovery_history": "enabled"
        }
    }


# --------------------------------------------------
# APPLICATION INFORMATION
# --------------------------------------------------

@app.get("/api/info")
def application_info():

    return {
        "name": "NEXUS",
        "version": "1.0.0",
        "architecture": "FastAPI + SQLite + React",

        "lifecycle": [
            "Detect",
            "Diagnose",
            "Recover",
            "Verify",
            "Record Recovery History"
        ]
    }
