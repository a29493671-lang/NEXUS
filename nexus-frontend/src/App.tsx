import "./App.css";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Brain,
  CheckCircle2,
  Clock3,
  ClipboardList,
  LayoutDashboard,
  RefreshCw,
  Server,
  ShieldCheck,
  Sparkles,
  Zap,
  History,
  X,
  XCircle,
  Gauge,
  Database,
  Monitor,
  ChevronRight,
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "";

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

const navigation: { page: Page; icon: typeof LayoutDashboard }[] = [
  { page: "Dashboard", icon: LayoutDashboard },
  { page: "Incidents", icon: AlertCircle },
  { page: "Monitoring", icon: Activity },
  { page: "Infrastructure", icon: Server },
  { page: "Recovery History", icon: ClipboardList },
];

function formatDate(value?: string) {
  if (!value) return "Not available";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function getSeverityClass(severity?: string) {
  const value = severity?.toLowerCase();
  if (value === "critical" || value === "high") return "high";
  if (value === "medium") return "medium";
  if (value === "low") return "low";
  return "neutral";
}

function getStatusClass(status?: string) {
  const value = status?.toLowerCase();
  if (["success", "healthy", "resolved", "connected"].includes(value || "")) {
    return "success";
  }
  if (["failed", "unhealthy", "open", "error"].includes(value || "")) {
    return "danger";
  }
  return "warning";
}

function App() {
  const [activePage, setActivePage] = useState<Page>("Dashboard");
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [recoveryLogs, setRecoveryLogs] = useState<RecoveryLog[]>([]);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [demoHealthy, setDemoHealthy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedIncidentId, setSelectedIncidentId] = useState<number | null>(null);
  const [selectedDiagnosis, setSelectedDiagnosis] = useState<Diagnosis | null>(null);
  const [diagnosing, setDiagnosing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const loadDashboard = useCallback(async () => {
    try {
      setError("");
      const [healthResponse, incidentResponse, recoveryResponse, demoHealthResponse] =
        await Promise.all([
          fetch(`${API_URL}/health`),
          fetch(`${API_URL}/api/incidents/`),
          fetch(`${API_URL}/api/incidents/recovery-logs`),
          fetch(`${API_URL}/api/incidents/demo-health`),
        ]);

      if (!healthResponse.ok) throw new Error("Backend health endpoint is unavailable.");
      if (!incidentResponse.ok) throw new Error("Unable to load incidents.");
      if (!recoveryResponse.ok) throw new Error("Unable to load recovery history.");

      const healthData: HealthData = await healthResponse.json();
      const incidentData = await incidentResponse.json();
      const recoveryData: RecoveryResponse = await recoveryResponse.json();

      setHealth(healthData);

      if (demoHealthResponse.ok) {
        const demoData: DemoHealthResponse = await demoHealthResponse.json();
        const status = demoData.status ?? demoData.health?.status;
        setDemoHealthy(status === "healthy");
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
        err instanceof Error ? err.message : "Unable to connect to NEXUS backend."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
    const interval = window.setInterval(() => void loadDashboard(), 10000);
    return () => window.clearInterval(interval);
  }, [loadDashboard]);

  const runHealthCheck = async () => {
    setChecking(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}/api/incidents/check`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Manual health check failed.");
      await loadDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Health check failed.");
    } finally {
      setChecking(false);
    }
  };

  const viewDiagnosis = async (incidentId: number) => {
    setSelectedIncidentId(incidentId);
    setSelectedDiagnosis(null);
    setDiagnosing(true);
    setError("");
    try {
      const response = await fetch(
        `${API_URL}/api/incidents/${incidentId}/diagnosis`
      );
      if (!response.ok) throw new Error("Unable to retrieve incident diagnosis.");
      const data = await response.json();
      setSelectedDiagnosis(data.diagnosis_report ?? data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Diagnosis request failed.");
    } finally {
      setDiagnosing(false);
    }
  };

  const recoverIncident = async (incidentId: number) => {
    if (!window.confirm(`Start recovery for incident #${incidentId}?`)) return;
    setRecoveryLoading(true);
    setError("");
    try {
      const response = await fetch(
        `${API_URL}/api/incidents/${incidentId}/recover`,
        { method: "POST" }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail ?? "Recovery request failed.");
      window.alert(data.message ?? "Recovery request completed.");
      await loadDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Recovery failed.");
    } finally {
      setRecoveryLoading(false);
    }
  };

  const totalIncidents = incidents.length;
  const openIncidents = incidents.filter(
    (item) => item.status?.toLowerCase() === "open"
  ).length;
  const highIncidents = incidents.filter((item) =>
    ["high", "critical"].includes(item.severity?.toLowerCase() || "")
  ).length;
  const totalRecoveries = recoveryLogs.length;
  const successfulRecoveries = recoveryLogs.filter(
    (log) => log.recovery_status?.toLowerCase() === "success"
  ).length;
  const failedRecoveries = recoveryLogs.filter(
    (log) => log.recovery_status?.toLowerCase() === "failed"
  ).length;
  const successRate =
    totalRecoveries > 0
      ? Math.round((successfulRecoveries / totalRecoveries) * 100)
      : 0;

  const backendHealthy = ["healthy", "ok", "running"].includes(
    health?.status?.toLowerCase() || ""
  );

  const pageDescription: Record<Page, string> = {
    Dashboard: "Intelligent monitoring and incident management",
    Incidents: "Review, investigate and resolve detected incidents",
    Monitoring: "Live service health and monitoring activity",
    Infrastructure: "Connected services and platform components",
    "Recovery History": "Historical recovery actions and outcomes",
  };

  const recentIncidents = useMemo(
    () => [...incidents].sort((a, b) => b.id - a.id).slice(0, 8),
    [incidents]
  );

  const closeDiagnosis = () => {
    setSelectedIncidentId(null);
    setSelectedDiagnosis(null);
    setDiagnosing(false);
  };

  const renderIncidents = (compact = false) => (
    <section className="panel incidents-panel">
      <div className="panel-header">
        <div>
          <div className="section-title-row">
            <h2>{compact ? "Recent Incidents" : "Incident History"}</h2>
            <span className="count-pill">{incidents.length} records</span>
          </div>
          <p>Incidents detected by NEXUS monitoring</p>
        </div>
        <button
          className="button button-secondary"
          onClick={() => void loadDashboard()}
          disabled={loading}
        >
          <RefreshCw size={15} className={loading ? "spin" : ""} />
          Refresh
        </button>
      </div>

      {incidents.length === 0 ? (
        <div className="empty-state">
          <CheckCircle2 size={34} />
          <h3>{loading ? "Loading incidents…" : "No incidents recorded"}</h3>
          <p>
            {loading
              ? "NEXUS is retrieving incident information."
              : "Newly detected incidents will appear here."}
          </p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
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
              {(compact ? recentIncidents : incidents).map((incident) => (
                <tr key={incident.id}>
                  <td className="id-cell">#{incident.id}</td>
                  <td className="incident-description-cell">
                    <strong>{incident.title}</strong>
                    <span className="description" title={incident.description}>
                      {incident.description}
                    </span>
                  </td>
                  <td>
                    <span className={`severity-badge ${getSeverityClass(incident.severity)}`}>
                      <span className="badge-dot" />
                      {incident.severity || "Unknown"}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${getStatusClass(incident.status)}`}>
                      {incident.status || "Unknown"}
                    </span>
                  </td>
                  <td className="date-cell">{formatDate(incident.created_at)}</td>
                  <td>
                    <div className="table-actions">
                      <button
                        className="icon-text-button"
                        onClick={() => void viewDiagnosis(incident.id)}
                        title="View AI diagnosis"
                      >
                        <Brain size={14} />
                        Diagnose
                      </button>
                      {incident.status?.toLowerCase() === "open" && (
                        <button
                          className="icon-text-button recover-button"
                          disabled={recoveryLoading}
                          onClick={() => void recoverIncident(incident.id)}
                        >
                          <Zap size={14} />
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
      {compact && incidents.length > recentIncidents.length && (
        <button className="text-link" onClick={() => setActivePage("Incidents")}>
          View all incidents <ChevronRight size={14} />
        </button>
      )}
    </section>
  );

  const renderRecoveryHistory = () => (
    <>
      <div className="stats-grid">
        <StatCard title="Total Recovery Attempts" value={totalRecoveries} icon={<History />} tone="blue" />
        <StatCard title="Successful Recoveries" value={successfulRecoveries} icon={<CheckCircle2 />} tone="green" />
        <StatCard title="Failed Recoveries" value={failedRecoveries} icon={<XCircle />} tone="red" />
        <StatCard title="Success Rate" value={`${successRate}%`} icon={<Activity />} tone="purple" />
      </div>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Recovery Activity</h2>
            <p>Persistent recovery records retrieved from the NEXUS database.</p>
          </div>
          <button
            className="button button-secondary"
            disabled={loading}
            onClick={() => void loadDashboard()}
          >
            <RefreshCw size={15} className={loading ? "spin" : ""} />
            Refresh History
          </button>
        </div>

        {recoveryLogs.length === 0 ? (
          <div className="empty-state">
            <History size={34} />
            <h3>No recovery records yet</h3>
            <p>Recovery attempts will appear here after NEXUS records them.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
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
                    <td className="id-cell">#{log.id}</td>
                    <td>Incident #{log.incident_id}</td>
                    <td>{log.diagnosis_engine ?? "Unknown"}</td>
                    <td>{log.recovery_action ?? "Unknown"}</td>
                    <td>
                      <span className={`status-badge ${getStatusClass(log.recovery_status)}`}>
                        {log.recovery_status}
                      </span>
                    </td>
                    <td>
                      {log.duration_seconds != null
                        ? `${Number(log.duration_seconds).toFixed(3)} s`
                        : "N/A"}
                    </td>
                    <td>
                      <span className={`status-badge ${getStatusClass(log.final_health)}`}>
                        {log.final_health ?? "Unknown"}
                      </span>
                    </td>
                    <td className="date-cell">{formatDate(log.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {recoveryLogs.length > 0 && (
        <section className="panel detail-panel">
          <div className="panel-header">
            <div>
              <h2>Detailed Recovery Reports</h2>
              <p>Diagnosis, root cause and recovery messages for each attempt.</p>
            </div>
          </div>
          <div className="recovery-list">
            {recoveryLogs.map((log) => (
              <article className="recovery-card" key={log.id}>
                <div className="recovery-card-heading">
                  <div>
                    <h3>Recovery Log #{log.id}</h3>
                    <p>Incident #{log.incident_id} · {formatDate(log.created_at)}</p>
                  </div>
                  <span className={`status-badge ${getStatusClass(log.recovery_status)}`}>
                    {log.recovery_status}
                  </span>
                </div>
                <DetailItem title="AI Diagnosis" value={log.diagnosis} />
                <DetailItem title="Root Cause" value={log.root_cause} />
                <DetailItem title="Recovery Message" value={log.recovery_message} />
                <div className="detail-metrics">
                  <MiniDetail title="Recovery Action" value={log.recovery_action ?? "Unknown"} />
                  <MiniDetail title="Diagnosis Engine" value={log.diagnosis_engine ?? "Unknown"} />
                  <MiniDetail title="Final Health" value={log.final_health ?? "Unknown"} />
                  <MiniDetail
                    title="Duration"
                    value={log.duration_seconds != null ? `${Number(log.duration_seconds).toFixed(3)} seconds` : "N/A"}
                  />
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </>
  );

  const renderHealthGrid = () => (
    <div className="health-grid">
      <HealthItem name="Backend API" detail={health?.status ?? "No response"} healthy={backendHealthy} icon={<Activity />} />
      <HealthItem
        name="Database"
        detail={backendHealthy ? "Connected (backend reported)" : "Not verified"}
        healthy={backendHealthy}
        icon={<Database />}
      />
      <HealthItem name="Incident Management" detail="Enabled" healthy icon={<ShieldCheck />} />
      <HealthItem name="Recovery History" detail={`${totalRecoveries} records loaded`} healthy icon={<History />} />
    </div>
  );

  const renderDiagnosis = () => {
    if (selectedIncidentId === null) return null;
    return (
      <div className="modal-backdrop" onClick={closeDiagnosis}>
        <section
          className="diagnosis-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="diagnosis-heading"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="modal-header">
            <div className="modal-title-icon"><Brain size={20} /></div>
            <div>
              <h2 id="diagnosis-heading">AI Diagnosis Report</h2>
              <p>Incident #{selectedIncidentId}</p>
            </div>
            <button className="close-button" onClick={closeDiagnosis} aria-label="Close diagnosis">
              <X size={19} />
            </button>
          </div>

          {diagnosing && (
            <div className="diagnosis-loading">
              <span className="loader" />
              Analysing incident with the diagnosis engine…
            </div>
          )}

          {selectedDiagnosis && (
            <>
              <div className="ai-engine-banner">
                <Sparkles size={17} />
                <span>
                  {selectedDiagnosis.diagnosis_engine ?? "NEXUS Diagnosis Engine"}
                </span>
                <span className="engine-status">
                  {selectedDiagnosis.ai_status ?? "Diagnosis received"}
                </span>
              </div>
              <DetailItem title="Diagnosis" value={selectedDiagnosis.diagnosis} />
              <DetailItem title="Root Cause" value={selectedDiagnosis.root_cause} />
              <DetailItem title="Recommended Action" value={selectedDiagnosis.recommendation} />
              <div className="detail-metrics diagnosis-metrics">
                <MiniDetail title="Severity" value={selectedDiagnosis.severity ?? "Unknown"} />
                <MiniDetail
                  title="Diagnosis Confidence"
                  value={selectedDiagnosis.confidence != null ? `${selectedDiagnosis.confidence}%` : "N/A"}
                />
                <MiniDetail title="Incident ID" value={`#${selectedIncidentId}`} />
              </div>
              <p className="diagnosed-at">
                <Clock3 size={14} />
                Diagnosed at: {formatDate(selectedDiagnosis.diagnosed_at)}
              </p>
            </>
          )}
        </section>
      </div>
    );
  };

  return (
    <div className="app-shell">
      {mobileNavOpen && (
        <button
          className="mobile-nav-backdrop"
          aria-label="Close navigation"
          onClick={() => setMobileNavOpen(false)}
        />
      )}
      <aside className={`sidebar ${mobileNavOpen ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark"><ShieldCheck size={23} /></div>
          <div className="brand-copy">
            <h2>NEXUS</h2>
            <span>INTELLIGENT OPERATIONS</span>
          </div>
          <button className="mobile-close" onClick={() => setMobileNavOpen(false)} aria-label="Close menu">
            <X size={18} />
          </button>
        </div>

        <div className="sidebar-section-label">WORKSPACE</div>
        <nav className="navigation">
          {navigation.map(({ page, icon: Icon }) => (
            <button
              key={page}
              className={`nav-item ${activePage === page ? "active" : ""}`}
              onClick={() => {
                setActivePage(page);
                setMobileNavOpen(false);
              }}
            >
              <Icon size={18} />
              <span>{page}</span>
              {activePage === page && <span className="nav-active-indicator" />}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-connection">
            <span className={`connection-dot ${backendHealthy ? "online" : "offline"}`} />
            <div>
              <strong>{backendHealthy ? "Backend connected" : "Backend unavailable"}</strong>
              <span>System connection</span>
            </div>
          </div>
          <div className="sidebar-version">
            <span>NEXUS Platform</span>
            <span>Version 1.0</span>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="topbar-heading">
            <button className="mobile-menu" onClick={() => setMobileNavOpen(true)} aria-label="Open navigation">
              <span />
              <span />
              <span />
            </button>
            <div>
              <div className="eyebrow">NEXUS / WORKSPACE</div>
              <h1>{activePage}</h1>
              <p>{pageDescription[activePage]}</p>
            </div>
          </div>
          <div className="topbar-actions">
            <div className="last-updated">
              <span className="live-dot" />
              <span>Updated {lastUpdated || "Loading…"}</span>
            </div>
            <button className="button button-primary" onClick={() => void runHealthCheck()} disabled={checking}>
              <RefreshCw size={15} className={checking ? "spin" : ""} />
              {checking ? "Checking…" : "Run Health Check"}
            </button>
          </div>
        </header>

        {error && (
          <div className="error-banner">
            <AlertTriangle size={18} />
            <span>{error}</span>
            <button onClick={() => setError("")} aria-label="Dismiss error"><X size={16} /></button>
          </div>
        )}

        {activePage === "Dashboard" && (
          <>
            <section className="welcome-panel">
              <div className="welcome-content">
                <div className="welcome-tag"><Sparkles size={14} /> INTELLIGENT OPERATIONS PLATFORM</div>
                <h2>Good to see you. Welcome to NEXUS.</h2>
                <p>Monitor services, identify incidents and use AI-powered diagnosis to understand failures.</p>
                <div className="welcome-status">
                  <span className={`connection-dot ${backendHealthy ? "online" : "offline"}`} />
                  {backendHealthy ? "All core platform services responding" : "Backend connection needs attention"}
                </div>
              </div>
              <div className="welcome-art" aria-hidden="true">
                <div className="art-orbit orbit-one" />
                <div className="art-orbit orbit-two" />
                <div className="art-core"><Activity size={35} /></div>
                <div className="art-spark spark-one"><Zap size={16} /></div>
                <div className="art-spark spark-two"><ShieldCheck size={18} /></div>
              </div>
            </section>

            <div className="section-heading">
              <div>
                <h2>Platform Overview</h2>
                <p>Key operational metrics at a glance</p>
              </div>
              <span className="refresh-interval"><span className="live-dot" /> Auto-refresh · 10 seconds</span>
            </div>

            <div className="stats-grid">
              <StatCard title="Total Incidents" value={totalIncidents} icon={<AlertCircle />} tone="blue" note="All recorded events" />
              <StatCard title="Open Incidents" value={openIncidents} icon={<Clock3 />} tone="orange" note="Require attention" />
              <StatCard title="High Severity" value={highIncidents} icon={<AlertTriangle />} tone="red" note="High and critical" />
              <StatCard title="Successful Recoveries" value={successfulRecoveries} icon={<CheckCircle2 />} tone="green" note="Recorded successes" />
            </div>

            <div className="dashboard-grid">
              <section className="panel health-panel">
                <div className="panel-header">
                  <div>
                    <h2>System Health Overview</h2>
                    <p>Current status of core NEXUS components</p>
                  </div>
                  <div className="panel-header-icon"><Gauge size={19} /></div>
                </div>
                {renderHealthGrid()}
              </section>

              <section className="panel demo-panel">
                <div className="panel-header">
                  <div>
                    <h2>Demo Application</h2>
                    <p>Monitored application endpoint</p>
                  </div>
                  <div className="panel-header-icon"><Monitor size={19} /></div>
                </div>
                <div className="demo-status-card">
                  <div className="demo-app-icon"><Server size={21} /></div>
                  <div className="demo-app-copy">
                    <strong>Demo Service</strong>
                    <span>Docker · Port 8000</span>
                  </div>
                  <span className={`status-badge ${demoHealthy ? "success" : "danger"}`}>
                    {demoHealthy ? "Healthy" : "Unhealthy"}
                  </span>
                </div>
                <p className="demo-description">
                  {demoHealthy
                    ? "The demo application is responding to NEXUS health checks."
                    : "The demo application is currently unhealthy or unavailable. Check the latest incident details."}
                </p>
                <button className="button button-secondary full-width" onClick={() => void runHealthCheck()} disabled={checking}>
                  <RefreshCw size={15} className={checking ? "spin" : ""} />
                  {checking ? "Checking…" : "Check application health"}
                </button>
              </section>
            </div>

            {renderIncidents(true)}
          </>
        )}

        {activePage === "Incidents" && renderIncidents()}

        {activePage === "Monitoring" && (
          <>
            <section className="page-intro-panel">
              <div className="intro-icon"><Activity size={23} /></div>
              <div>
                <h2>Live Monitoring</h2>
                <p>NEXUS refreshes platform status and incident information automatically every 10 seconds.</p>
              </div>
              <span className="monitoring-live"><span className="live-dot" /> Monitoring active</span>
            </section>
            <section className="panel page-panel">
              <div className="panel-header">
                <div><h2>Monitoring Services</h2><p>Health status and monitoring capabilities</p></div>
              </div>
              <div className="health-grid monitoring-grid">
                <HealthItem name="Backend Health Monitoring" healthy={backendHealthy} detail={backendHealthy ? "Backend is responding" : "Backend unavailable"} icon={<Activity />} />
                <HealthItem name="Demo Application Monitoring" healthy={demoHealthy} detail={demoHealthy ? "Demo application is healthy" : "Demo application is unhealthy or unavailable"} icon={<Monitor />} />
                <HealthItem name="Automatic Refresh" healthy detail="Every 10 seconds" icon={<RefreshCw />} />
                <HealthItem name="Manual Health Check" healthy detail="Available on demand" icon={<CheckCircle2 />} />
              </div>
              <div className="monitoring-action">
                <div><strong>Run a new monitoring check</strong><span>Request an immediate health check from the backend.</span></div>
                <button className="button button-primary" onClick={() => void runHealthCheck()} disabled={checking}>
                  <RefreshCw size={15} className={checking ? "spin" : ""} />
                  {checking ? "Checking…" : "Run Monitoring Check"}
                </button>
              </div>
            </section>
          </>
        )}

        {activePage === "Infrastructure" && (
          <>
            <section className="page-intro-panel">
              <div className="intro-icon"><Server size={23} /></div>
              <div>
                <h2>Infrastructure Overview</h2>
                <p>Services and application components that make up your NEXUS environment.</p>
              </div>
            </section>
            <section className="panel page-panel">
              <div className="panel-header">
                <div><h2>Platform Components</h2><p>Configured services and connection status</p></div>
              </div>
              <div className="infrastructure-list">
                <InfrastructureItem name="NEXUS Backend API" description="FastAPI service · Port 8001" healthy={backendHealthy} icon={<Activity />} />
                <InfrastructureItem name="Database" description="Backend database connection" healthy={backendHealthy} icon={<Database />} />
                <InfrastructureItem name="Demo Application" description="Monitored application · Port 8000" healthy={demoHealthy} icon={<Monitor />} />
                <InfrastructureItem name="NEXUS Frontend" description="React + Vite interface · Port 5173" healthy icon={<LayoutDashboard />} />
              </div>
            </section>
          </>
        )}

        {activePage === "Recovery History" && renderRecoveryHistory()}

        <footer className="app-footer">
          <span><Activity size={14} /> NEXUS Intelligent Monitoring Platform</span>
          <span><Zap size={14} /> Live monitoring enabled</span>
          <span>Version 1.0</span>
        </footer>
      </main>

      {renderDiagnosis()}
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  tone,
  note,
}: {
  title: string;
  value: string | number;
  icon: ReactNode;
  tone: "blue" | "orange" | "red" | "green" | "purple";
  note?: string;
}) {
  return (
    <article className="stat-card">
      <div className="stat-card-top">
        <span className={`stat-icon ${tone}`}>{icon}</span>
        <span className="stat-card-accent"><Activity size={15} /></span>
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-title">{title}</div>
      {note && <div className="stat-note">{note}</div>}
    </article>
  );
}

function HealthItem({
  name,
  healthy,
  detail,
  icon,
}: {
  name: string;
  healthy: boolean;
  detail: string;
  icon: ReactNode;
}) {
  return (
    <div className="health-item">
      <div className="health-item-icon">{icon}</div>
      <div className="health-item-copy">
        <strong>{name}</strong>
        <span>{detail}</span>
      </div>
      <span className={`health-check ${healthy ? "healthy" : "unhealthy"}`}>
        {healthy ? <CheckCircle2 size={17} /> : <AlertCircle size={17} />}
      </span>
    </div>
  );
}

function DetailItem({ title, value }: { title: string; value?: string }) {
  return (
    <div className="detail-item">
      <h3>{title}</h3>
      <p>{value || "No information provided."}</p>
    </div>
  );
}

function MiniDetail({ title, value }: { title: string; value: string }) {
  return (
    <div className="mini-detail">
      <span>{title}</span>
      <strong>{value}</strong>
    </div>
  );
}

function InfrastructureItem({
  name,
  description,
  healthy,
  icon,
}: {
  name: string;
  description: string;
  healthy: boolean;
  icon: ReactNode;
}) {
  return (
    <div className="infrastructure-item">
      <div className="infrastructure-icon">{icon}</div>
      <div className="infrastructure-copy">
        <strong>{name}</strong>
        <span>{description}</span>
      </div>
      <span className={`status-badge ${healthy ? "success" : "danger"}`}>
        <span className="badge-dot" />
        {healthy ? "Connected" : "Unavailable"}
      </span>
    </div>
  );
}

export default App;
