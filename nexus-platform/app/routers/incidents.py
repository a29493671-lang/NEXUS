
import time

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Incident, RecoveryLog
from app.schemas import IncidentCreate, IncidentResponse

from app.services.monitor import check_application_health
from app.services.diagnosis import diagnose_incident
from app.services.recovery import recover_demo_application


router = APIRouter(
    prefix="/api/incidents",
    tags=["Incident Management"]
)


# --------------------------------------------------
# 1. CREATE INCIDENT
# --------------------------------------------------

@router.post("/", response_model=IncidentResponse)
def create_incident(
    incident: IncidentCreate,
    db: Session = Depends(get_db)
):
    new_incident = Incident(
        title=incident.title,
        description=incident.description,
        severity=incident.severity,
        status="open"
    )

    try:
        db.add(new_incident)
        db.commit()
        db.refresh(new_incident)

        return new_incident

    except Exception as error:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"Failed to create incident: {str(error)}"
        )


# --------------------------------------------------
# 2. GET ALL INCIDENTS
# --------------------------------------------------

@router.get("/", response_model=list[IncidentResponse])
def get_incidents(
    db: Session = Depends(get_db)
):
    return db.query(Incident).order_by(
        Incident.id.desc()
    ).all()


# --------------------------------------------------
# 3. MONITOR APPLICATION
# --------------------------------------------------

@router.post("/check")
def monitor_application(
    db: Session = Depends(get_db)
):
    health = check_application_health()

    if health["status"] == "healthy":
        return {
            "health": health,
            "incident_created": False,
            "message": "Application is healthy. No incident detected."
        }

    existing_incident = db.query(Incident).filter(
        Incident.title == "Demo Application Health Check Failed",
        Incident.status == "open"
    ).first()

    if existing_incident:
        return {
            "health": health,
            "incident_created": False,
            "message": "An open incident already exists.",
            "incident_id": existing_incident.id
        }

    new_incident = Incident(
        title="Demo Application Health Check Failed",
        description=health.get(
            "message",
            "Application health check failed."
        ),
        severity="high",
        status="open"
    )

    try:
        db.add(new_incident)
        db.commit()
        db.refresh(new_incident)

        return {
            "health": health,
            "incident_created": True,
            "message": "Application failure detected. Incident created.",
            "incident_id": new_incident.id
        }

    except Exception as error:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"Failed to save detected incident: {str(error)}"
        )
# --------------------------------------------------
# 4. GET DEMO APPLICATION HEALTH
# --------------------------------------------------

@router.get("/demo-health")
def get_demo_application_health():
    health = check_application_health()

    return {
        "health": health,
        "status": health.get("status", "unknown"),
        "message": health.get("message", "Health status unavailable.")
    }


# --------------------------------------------------
# 5. GET ALL RECOVERY LOGS
# --------------------------------------------------

@router.get("/recovery-logs")
def get_all_recovery_logs(
    db: Session = Depends(get_db)
):
    logs = db.query(RecoveryLog).order_by(
        RecoveryLog.id.desc()
    ).all()

    return {
        "total_logs": len(logs),
        "recovery_history": logs
    }


# --------------------------------------------------
# 6. GET A PARTICULAR INCIDENT
# --------------------------------------------------

@router.get("/{incident_id}", response_model=IncidentResponse)
def get_incident(
    incident_id: int,
    db: Session = Depends(get_db)
):
    incident = db.query(Incident).filter(
        Incident.id == incident_id
    ).first()

    if incident is None:
        raise HTTPException(
            status_code=404,
            detail="Incident not found"
        )

    return incident


# --------------------------------------------------
# 7. GET INCIDENT DIAGNOSIS
# --------------------------------------------------

@router.get("/{incident_id}/diagnosis")
def get_incident_diagnosis(
    incident_id: int,
    db: Session = Depends(get_db)
):
    incident = db.query(Incident).filter(
        Incident.id == incident_id
    ).first()

    if incident is None:
        raise HTTPException(
            status_code=404,
            detail="Incident not found"
        )

    diagnosis = diagnose_incident(incident)

    return {
        "incident_id": incident.id,
        "incident_title": incident.title,
        "diagnosis_report": diagnosis
    }


# --------------------------------------------------
# 8. GET RECOVERY HISTORY FOR ONE INCIDENT
# --------------------------------------------------

@router.get("/{incident_id}/recovery-logs")
def get_incident_recovery_logs(
    incident_id: int,
    db: Session = Depends(get_db)
):
    incident = db.query(Incident).filter(
        Incident.id == incident_id
    ).first()

    if incident is None:
        raise HTTPException(
            status_code=404,
            detail="Incident not found"
        )

    logs = db.query(RecoveryLog).filter(
        RecoveryLog.incident_id == incident_id
    ).order_by(
        RecoveryLog.id.desc()
    ).all()

    return {
        "incident_id": incident.id,
        "incident_title": incident.title,
        "total_logs": len(logs),
        "recovery_history": logs
    }


# --------------------------------------------------
# 9. MANUAL INCIDENT RECOVERY WITH LOGGING
# --------------------------------------------------

@router.post("/{incident_id}/recover")
def recover_incident(
    incident_id: int,
    db: Session = Depends(get_db)
):
    incident = db.query(Incident).filter(
        Incident.id == incident_id
    ).first()

    if incident is None:
        raise HTTPException(
            status_code=404,
            detail="Incident not found"
        )

    if incident.status == "resolved":
        return {
            "incident_id": incident.id,
            "message": "Incident is already resolved.",
            "recovery_success": True
        }

    # STEP 1: DIAGNOSIS

    diagnosis_report = diagnose_incident(incident)

    # STEP 2: RECOVERY

    recovery_start = time.perf_counter()

    recovery_report = recover_demo_application()

    recovery_duration = time.perf_counter() - recovery_start

    # STEP 3: VERIFY HEALTH

    health = check_application_health()

    final_health = health.get("status", "unknown")

    recovery_success = (
        recovery_report.get("success", False)
        and final_health == "healthy"
    )

    # STEP 4: UPDATE INCIDENT STATUS

    if recovery_success:
        incident.status = "resolved"

    # STEP 5: CREATE RECOVERY LOG

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

        duration_seconds=round(
            recovery_duration,
            3
        ),

        final_health=final_health
    )

    try:
        db.add(recovery_log)
        db.commit()

        db.refresh(incident)
        db.refresh(recovery_log)

    except Exception as error:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"Failed to save recovery history: {str(error)}"
        )

    # STEP 6: RESPONSE

    return {
        "incident_id": incident.id,
        "incident_title": incident.title,
        "recovery_success": recovery_success,
        "recovery_report": recovery_report,
        "final_health": final_health,
        "incident_status": incident.status,
        "recovery_log_id": recovery_log.id,
        "message": (
            "Recovery completed and history saved."
            if recovery_success
            else "Recovery was unsuccessful. Attempt recorded in history."
        )
    }
