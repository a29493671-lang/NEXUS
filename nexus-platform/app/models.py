
from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    DateTime,
    Float,
    ForeignKey
)
from datetime import datetime, timezone

from app.database import Base


# --------------------------------------------------
# INCIDENT MODEL
# --------------------------------------------------

class Incident(Base):
    __tablename__ = "incidents"

    id = Column(Integer, primary_key=True, index=True)

    title = Column(String(200), nullable=False)

    description = Column(Text, nullable=False)

    severity = Column(String(50), default="medium")

    status = Column(String(50), default="open")

    created_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc)
    )


# --------------------------------------------------
# RECOVERY HISTORY MODEL
# --------------------------------------------------

class RecoveryLog(Base):
    __tablename__ = "recovery_logs"

    id = Column(Integer, primary_key=True, index=True)

    incident_id = Column(
        Integer,
        ForeignKey("incidents.id"),
        nullable=False,
        index=True
    )

    diagnosis = Column(Text, nullable=True)

    root_cause = Column(Text, nullable=True)

    diagnosis_engine = Column(
        String(100),
        nullable=True
    )

    recovery_action = Column(
        String(200),
        nullable=True
    )

    recovery_status = Column(
        String(50),
        nullable=False
    )

    recovery_message = Column(Text, nullable=True)

    duration_seconds = Column(
        Float,
        nullable=True
    )

    final_health = Column(
        String(50),
        nullable=True
    )

    created_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc)
    )
