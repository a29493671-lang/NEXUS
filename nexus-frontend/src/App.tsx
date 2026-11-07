
import { useCallback, useEffect, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Brain,
  CheckCircle2,
  Clock,
  ClipboardList,
  LayoutDashboard,
  RefreshCw,
  Server,
  ShieldCheck,
  Sparkles,
  Zap,
  History,
  XCircle,
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "";

// --------------------------------------------------
// TYPES
// --------------------------------------------------

interface Incident {
  id: number;
  title: string;
  description: string;
  severity: string;
  status: string;
  created_at: string;
}

interface Diagnosis {
  diagnosis?: string;
  root_cause?: string;
  severity?: string;
  recommendation?: string;
  confidence?: number;
  diagnosed_at?: string;
  diagnosis_engine?: string;
  ai_status?: string;
}

interface HealthData {
  status?: string;
  platform?: string;
  [key: string]: unknown;
}

interface DemoHealthResponse {
  status?: string;
  message?: string;
  health?: {
    status?: string;
    message?: string;
  };
}

interface RecoveryLog {
  id: number;
  incident_id: number;
  diagnosis?: string;
  root_cause?: string;
  diagnosis_engine?: string;
  recovery_action?: string;
  recovery_status: string;
  recovery_message?: string;
  duration_seconds?: number;
  final_health?: string;
  created_at: string;
}

interface RecoveryResponse {
  total_logs: number;
  recovery_history: RecoveryLog[];
}

type Page =
  | "Dashboard"
  | "Incidents"
  | "Monitoring"
  | "Infrastructure"
  | "Recovery History";

// --------------------------------------------------
// COLORS AND STYLES
// --------------------------------------------------

const colors = {
  background: "#0b1120",
  panel: "#111c30",
  panelLight: "#17243a",
  border: "#26364f",
  text: "#e5edf8",
  muted: "#94a3b8",
  green: "#4ade80",
  red: "#f87171",
  yellow: "#facc15",
  blue: "#60a5fa",
};

const mutedText: CSSProperties = {
  color: colors.muted,
  fontSize: 13,
};

const buttonStyle: CSSProperties = {
  border: "none",
  borderRadius: 8,
  padding: "11px 15px",
  background: "#2563eb",
  color: "white",
  cursor: "pointer",
  fontWeight: 600,
};

const cardStyle: CSSProperties = {
  background: colors.panel,
  border: `1px solid ${colors.border}`,
  borderRadius: 12,
  padding: 20,
};

// --------------------------------------------------
// HELPER FUNCTIONS
// --------------------------------------------------

function formatDate(value?: string) {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString();
}

function getSeverityColor(severity?: string) {
  switch (severity?.toLowerCase()) {
    case "critical":
    case "high":
      return colors.red;
    case "medium":
      return colors.yellow;
    case "low":
      return colors.green;
    default:
      return colors.muted;
  }
}

function getStatusColor(status?: string) {
  switch (status?.toLowerCase()) {
    case "success":
    case "healthy":
    case "resolved":
      return colors.green;
    case "failed":
    case "unhealthy":
    case "open":
      return colors.red;
    default:
      return colors.yellow;
  }
}

// --------------------------------------------------
// MAIN APPLICATION
// --------------------------------------------------

function App() {
  const [activePage, setActivePage] = useState<Page>("Dashboard");

  const [incidents, setIncidents] = useState<Incident[]>([]);

  const [recoveryLogs, setRecoveryLogs] = useState<RecoveryLog[]>([]);

  const [health, setHealth] = useState<HealthData | null>(null);

  // Actual Demo Application health
  const [demoHealthy, setDemoHealthy] = useState(false);

  const [loading, setLoading] = useState(true);

  const [checking, setChecking] = useState(false);

  const [recoveryLoading, setRecoveryLoading] = useState(false);

  const [error, setError] = useState("");

  const [recoveryError, setRecoveryError] = useState("");

  const [selectedIncidentId, setSelectedIncidentId] =
    useState<number | null>(null);

  const [selectedDiagnosis, setSelectedDiagnosis] =
    useState<Diagnosis | null>(null);

  const [diagnosing, setDiagnosing] = useState(false);

  const [lastUpdated, setLastUpdated] = useState("");

  // ------------------------------------------------
  // LOAD DASHBOARD DATA
  // ------------------------------------------------

  const loadDashboard = useCallback(async () => {
    try {
      setError("");

      const [
        healthResponse,
        incidentResponse,
        recoveryResponse,
        demoHealthResponse,
      ] = await Promise.all([
        fetch(`${API_URL}/health`),

        fetch(`${API_URL}/api/incidents/`),

        fetch(`${API_URL}/api/incidents/recovery-logs`),

        fetch(`${API_URL}/api/incidents/demo-health`),
      ]);

      if (!healthResponse.ok) {
        throw new Error("Backend health endpoint is unavailable.");
      }

      if (!incidentResponse.ok) {
        throw new Error("Unable to load incidents.");
      }

      if (!recoveryResponse.ok) {
        throw new Error("Unable to load recovery history.");
      }

      const healthData: HealthData =
        await healthResponse.json();

      const incidentData = await incidentResponse.json();

      const recoveryData: RecoveryResponse =
        await recoveryResponse.json();

      setHealth(healthData);

      // Update actual Demo Application health
      if (demoHealthResponse.ok) {
        const demoHealthData: DemoHealthResponse =
          await demoHealthResponse.json();

        const actualDemoStatus =
          demoHealthData.status ??
          demoHealthData.health?.status;

        setDemoHealthy(actualDemoStatus === "healthy");
      } else {
        setDemoHealthy(false);
      }

      const incidentList: Incident[] = Array.isArray(incidentData)
        ? incidentData
        : incidentData.incidents ?? [];

      setIncidents(incidentList);

      setRecoveryLogs(
        Array.isArray(recoveryData.recovery_history)
          ? recoveryData.recovery_history
          : []
      );

      setLastUpdated(new Date().toLocaleTimeString());

    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to connect to NEXUS backend."
      );

    } finally {
      setLoading(false);
    }
  }, []);

  // ------------------------------------------------
  // AUTOMATIC REFRESH
  // ------------------------------------------------

  useEffect(() => {
    void loadDashboard();

    const interval = window.setInterval(() => {
      void loadDashboard();
    }, 10000);

    return () => window.clearInterval(interval);
  }, [loadDashboard]);

  // ------------------------------------------------
  // MANUAL HEALTH CHECK
  // ------------------------------------------------

  const runHealthCheck = async () => {
    setChecking(true);
    setError("");

    try {
      const response = await fetch(
        `${API_URL}/api/incidents/check`,
        {
          method: "POST",
        }
      );

      if (!response.ok) {
        throw new Error("Manual health check failed.");
      }

      await loadDashboard();

    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Health check failed."
      );

    } finally {
      setChecking(false);
    }
  };

  // ------------------------------------------------
  // AI INCIDENT DIAGNOSIS
  // ------------------------------------------------

  const viewDiagnosis = async (incidentId: number) => {
    setSelectedIncidentId(incidentId);

    setSelectedDiagnosis(null);

    setDiagnosing(true);

    setError("");

    try {
      const response = await fetch(
        `${API_URL}/api/incidents/${incidentId}/diagnosis`
      );

      if (!response.ok) {
        throw new Error("Unable to retrieve incident diagnosis.");
      }

      const data = await response.json();

      setSelectedDiagnosis(
        data.diagnosis_report ?? data
      );

    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Diagnosis request failed."
      );

    } finally {
      setDiagnosing(false);
    }
  };

  // ------------------------------------------------
  // MANUAL INCIDENT RECOVERY
  // ------------------------------------------------

  const recoverIncident = async (incidentId: number) => {
    const confirmed = window.confirm(
      `Start recovery for incident #${incidentId}?`
    );

    if (!confirmed) return;

    setRecoveryLoading(true);

    setError("");

    try {
      const response = await fetch(
        `${API_URL}/api/incidents/${incidentId}/recover`,
        {
          method: "POST",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ?? "Recovery request failed."
        );
      }

      alert(data.message ?? "Recovery request completed.");

      await loadDashboard();

    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Recovery failed."
      );

    } finally {
      setRecoveryLoading(false);
    }
  };

  // ------------------------------------------------
  // DASHBOARD STATISTICS
  // ------------------------------------------------

  const totalIncidents = incidents.length;

  const openIncidents = incidents.filter(
    (incident) =>
      incident.status?.toLowerCase() === "open"
  ).length;

  const highIncidents = incidents.filter(
    (incident) =>
      incident.severity?.toLowerCase() === "high" ||
      incident.severity?.toLowerCase() === "critical"
  ).length;

  const totalRecoveries = recoveryLogs.length;

  const successfulRecoveries = recoveryLogs.filter(
    (log) =>
      log.recovery_status?.toLowerCase() === "success"
  ).length;

  const failedRecoveries = recoveryLogs.filter(
    (log) =>
      log.recovery_status?.toLowerCase() === "failed"
  ).length;

  const successRate =
    totalRecoveries > 0
      ? Math.round(
          (successfulRecoveries / totalRecoveries) * 100
        )
      : 0;

  const backendHealthy =
    health?.status === "healthy" ||
    health?.status === "ok" ||
    health?.status === "running";

  // ------------------------------------------------
  // INCIDENT TABLE
  // ------------------------------------------------

  const renderIncidents = () => (
    <section style={cardStyle}>
      <div style={styles.sectionHeader}>
        <div>
          <h2 style={styles.sectionTitle}>
            Incident History
          </h2>

          <p style={mutedText}>
            Incidents detected by NEXUS monitoring
          </p>
        </div>

        <button
          style={buttonStyle}
          onClick={() => void loadDashboard()}
          disabled={loading}
        >
          <RefreshCw
            size={14}
            style={{ marginRight: 6 }}
          />
          Refresh
        </button>
      </div>

      {incidents.length === 0 ? (
        <p style={{ color: colors.muted, padding: 25 }}>
          {loading
            ? "Loading incidents..."
            : "No incidents have been recorded."}
        </p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Incident</th>
                <th>Severity</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {incidents.map((incident) => (
                <tr key={incident.id}>
                  <td>#{incident.id}</td>

                  <td>
                    <strong>{incident.title}</strong>

                    <p style={mutedText}>
                      {incident.description}
                    </p>
                  </td>

                  <td>
                    <span
                      style={{
                        color: getSeverityColor(
                          incident.severity
                        ),
                        fontWeight: 700,
                      }}
                    >
                      {incident.severity}
                    </span>
                  </td>

                  <td>
                    <span
                      style={{
                        color: getStatusColor(incident.status),
                        fontWeight: 600,
                      }}
                    >
                      {incident.status}
                    </span>
                  </td>

                  <td>{formatDate(incident.created_at)}</td>

                  <td>
                    <div style={styles.actionGroup}>
                      <button
                        style={styles.smallButton}
                        onClick={() =>
                          void viewDiagnosis(incident.id)
                        }
                      >
                        <Brain size={13} />
                        Diagnose
                      </button>

                      {incident.status?.toLowerCase() === "open" && (
                        <button
                          style={{
                            ...styles.smallButton,
                            background: "#166534",
                          }}
                          disabled={recoveryLoading}
                          onClick={() =>
                            void recoverIncident(incident.id)
                          }
                        >
                          <Zap size={13} />
                          Recover
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );

  // ------------------------------------------------
  // RECOVERY HISTORY PAGE
  // ------------------------------------------------

  const renderRecoveryHistory = () => (
    <>
      <div style={styles.statsGrid}>
        <StatCard
          title="Total Recovery Attempts"
          value={totalRecoveries}
          icon={<History size={23} />}
          color={colors.blue}
        />

        <StatCard
          title="Successful Recoveries"
          value={successfulRecoveries}
          icon={<CheckCircle2 size={23} />}
          color={colors.green}
        />

        <StatCard
          title="Failed Recoveries"
          value={failedRecoveries}
          icon={<XCircle size={23} />}
          color={colors.red}
        />

        <StatCard
          title="Success Rate"
          value={`${successRate}%`}
          icon={<Activity size={23} />}
          color={colors.green}
        />
      </div>

      <section style={{ ...cardStyle, marginBottom: 22 }}>
        <div style={styles.sectionHeader}>
          <div>
            <h2 style={styles.sectionTitle}>
              Recovery Activity
            </h2>

            <p style={mutedText}>
              Persistent recovery records retrieved from the NEXUS database.
            </p>
          </div>

          <button
            style={buttonStyle}
            onClick={() => {
              setRecoveryError("");
              setRecoveryLoading(true);

              void loadDashboard().finally(() => {
                setRecoveryLoading(false);
              });
            }}
            disabled={recoveryLoading}
          >
            <RefreshCw
              size={14}
              style={{ marginRight: 6 }}
            />
            {recoveryLoading ? "Refreshing..." : "Refresh History"}
          </button>
        </div>

        {recoveryError && (
          <p style={{ color: colors.red }}>
            {recoveryError}
          </p>
        )}

        {recoveryLogs.length === 0 ? (
          <div style={styles.emptyState}>
            <History size={40} color={colors.muted} />

            <h3>No Recovery Records Yet</h3>

            <p style={mutedText}>
              Recovery attempts will appear here after
              NEXUS records them in the database.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th>Log ID</th>
                  <th>Incident</th>
                  <th>Diagnosis Engine</th>
                  <th>Recovery Action</th>
                  <th>Status</th>
                  <th>Duration</th>
                  <th>Final Health</th>
                  <th>Created</th>
                </tr>
              </thead>

              <tbody>
                {recoveryLogs.map((log) => (
                  <tr key={log.id}>
                    <td>#{log.id}</td>

                    <td>
                      <strong>Incident #{log.incident_id}</strong>
                    </td>

                    <td>
                      {log.diagnosis_engine ?? "Unknown"}
                    </td>

                    <td>
                      {log.recovery_action ?? "Unknown"}
                    </td>

                    <td>
                      <span
                        style={{
                          color: getStatusColor(
                            log.recovery_status
                          ),
                          fontWeight: 700,
                        }}
                      >
                        {log.recovery_status}
                      </span>
                    </td>

                    <td>
                      {log.duration_seconds !== undefined &&
                      log.duration_seconds !== null
                        ? `${Number(log.duration_seconds).toFixed(3)} s`
                        : "N/A"}
                    </td>

                    <td>
                      <span
                        style={{
                          color: getStatusColor(log.final_health),
                          fontWeight: 600,
                        }}
                      >
                        {log.final_health ?? "Unknown"}
                      </span>
                    </td>

                    <td>{formatDate(log.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {recoveryLogs.length > 0 && (
        <section style={cardStyle}>
          <h2 style={styles.sectionTitle}>
            Detailed Recovery Reports
          </h2>

          <p style={mutedText}>
            Diagnosis, root cause and recovery messages for each attempt.
          </p>

          <div style={styles.recoveryList}>
            {recoveryLogs.map((log) => (
              <div key={log.id} style={styles.recoveryCard}>
                <div style={styles.sectionHeader}>
                  <div>
                    <h3 style={{ margin: "0 0 6px" }}>
                      Recovery Log #{log.id}
                    </h3>

                    <p style={mutedText}>
                      Incident #{log.incident_id}
                    </p>
                  </div>

                  <span
                    style={{
                      color: getStatusColor(log.recovery_status),
                      fontWeight: 700,
                    }}
                  >
                    {log.recovery_status.toUpperCase()}
                  </span>
                </div>

                <DiagnosisItem
                  title="AI Diagnosis"
                  value={log.diagnosis}
                />

                <DiagnosisItem
                  title="Root Cause"
                  value={log.root_cause}
                />

                <DiagnosisItem
                  title="Recovery Message"
                  value={log.recovery_message}
                />

                <div style={styles.healthGrid}>
                  <div style={styles.infoBox}>
                    <p style={mutedText}>Recovery Action</p>
                    <strong>
                      {log.recovery_action ?? "Unknown"}
                    </strong>
                  </div>

                  <div style={styles.infoBox}>
                    <p style={mutedText}>Diagnosis Engine</p>
                    <strong>
                      {log.diagnosis_engine ?? "Unknown"}
                    </strong>
                  </div>

                  <div style={styles.infoBox}>
                    <p style={mutedText}>Final Application Health</p>
                    <strong
                      style={{
                        color: getStatusColor(log.final_health),
                      }}
                    >
                      {log.final_health ?? "Unknown"}
                    </strong>
                  </div>

                  <div style={styles.infoBox}>
                    <p style={mutedText}>Duration</p>
                    <strong>
                      {log.duration_seconds !== undefined &&
                      log.duration_seconds !== null
                        ? `${Number(log.duration_seconds).toFixed(3)} seconds`
                        : "N/A"}
                    </strong>
                  </div>
                </div>

                <p style={{ ...mutedText, marginTop: 15 }}>
                  <Clock
                    size={13}
                    style={{
                      display: "inline",
                      marginRight: 5,
                      verticalAlign: "middle",
                    }}
                  />
                  {formatDate(log.created_at)}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );

  // ------------------------------------------------
  // APPLICATION UI
  // ------------------------------------------------

  return (
    <div style={styles.app}>
      <aside style={styles.sidebar}>
        <div style={styles.logo}>
          <div style={styles.logoIcon}>
            <ShieldCheck size={25} />
          </div>

          <div>
            <h2 style={{ margin: 0, fontSize: 22 }}>
              NEXUS
            </h2>

            <span style={mutedText}>
              Intelligent Operations
            </span>
          </div>
        </div>

        <p style={styles.navLabel}>WORKSPACE</p>

        {(
          [
            ["Dashboard", LayoutDashboard],
            ["Incidents", AlertCircle],
            ["Monitoring", Activity],
            ["Infrastructure", Server],
            ["Recovery History", ClipboardList],
          ] as const
        ).map(([page, Icon]) => (
          <button
            key={page}
            onClick={() => setActivePage(page)}
            style={{
              ...styles.navItem,
              background:
                activePage === page
                  ? "#1e3a5f"
                  : "transparent",
              color:
                activePage === page
                  ? "#93c5fd"
                  : colors.muted,
            }}
          >
            <Icon size={18} />
            {page}
          </button>
        ))}

        <div style={styles.sidebarBottom}>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span
              style={{
                width: 9,
                height: 9,
                borderRadius: "50%",
                background: backendHealthy
                  ? colors.green
                  : colors.red,
              }}
            />

            <span style={mutedText}>
              {backendHealthy
                ? "Backend connected"
                : "Backend unavailable"}
            </span>
          </div>

          <p style={mutedText}>NEXUS Platform</p>
          <p style={mutedText}>Version 1.0</p>
        </div>
      </aside>

      <main style={styles.main}>
        <header style={styles.header}>
          <div>
            <h1 style={styles.pageTitle}>
              {activePage}
            </h1>

            <p style={mutedText}>
              Intelligent monitoring and incident management
            </p>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span style={mutedText}>
              Updated: {lastUpdated || "Loading"}
            </span>

            <button
              style={buttonStyle}
              onClick={() => void runHealthCheck()}
              disabled={checking}
            >
              <RefreshCw
                size={14}
                style={{ marginRight: 7 }}
              />

              {checking ? "Checking..." : "Run Health Check"}
            </button>
          </div>
        </header>

        {error && (
          <div style={styles.errorBox}>
            <AlertTriangle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* DASHBOARD */}

        {activePage === "Dashboard" && (
          <>
            <div style={styles.welcome}>
              <div>
                <h2 style={{ margin: "0 0 8px" }}>
                  Welcome to NEXUS
                </h2>

                <p style={{ margin: 0, color: "#cbd5e1" }}>
                  Monitor services, identify incidents and use
                  AI-powered diagnosis to understand failures.
                </p>
              </div>

              <Sparkles size={38} color="#93c5fd" />
            </div>

            <div style={styles.statsGrid}>
              <StatCard
                title="Total Incidents"
                value={totalIncidents}
                icon={<AlertCircle size={23} />}
                color={colors.blue}
              />

              <StatCard
                title="Open Incidents"
                value={openIncidents}
                icon={<Clock size={23} />}
                color={colors.yellow}
              />

              <StatCard
                title="High Severity"
                value={highIncidents}
                icon={<AlertTriangle size={23} />}
                color={colors.red}
              />

              <StatCard
                title="Successful Recoveries"
                value={successfulRecoveries}
                icon={<CheckCircle2 size={23} />}
                color={colors.green}
              />
            </div>

            <section style={{ ...cardStyle, marginBottom: 22 }}>
              <h2 style={styles.sectionTitle}>
                System Health Overview
              </h2>

              <div style={styles.healthGrid}>
                <HealthItem
                  name="Backend API"
                  healthy={backendHealthy}
                  detail={health?.status ?? "No response"}
                />

                <HealthItem
                  name="Database"
                  healthy={backendHealthy}
                  detail={
                    backendHealthy
                      ? "Connected (backend reported)"
                      : "Not verified"
                  }
                />

                <HealthItem
                  name="Incident Management"
                  healthy={true}
                  detail="Enabled"
                />

                <HealthItem
                  name="Recovery History"
                  healthy={true}
                  detail={`${totalRecoveries} records loaded`}
                />
              </div>
            </section>

            {renderIncidents()}
          </>
        )}

        {/* INCIDENTS */}

        {activePage === "Incidents" && renderIncidents()}

        {/* MONITORING */}

        {activePage === "Monitoring" && (
          <section style={cardStyle}>
            <h2 style={styles.sectionTitle}>
              Monitoring Services
            </h2>

            <p style={mutedText}>
              NEXUS periodically checks the backend and
              retrieves incident information.
            </p>

            <div style={styles.healthGrid}>
              <HealthItem
                name="Backend Health Monitoring"
                healthy={backendHealthy}
                detail={
                  backendHealthy
                    ? "Responding"
                    : "Unavailable"
                }
              />

              <HealthItem
                name="Demo Application Monitoring"
                healthy={demoHealthy}
                detail={
                  demoHealthy
                    ? "Demo application is healthy"
                    : "Demo application is unhealthy or unavailable"
                }
              />

              <HealthItem
                name="Automatic Refresh"
                healthy={true}
                detail="Every 10 seconds"
              />

              <HealthItem
                name="Manual Health Check"
                healthy={true}
                detail="Available"
              />
            </div>

            <button
              style={{ ...buttonStyle, marginTop: 20 }}
              onClick={() => void runHealthCheck()}
              disabled={checking}
            >
              {checking
                ? "Checking..."
                : "Run Monitoring Check"}
            </button>
          </section>
        )}

        {/* INFRASTRUCTURE */}

        {activePage === "Infrastructure" && (
          <section style={cardStyle}>
            <h2 style={styles.sectionTitle}>
              Infrastructure Overview
            </h2>

            <div style={styles.healthGrid}>
              <HealthItem
                name="NEXUS Backend"
                healthy={backendHealthy}
                detail="FastAPI - Port 8001"
              />

              <HealthItem
                name="Database"
                healthy={backendHealthy}
                detail="Backend database connection"
              />

              <HealthItem
                name="Demo Application"
                healthy={demoHealthy}
                detail={
                  demoHealthy
                    ? "Healthy - monitored by NEXUS"
                    : "Unhealthy or unavailable - monitored by NEXUS"
                }
              />

              <HealthItem
                name="Frontend"
                healthy={true}
                detail="React - Vite - Port 5173"
              />
            </div>
          </section>
        )}

        {/* RECOVERY HISTORY */}

        {activePage === "Recovery History" &&
          renderRecoveryHistory()}

        {/* AI DIAGNOSIS REPORT */}

        {selectedIncidentId !== null && (
          <section style={{ ...cardStyle, marginTop: 24 }}>
            <div style={styles.sectionHeader}>
              <div>
                <h2 style={styles.sectionTitle}>
                  AI Diagnosis Report
                </h2>

                <p style={mutedText}>
                  Incident #{selectedIncidentId}
                </p>
              </div>

              <button
                style={{
                  ...buttonStyle,
                  background: "#334155",
                }}
                onClick={() => {
                  setSelectedIncidentId(null);
                  setSelectedDiagnosis(null);
                }}
              >
                Close
              </button>
            </div>

            {diagnosing && (
              <p style={{ color: colors.blue }}>
                <Brain
                  size={17}
                  style={{
                    display: "inline",
                    marginRight: 6,
                  }}
                />
                Analysing incident...
              </p>
            )}

            {selectedDiagnosis && (
              <>
                <div style={styles.aiBanner}>
                  <Sparkles size={19} />

                  {selectedDiagnosis.diagnosis_engine ??
                    "NEXUS Diagnosis Engine"}

                  {" - "}

                  {selectedDiagnosis.ai_status ??
                    "Diagnosis received"}
                </div>

                <DiagnosisItem
                  title="Diagnosis"
                  value={selectedDiagnosis.diagnosis}
                />

                <DiagnosisItem
                  title="Root Cause"
                  value={selectedDiagnosis.root_cause}
                />

                <DiagnosisItem
                  title="Recommended Action"
                  value={selectedDiagnosis.recommendation}
                />

                <div style={styles.healthGrid}>
                  <div style={styles.infoBox}>
                    <p style={mutedText}>Severity</p>

                    <h3
                      style={{
                        color: getSeverityColor(
                          selectedDiagnosis.severity
                        ),
                      }}
                    >
                      {selectedDiagnosis.severity ?? "Unknown"}
                    </h3>
                  </div>

                  <div style={styles.infoBox}>
                    <p style={mutedText}>Diagnosis Confidence</p>

                    <h3 style={{ color: colors.green }}>
                      {selectedDiagnosis.confidence ?? "N/A"}

                      {selectedDiagnosis.confidence !== undefined
                        ? "%"
                        : ""}
                    </h3>
                  </div>

                  <div style={styles.infoBox}>
                    <p style={mutedText}>Incident ID</p>
                    <h3>#{selectedIncidentId}</h3>
                  </div>
                </div>

                <p style={{ ...mutedText, marginTop: 20 }}>
                  <Clock
                    size={14}
                    style={{
                      display: "inline",
                      verticalAlign: "middle",
                      marginRight: 5,
                    }}
                  />

                  Diagnosed at:{" "}
                  {formatDate(selectedDiagnosis.diagnosed_at)}
                </p>
              </>
            )}
          </section>
        )}

        {/* FOOTER */}

        <footer style={styles.footer}>
          <span>
            <Activity
              size={14}
              style={{ marginRight: 6 }}
            />
            NEXUS Intelligent Monitoring Platform
          </span>

          <span>
            <Zap
              size={14}
              style={{ marginRight: 6 }}
            />
            Live monitoring enabled
          </span>
        </footer>
      </main>
    </div>
  );
}

// --------------------------------------------------
// STATISTICS CARD
// --------------------------------------------------

function StatCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: string | number;
  icon: ReactNode;
  color: string;
}) {
  return (
    <div style={styles.statCard}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span style={{ color: colors.muted, fontSize: 13 }}>
          {title}
        </span>

        <span style={{ color }}>{icon}</span>
      </div>

      <h2 style={{ fontSize: 27, margin: "16px 0 0", color }}>
        {value}
      </h2>
    </div>
  );
}

// --------------------------------------------------
// HEALTH ITEM
// --------------------------------------------------

function HealthItem({
  name,
  healthy,
  detail,
}: {
  name: string;
  healthy: boolean;
  detail: string;
}) {
  return (
    <div style={styles.healthItem}>
      <div>
        <strong>{name}</strong>
        <p style={mutedText}>{detail}</p>
      </div>

      {healthy ? (
        <CheckCircle2 color={colors.green} size={21} />
      ) : (
        <AlertCircle color={colors.red} size={21} />
      )}
    </div>
  );
}

// --------------------------------------------------
// DIAGNOSIS ITEM
// --------------------------------------------------

function DiagnosisItem({
  title,
  value,
}: {
  title: string;
  value?: string;
}) {
  return (
    <div style={{ marginTop: 20 }}>
      <h3 style={{ fontSize: 15, color: "#93c5fd" }}>
        {title}
      </h3>

      <p style={{ color: colors.text, lineHeight: 1.7 }}>
        {value || "No information provided."}
      </p>
    </div>
  );
}

// --------------------------------------------------
// GLOBAL STYLES
// --------------------------------------------------

const styles: Record<string, CSSProperties> = {
  app: {
    minHeight: "100vh",
    display: "flex",
    background: colors.background,
    color: colors.text,
    fontFamily: "Inter, Arial, sans-serif",
  },

  sidebar: {
    width: 245,
    minWidth: 245,
    background: "#0e192b",
    borderRight: `1px solid ${colors.border}`,
    padding: 22,
    display: "flex",
    flexDirection: "column",
    boxSizing: "border-box",
  },

  logo: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 45,
  },

  logoIcon: {
    width: 43,
    height: 43,
    borderRadius: 12,
    background: "#1d4ed8",
    display: "grid",
    placeItems: "center",
  },

  navLabel: {
    color: "#64748b",
    fontSize: 11,
    letterSpacing: 1.5,
    marginBottom: 12,
  },

  navItem: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: 12,
    border: "none",
    padding: "13px 12px",
    borderRadius: 8,
    marginBottom: 7,
    cursor: "pointer",
    textAlign: "left",
    fontSize: 14,
  },

  sidebarBottom: {
    marginTop: "auto",
    borderTop: `1px solid ${colors.border}`,
    paddingTop: 20,
  },

  main: {
    flex: 1,
    minWidth: 0,
    padding: 30,
    overflowX: "hidden",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 15,
    flexWrap: "wrap",
    marginBottom: 28,
  },

  pageTitle: {
    margin: 0,
    fontSize: 27,
  },

  welcome: {
    background: "linear-gradient(120deg, #172e50, #17243a)",
    border: `1px solid ${colors.border}`,
    padding: 25,
    borderRadius: 12,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 22,
    gap: 15,
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 16,
    marginBottom: 22,
  },

  statCard: {
    background: colors.panel,
    border: `1px solid ${colors.border}`,
    borderRadius: 12,
    padding: 20,
  },

  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 20,
  },

  sectionTitle: {
    margin: "0 0 7px",
    fontSize: 18,
  },

  healthGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 13,
    marginTop: 18,
  },

  healthItem: {
    background: colors.panelLight,
    border: `1px solid ${colors.border}`,
    borderRadius: 9,
    padding: 16,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
    textAlign: "left",
    fontSize: 13,
  },

  infoBox: {
    background: colors.panelLight,
    padding: 16,
    borderRadius: 9,
  },

  aiBanner: {
    display: "flex",
    alignItems: "center",
    gap: 9,
    color: "#93c5fd",
    background: "#172e50",
    padding: 13,
    borderRadius: 8,
    marginTop: 15,
  },

  errorBox: {
    display: "flex",
    gap: 10,
    alignItems: "center",
    color: "#fecaca",
    background: "#451a1a",
    border: "1px solid #7f1d1d",
    padding: 14,
    borderRadius: 9,
    marginBottom: 20,
  },

  footer: {
    display: "flex",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 12,
    color: colors.muted,
    fontSize: 12,
    padding: "25px 0 5px",
    marginTop: 20,
  },

  actionGroup: {
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
  },

  smallButton: {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    padding: "8px 10px",
    border: "none",
    borderRadius: 7,
    background: "#1d4ed8",
    color: "white",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 600,
  },

  emptyState: {
    minHeight: 200,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    textAlign: "center",
    gap: 8,
  },

  recoveryList: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
    marginTop: 20,
  },

  recoveryCard: {
    background: colors.panelLight,
    border: `1px solid ${colors.border}`,
    borderRadius: 10,
    padding: 20,
  },
};

export default App;
