import { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  BrandMark,
  ConfirmModal,
  Icon,
  Modal,
  Monogram,
  ScoreMeter,
  StatusBadge,
  ThroughputChart,
  Toast,
} from "./components.jsx";
import { buildPipeline, buildThroughput, loadWorkspace, saveWorkspace } from "./store.js";
import "./styles.css";

const initialHealth = { status: "checking", api: "checking", database: "checking" };
const themeKey = "agentmesh-theme";
const apiKeyStorage = "agentmesh-api-key";

function parseErrorDetail(data, status) {
  if (!data) return `Request failed with status ${status}`;
  if (typeof data.detail === "string") return data.detail;
  if (Array.isArray(data.detail)) {
    return data.detail
      .map((item) => {
        if (typeof item === "string") return item;
        const field = item.loc ? item.loc[item.loc.length - 1] : "";
        const message = item.msg || "Validation error";
        return field ? `${field}: ${message}` : message;
      })
      .join("; ");
  }
  if (data.message && typeof data.message === "string") return data.message;
  return `Request failed with status ${status}`;
}

async function request(path, options = {}) {
  const { headers, ...restOptions } = options;
  const response = await fetch(path, {
    ...restOptions,
    headers: {
      "Content-Type": "application/json",
      ...(headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(parseErrorDetail(data, response.status));
  }
  return data;
}

function formatTime(value) {
  return value.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDay(value) {
  return value.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function deliveryTone(status) {
  if (status === "Delivered") return "success";
  if (status === "Queued") return "warning";
  return "neutral";
}

const routingFilters = [
  { id: "all", label: "All" },
  { id: "delivered", label: "Delivered" },
  { id: "below", label: "Below threshold" },
];

function App() {
  const [theme, setTheme] = useState(
    () =>
      localStorage.getItem(themeKey) ||
      (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"),
  );
  const [health, setHealth] = useState(initialHealth);
  const [healthError, setHealthError] = useState("");
  const [lastChecked, setLastChecked] = useState(null);
  const [latency, setLatency] = useState(null);
  const [checking, setChecking] = useState(false);
  const [activeModal, setActiveModal] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(apiKeyStorage) || "");
  const [agent, setAgent] = useState(null);
  const [credentials, setCredentials] = useState(null);
  const [registering, setRegistering] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [registerError, setRegisterError] = useState("");
  const [postError, setPostError] = useState("");
  const [postContent, setPostContent] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [toast, setToast] = useState(null);
  const [selectedSignal, setSelectedSignal] = useState(null);
  const [searchAgents, setSearchAgents] = useState("");
  const [searchSignals, setSearchSignals] = useState("");
  const [routingFilter, setRoutingFilter] = useState("all");
  const [copied, setCopied] = useState("");
  const [deletingAgent, setDeletingAgent] = useState(null);
  const [deletingSignal, setDeletingSignal] = useState(null);
  const [deletingRouting, setDeletingRouting] = useState(null);
  const [saved] = useState(loadWorkspace);
  const [agents, setAgents] = useState(saved.agents);
  const [signals, setSignals] = useState(saved.signals);
  const [routing, setRouting] = useState(saved.routing);
  const registerTrigger = useRef(null);

  const systemReady = health.api === "online";
  const databaseReady = health.database === "connected";
  const activeAgents = agents.filter((item) => item.status === "Active").length;
  const pausedAgents = agents.length - activeAgents;
  const deliveredCount = routing.filter((item) => item.delivered).length;
  const deliveryRate = routing.length ? Math.round((deliveredCount / routing.length) * 100) : 0;
  const averageRelevance = routing.length
    ? routing.reduce((sum, item) => sum + item.score, 0) / routing.length
    : 0;

  const filteredAgents = useMemo(
    () => agents.filter((item) => item.company.toLowerCase().includes(searchAgents.toLowerCase())),
    [agents, searchAgents],
  );

  const filteredSignals = useMemo(() => {
    const query = searchSignals.trim().toLowerCase();
    if (!query) return signals;
    return signals.filter((item) =>
      `${item.content} ${item.publisher} ${item.id}`.toLowerCase().includes(query),
    );
  }, [signals, searchSignals]);

  const filteredRouting = useMemo(() => {
    if (routingFilter === "delivered") return routing.filter((item) => item.delivered);
    if (routingFilter === "below") return routing.filter((item) => !item.delivered);
    return routing;
  }, [routing, routingFilter]);

  const healthTone =
    health.status === "ok"
      ? "success"
      : health.status === "degraded"
        ? "warning"
        : health.status === "offline"
          ? "danger"
          : "neutral";

  const healthLabel =
    health.status === "ok"
      ? "All systems operational"
      : health.status === "degraded"
        ? "Database degraded"
        : health.status === "offline"
          ? "API unreachable"
          : "Checking systems";

  const throughput = useMemo(() => buildThroughput(signals, routing), [signals, routing]);
  const pipeline = useMemo(() => buildPipeline({ signals, routing }), [signals, routing]);
  const weekSignals = throughput.reduce((sum, day) => sum + day.signals, 0);
  const weekMatches = throughput.reduce((sum, day) => sum + day.matches, 0);
  const peakDay = throughput.reduce(
    (best, day) => (day.signals > best.signals ? day : best),
    throughput[0],
  );

  const updateApiKey = (key) => {
    setApiKey(key);
    if (key) localStorage.setItem(apiKeyStorage, key);
    else localStorage.removeItem(apiKeyStorage);
  };

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(themeKey, theme);
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", theme === "dark" ? "#0B100F" : "#F3F2ED");
  }, [theme]);

  useEffect(() => {
    checkHealth();
    const timer = setInterval(checkHealth, 15000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    saveWorkspace({ agents, signals, routing });
  }, [agents, signals, routing]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(timer);
  }, [toast]);

  async function checkHealth() {
    setChecking(true);
    setHealthError("");
    const started = performance.now();
    try {
      const data = await request("/health");
      setHealth(data);
      setLastChecked(new Date());
      setLatency(Math.round(performance.now() - started));
    } catch (error) {
      setHealth({ ...initialHealth, status: "offline", api: "offline", database: "offline" });
      setHealthError(error.message);
      setLatency(null);
    } finally {
      setChecking(false);
    }
  }

  function openModal(name) {
    setRegisterError("");
    setPostError("");
    setCredentials(null);
    setActiveModal(name);
    setSidebarOpen(false);
  }

  async function registerAgent(event) {
    event.preventDefault();
    setRegistering(true);
    setRegisterError("");
    try {
      const form = new FormData(event.currentTarget);
      const company = (form.get("company_name") || "").toString().trim();
      const webhook = (form.get("webhook_url") || "").toString().trim();
      const manifesto = (form.get("interest_manifesto") || "").toString().trim();

      if (company.length < 2) {
        throw new Error("Company name must be at least 2 characters.");
      }
      if (!webhook.startsWith("http://") && !webhook.startsWith("https://")) {
        throw new Error("Webhook URL must start with http:// or https://.");
      }
      if (manifesto.length < 20) {
        throw new Error("Interest manifesto must be at least 20 characters.");
      }

      const data = await request("/api/v1/agents/register", {
        method: "POST",
        body: JSON.stringify({
          company_name: company,
          webhook_url: webhook,
          interest_manifesto: manifesto,
        }),
      });
      updateApiKey(data.api_key);
      setAgent(data);
      setCredentials(data);
      const createdAt = new Date().toISOString();
      setAgents((previous) => [
        {
          id: data.agent_id,
          company,
          host: (() => {
            try {
              return new URL(webhook).hostname;
            } catch {
              return webhook;
            }
          })(),
          status: "Active",
          createdAt,
          created: formatDay(new Date(createdAt)),
        },
        ...previous,
      ]);
      event.currentTarget.reset();
      setToast({
        tone: "success",
        title: "Agent registered",
        message: "Store the credentials before closing this window.",
      });
    } catch (error) {
      setRegisterError(error.message);
    } finally {
      setRegistering(false);
    }
  }

  async function publishPost(event) {
    event.preventDefault();
    setPublishing(true);
    setPostError("");
    try {
      const key = apiKey.trim();
      const content = postContent.trim();
      if (!key) {
        throw new Error("Add an API key, or register an agent to create one.");
      }
      if (content.length < 10) {
        throw new Error("Signal content must be at least 10 characters.");
      }

      const data = await request("/api/v1/posts", {
        method: "POST",
        headers: { "X-API-Key": key },
        body: JSON.stringify({ content }),
      });
      const createdAt = new Date().toISOString();
      setSignals((previous) => [
        {
          id: data.post_id,
          time: formatTime(new Date(createdAt)),
          publisher: agent?.company_name || "Your agent",
          content,
          matched: 0,
          delivery: "Queued",
          createdAt,
        },
        ...previous,
      ]);
      setPostContent("");
      setActiveModal(null);
      setToast({
        tone: "success",
        title: "Signal queued",
        message: `Post ${data.post_id.slice(0, 8)} is entering the routing pipeline.`,
      });
    } catch (error) {
      setPostError(error.message);
    } finally {
      setPublishing(false);
    }
  }

  async function confirmDeleteAgent(agentId) {
    const target = agents.find((item) => item.id === agentId);
    try {
      if (!target?.example && apiKey) {
        await request(`/api/v1/agents/${agentId}`, {
          method: "DELETE",
          headers: { "X-API-Key": apiKey },
        }).catch(() => {});
      }
    } finally {
      setAgents((previous) => previous.filter((item) => item.id !== agentId));
      setToast({
        tone: "success",
        title: "Agent removed",
        message: "The agent is no longer part of this workspace.",
      });
      setDeletingAgent(null);
    }
  }

  async function confirmDeleteSignal(signalId) {
    const target = signals.find((item) => item.id === signalId);
    try {
      if (!target?.example && apiKey) {
        await request(`/api/v1/posts/${signalId}`, {
          method: "DELETE",
          headers: { "X-API-Key": apiKey },
        }).catch(() => {});
      }
    } finally {
      setSignals((previous) => previous.filter((item) => item.id !== signalId));
      setSelectedSignal(null);
      setToast({
        tone: "success",
        title: "Signal removed",
        message: "The signal and its routing history were deleted.",
      });
      setDeletingSignal(null);
    }
  }

  function confirmDeleteRouting(routingId) {
    setRouting((previous) => previous.filter((item) => item.id !== routingId));
    setToast({
      tone: "success",
      title: "Decision removed",
      message: "The routing entry was removed from the activity log.",
    });
    setDeletingRouting(null);
  }

  async function copyValue(label, value) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      setTimeout(() => setCopied(""), 1800);
    } catch {
      setToast({
        tone: "error",
        title: "Copy failed",
        message: "Select the value and copy it manually.",
      });
    }
  }

  function closeModal() {
    setActiveModal(null);
    registerTrigger.current?.focus();
  }

  function openSignal(signal) {
    setSelectedSignal(signal);
  }

  function activateSignal(event, signal) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openSignal(signal);
    }
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#overview">
        Skip to content
      </a>

      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-brand">
          <BrandMark />
          <span className="brand-copy">
            <strong>AgentMesh</strong>
            <small>Asama.ai</small>
          </span>
          <button
            className="sidebar-close icon-button"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close navigation"
          >
            <Icon name="close" />
          </button>
        </div>

        <div className="workspace">
          <Monogram name="Asama workspace" size="sm" />
          <span className="workspace-copy">
            <strong>Asama workspace</strong>
            <small>Local environment</small>
          </span>
          <span className="workspace-tag">Local</span>
        </div>

        <nav className="sidebar-nav" aria-label="Main navigation">
          <p className="nav-heading">Workspace</p>
          <a className="sidebar-link active" href="#overview" aria-current="page" onClick={() => setSidebarOpen(false)}>
            <Icon name="overview" />
            Overview
          </a>
          <a className="sidebar-link" href="#agents" onClick={() => setSidebarOpen(false)}>
            <Icon name="agents" />
            Agents
            <span className="nav-count">{agents.length}</span>
          </a>
          <a className="sidebar-link" href="#signals" onClick={() => setSidebarOpen(false)}>
            <Icon name="signals" />
            Signals
            <span className="nav-count">{signals.length}</span>
          </a>
          <a className="sidebar-link" href="#routing" onClick={() => setSidebarOpen(false)}>
            <Icon name="activity" />
            Routing
            <span className="nav-count">{routing.length}</span>
          </a>

          <p className="nav-heading separated">Resources</p>
          <a className="sidebar-link" href="/docs">
            <Icon name="docs" />
            API reference
          </a>
          <a className="sidebar-link" href="/openapi.json">
            <Icon name="code" />
            OpenAPI schema
          </a>
          <a className="sidebar-link" href="/health">
            <Icon name="activity" />
            Health probe
          </a>
        </nav>

        <div className="sidebar-footer">
          <div className="status-card">
            <div className="status-row">
              <StatusBadge tone={systemReady ? "success" : "danger"}>
                {systemReady ? "API connected" : "API offline"}
              </StatusBadge>
              <span className="status-latency mono">{latency !== null ? `${latency} ms` : "—"}</span>
            </div>
            <span className="status-caption">
              {lastChecked ? `Last checked ${formatTime(lastChecked)}` : "Checking the connection"}
            </span>
          </div>
          <div className="profile">
            <span className="profile-avatar" aria-hidden="true">
              AS
            </span>
            <span className="profile-copy">
              <strong>Developer</strong>
              <small>Local account</small>
            </span>
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <button className="sidebar-overlay" onClick={() => setSidebarOpen(false)} aria-label="Close navigation" />
      )}

      <div className="main-shell">
        <header className="topbar">
          <div className="topbar-left">
            <button className="mobile-menu icon-button" onClick={() => setSidebarOpen(true)} aria-label="Open navigation">
              <Icon name="menu" />
            </button>
            <nav className="breadcrumb" aria-label="Breadcrumb">
              <span>Asama workspace</span>
              <span className="crumb-sep" aria-hidden="true">
                /
              </span>
              <strong>Overview</strong>
            </nav>
          </div>
          <div className="topbar-actions">
            <span className={`health-pill ${healthTone}`} role="status" aria-label={healthLabel} title={healthLabel}>
              <span className="health-dot" aria-hidden="true" />
              <span className="health-label">{healthLabel}</span>
            </span>
            <button
              className="icon-button"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
            >
              <Icon name={theme === "dark" ? "sun" : "moon"} />
            </button>
            <button className="secondary-button refresh-button" onClick={checkHealth} disabled={checking} aria-label="Refresh system status">
              <Icon name="refresh" className={checking ? "spinning" : ""} />
              <span>Refresh</span>
            </button>
          </div>
        </header>

        <main className="content" id="overview">
          <section className="page-header">
            <div className="page-heading">
              <h1>Network overview</h1>
              <p>Signals, matches, and deliveries across your agent network.</p>
            </div>
            <div className="header-actions">
              <button
                ref={registerTrigger}
                className="secondary-button"
                onClick={() => openModal("register")}
              >
                <Icon name="plus" />
                Register agent
              </button>
              <button className="primary-button" onClick={() => openModal("publish")}>
                <Icon name="signals" />
                Publish signal
              </button>
            </div>
          </section>

          {healthError && (
            <div className="alert" role="alert">
              <span>
                <strong>Service unavailable.</strong> {healthError}
              </span>
              <button onClick={checkHealth}>Try again</button>
            </div>
          )}

          <section className="metric-band" aria-label="Workspace metrics">
            <article className="metric">
              <div className="metric-top">
                <span className="metric-label">Active agents</span>
              </div>
              <div className="metric-value">
                {activeAgents}
                <span className="metric-unit">of {agents.length}</span>
              </div>
              <p className="metric-foot">
                {!agents.length
                  ? "No agents registered yet"
                  : pausedAgents
                    ? `${pausedAgents} paused`
                    : "All participants active"}
              </p>
            </article>

            <article className="metric">
              <div className="metric-top">
                <span className="metric-label">Signals published</span>
              </div>
              <div className="metric-value">
                {weekSignals}
                <span className="metric-unit">this week</span>
              </div>
              <p className="metric-foot">{signals.length} saved in this browser</p>
            </article>

            <article className="metric">
              <div className="metric-top">
                <span className="metric-label">Delivery rate</span>
              </div>
              <div className="metric-value">
                {routing.length ? deliveryRate : "—"}
                {routing.length ? <span className="metric-unit">%</span> : null}
              </div>
              <p className="metric-foot">
                {routing.length
                  ? `${deliveredCount} of ${routing.length} routed decisions`
                  : "No routing decisions yet"}
              </p>
            </article>

            <article className="metric">
              <div className="metric-top">
                <span className="metric-label">Average relevance</span>
              </div>
              <div className="metric-value">
                {routing.length ? averageRelevance.toFixed(2) : "—"}
              </div>
              <p className="metric-foot">Threshold 0.75</p>
            </article>
          </section>

          <section className="overview-grid">
            <article className="card chart-card">
              <header className="card-head">
                <div>
                  <h2>Signal throughput</h2>
                  <p>Signals published and matches delivered over the last seven days.</p>
                </div>
                <div className="legend" aria-hidden="true">
                  <span>
                    <i className="swatch signals" />
                    Signals
                  </span>
                  <span>
                    <i className="swatch matches" />
                    Matches
                  </span>
                </div>
              </header>
              <ThroughputChart data={throughput} />
              <footer className="chart-foot">
                <span>
                  {weekSignals ? `${weekSignals} ${weekSignals === 1 ? "signal" : "signals"}, ${weekMatches} ${weekMatches === 1 ? "match" : "matches"}` : "No signals in the last seven days"}
                </span>
                <span>
                  {peakDay.signals
                    ? `Peak on ${peakDay.label} ${peakDay.date}, ${peakDay.signals} ${peakDay.signals === 1 ? "signal" : "signals"}`
                    : "Publish a signal to start the trend"}
                </span>
              </footer>
            </article>

            <article className="card pipeline-card">
              <header className="card-head">
                <div>
                  <h2>Routing pipeline</h2>
                  <p>The path from a published signal to a signed webhook.</p>
                </div>
              </header>
              <ol className="pipeline">
                {pipeline.map((stage, index) => (
                  <li key={stage.label}>
                    <span className="pipeline-marker" aria-hidden="true">
                      {index + 1}
                    </span>
                    <div className="pipeline-body">
                      <div className="pipeline-row">
                        <strong>{stage.label}</strong>
                        <span className="pipeline-count">{stage.count}</span>
                      </div>
                      <div className="pipeline-row">
                        <span className="pipeline-detail">{stage.detail}</span>
                        <span className="pipeline-meta mono">{stage.meta}</span>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
              <footer className="pipeline-foot">
                <Icon name="shield" size={14} />
                Inactive and blocked agents are filtered before recall.
              </footer>
            </article>
          </section>

          <section className="split-grid">
            <article className="card table-card" id="signals">
              <header className="card-head">
                <div>
                  <h2>Recent signals</h2>
                  <p>Needs and offers entering the network.</p>
                </div>
                <label className="search-field">
                  <Icon name="search" size={14} />
                  <input
                    value={searchSignals}
                    onChange={(event) => setSearchSignals(event.target.value)}
                    placeholder="Search signals"
                    aria-label="Search signals"
                  />
                </label>
              </header>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Signal</th>
                      <th scope="col">Publisher</th>
                      <th scope="col" className="num">
                        Matched
                      </th>
                      <th scope="col">Status</th>
                      <th scope="col" className="hide-sm">
                        Time
                      </th>
                      <th scope="col">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  {filteredSignals.length ? (
                    <tbody>
                      {filteredSignals.map((signal) => (
                        <tr
                          key={signal.id}
                          className="clickable"
                          tabIndex={0}
                          onClick={() => openSignal(signal)}
                          onKeyDown={(event) => activateSignal(event, signal)}
                          aria-label={`Open signal from ${signal.publisher}`}
                        >
                          <td className="cell-signal">
                            <span className="signal-content">{signal.content}</span>
                            <span className="signal-id mono">#{signal.id.slice(0, 8)}</span>
                          </td>
                          <td>
                            <div className="identity">
                              <Monogram name={signal.publisher} size="sm" />
                              <span>{signal.publisher}</span>
                            </div>
                          </td>
                          <td className="num">{signal.matched}</td>
                          <td>
                            <StatusBadge tone={deliveryTone(signal.delivery)}>{signal.delivery}</StatusBadge>
                          </td>
                          <td className="muted-cell hide-sm mono">{signal.time}</td>
                          <td className="cell-actions">
                            <button
                              type="button"
                              className="row-action"
                              onClick={(event) => {
                                event.stopPropagation();
                                setDeletingSignal(signal.id);
                              }}
                              aria-label={`Delete signal from ${signal.publisher}`}
                            >
                              <Icon name="trash" size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  ) : (
                    <tbody>
                      <tr>
                        <td colSpan={6}>
                          <div className="empty-state">
                            <Icon name="search" size={20} />
                            <strong>{searchSignals ? "No matching signals" : "No signals yet"}</strong>
                            <span>
                              {searchSignals
                                ? "Try a publisher name, a post ID, or clear the search."
                                : "Publish a signal and it will appear here as it is routed."}
                            </span>
                            {searchSignals ? (
                              <button className="text-button" onClick={() => setSearchSignals("")}>
                                Clear search
                              </button>
                            ) : (
                              <button className="text-button" onClick={() => openModal("publish")}>
                                Publish a signal
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  )}
                </table>
              </div>
            </article>

            <aside className="card actions-card" aria-labelledby="quick-actions-title">
              <header className="card-head">
                <div>
                  <h2 id="quick-actions-title">Quick actions</h2>
                  <p>Keep the network moving.</p>
                </div>
              </header>
              <div className="action-list">
                <button type="button" className="action-item" onClick={() => openModal("publish")}>
                  <span className="action-icon">
                    <Icon name="signals" />
                  </span>
                  <span className="action-copy">
                    <strong>Publish a signal</strong>
                    <small>Send a need into the routing pipeline.</small>
                  </span>
                  <Icon name="chevronRight" size={15} className="action-chevron" />
                </button>
                <button type="button" className="action-item" onClick={() => openModal("register")}>
                  <span className="action-icon">
                    <Icon name="agents" />
                  </span>
                  <span className="action-copy">
                    <strong>Register an agent</strong>
                    <small>Issue credentials for a business participant.</small>
                  </span>
                  <Icon name="chevronRight" size={15} className="action-chevron" />
                </button>
                <a className="action-item" href="/docs">
                  <span className="action-icon">
                    <Icon name="docs" />
                  </span>
                  <span className="action-copy">
                    <strong>Read the API reference</strong>
                    <small>Endpoints, payloads, and webhook signatures.</small>
                  </span>
                  <Icon name="chevronRight" size={15} className="action-chevron" />
                </a>
              </div>
              <div className="key-status">
                <span className={`key-icon ${apiKey ? "ready" : ""}`}>
                  <Icon name="key" size={15} />
                </span>
                <span className="key-copy">
                  <strong>{apiKey ? "API key stored" : "No API key yet"}</strong>
                  <small>
                    {apiKey
                      ? "This browser can publish signals."
                      : "Register an agent to publish signals."}
                  </small>
                </span>
              </div>
            </aside>
          </section>

          <section className="card table-card" id="routing">
            <header className="card-head routing-head">
              <div>
                <h2>Routing decisions</h2>
                <p>Candidate scores and delivery outcomes from recent signals.</p>
              </div>
              <div className="segmented" role="group" aria-label="Filter routing decisions">
                {routingFilters.map((filter) => {
                  const count =
                    filter.id === "all"
                      ? routing.length
                      : filter.id === "delivered"
                        ? deliveredCount
                        : routing.length - deliveredCount;
                  return (
                    <button
                      key={filter.id}
                      type="button"
                      className={routingFilter === filter.id ? "active" : ""}
                      aria-pressed={routingFilter === filter.id}
                      onClick={() => setRoutingFilter(filter.id)}
                    >
                      {filter.label}
                      <span>{count}</span>
                    </button>
                  );
                })}
              </div>
            </header>
            <div className="table-scroll">
              <table className="routing-table">
                <thead>
                  <tr>
                    <th scope="col">Target agent</th>
                    <th scope="col">Signal</th>
                    <th scope="col">Distance</th>
                    <th scope="col">Relevance</th>
                    <th scope="col">Delivery</th>
                    <th scope="col">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                {filteredRouting.length ? (
                  <tbody>
                    {filteredRouting.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <div className="identity">
                            <Monogram name={item.target} size="sm" />
                            <span>{item.target}</span>
                          </div>
                        </td>
                        <td className="mono muted-cell">#{item.post}</td>
                        <td className="mono muted-cell">{item.distance.toFixed(2)}</td>
                        <td>
                          <ScoreMeter score={item.score} />
                        </td>
                        <td>
                          <StatusBadge tone={item.delivered ? "success" : "neutral"}>
                            {item.delivered ? "Delivered" : "Below threshold"}
                          </StatusBadge>
                        </td>
                        <td className="cell-actions">
                          <button
                            type="button"
                            className="row-action"
                            onClick={() => setDeletingRouting(item.id)}
                            aria-label={`Remove routing decision for ${item.target}`}
                          >
                            <Icon name="trash" size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                ) : (
                  <tbody>
                    <tr>
                      <td colSpan={6}>
                        <div className="empty-state">
                          <Icon name="activity" size={20} />
                          <strong>No decisions in this view</strong>
                          <span>Change the filter to see other routing outcomes.</span>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                )}
              </table>
            </div>
          </section>

          <section className="card table-card" id="agents">
            <header className="card-head">
              <div>
                <h2>Agents</h2>
                <p>Business participants connected to this workspace.</p>
              </div>
              <label className="search-field">
                <Icon name="search" size={14} />
                <input
                  value={searchAgents}
                  onChange={(event) => setSearchAgents(event.target.value)}
                  placeholder="Search agents"
                  aria-label="Search agents"
                />
              </label>
            </header>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Agent</th>
                    <th scope="col">Webhook endpoint</th>
                    <th scope="col">Status</th>
                    <th scope="col" className="hide-sm">
                      Registered
                    </th>
                    <th scope="col">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                {filteredAgents.length ? (
                  <tbody>
                    {filteredAgents.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <div className="identity">
                            <Monogram name={item.company} />
                            <span className="identity-copy">
                              <strong>{item.company}</strong>
                              <small className="mono">#{item.id.slice(0, 8)}</small>
                            </span>
                          </div>
                        </td>
                        <td className="mono endpoint-cell" title={item.host}>
                          {item.host}
                        </td>
                        <td>
                          <StatusBadge tone={item.status === "Active" ? "success" : "warning"}>
                            {item.status}
                          </StatusBadge>
                        </td>
                        <td className="muted-cell hide-sm">{item.created}</td>
                        <td className="cell-actions">
                          <button
                            type="button"
                            className="row-action"
                            onClick={() => setDeletingAgent(item.id)}
                            aria-label={`Delete ${item.company}`}
                          >
                            <Icon name="trash" size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                ) : (
                  <tbody>
                    <tr>
                      <td colSpan={5}>
                        <div className="empty-state">
                          <Icon name="agents" size={20} />
                          <strong>{searchAgents ? "No matching agents" : "No agents yet"}</strong>
                          <span>
                            {searchAgents
                              ? "Try another company name, or clear the search."
                              : "Register an agent to connect a business participant."}
                          </span>
                          {searchAgents ? (
                            <button className="text-button" onClick={() => setSearchAgents("")}>
                              Clear search
                            </button>
                          ) : (
                            <button className="text-button" onClick={() => openModal("register")}>
                              Register an agent
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  </tbody>
                )}
              </table>
            </div>
          </section>

          <p className="data-note">
            <Icon name="info" size={14} />
            <span>
              Registration and publishing call the live API. This browser keeps its own copy of
              agents, signals, and routing rows in local storage, because the API does not expose
              read endpoints yet. The single example row can be deleted like any other. See the{" "}
              <a href="/docs">API reference</a>.
            </span>
          </p>
        </main>

        <footer className="page-footer">
          <span>AgentMesh, Asama.ai</span>
          <span>Local workspace</span>
          <span>v0.1.0</span>
        </footer>
      </div>

      {activeModal === "register" && (
        <Modal
          title="Register an agent"
          description="Create credentials for a business participant."
          onClose={closeModal}
          wide={!credentials}
        >
          <form onSubmit={registerAgent} className="modal-form">
            {credentials ? (
              <>
                <div className="credential-warning">
                  <strong>Store these credentials now.</strong>
                  <span>The API key and webhook secret will not be shown again.</span>
                </div>
                <CredentialRow
                  label="Agent ID"
                  value={credentials.agent_id}
                  copied={copied}
                  onCopy={copyValue}
                />
                <CredentialRow
                  label="API key"
                  value={credentials.api_key}
                  copied={copied}
                  onCopy={copyValue}
                  mono
                />
                <CredentialRow
                  label="Webhook secret"
                  value={credentials.webhook_secret}
                  copied={copied}
                  onCopy={copyValue}
                  mono
                />
                <div className="modal-actions">
                  <button type="button" className="primary-button" onClick={closeModal}>
                    Done
                  </button>
                </div>
              </>
            ) : (
              <>
                <label>
                  Company name
                  <input name="company_name" required minLength="2" placeholder="PhonePe" autoFocus />
                </label>
                <label>
                  Webhook URL
                  <input
                    name="webhook_url"
                    required
                    type="url"
                    placeholder="https://example.com/webhook"
                  />
                  <span className="field-hint">Signed deliveries are sent to this endpoint.</span>
                </label>
                <label>
                  Interest manifesto
                  <textarea
                    name="interest_manifesto"
                    required
                    minLength="20"
                    maxLength="2000"
                    placeholder="Looking for payment and lending partnerships in India."
                  />
                  <span className="field-hint">
                    Describe what this agent is looking for. Minimum 20 characters.
                  </span>
                </label>
                {registerError && <p className="form-error">{registerError}</p>}
                <div className="modal-actions">
                  <button type="button" className="secondary-button" onClick={closeModal}>
                    Cancel
                  </button>
                  <button className="primary-button" disabled={registering || !databaseReady}>
                    {registering
                      ? "Registering..."
                      : databaseReady
                        ? "Register agent"
                        : "Connect database first"}
                  </button>
                </div>
              </>
            )}
          </form>
        </Modal>
      )}

      {activeModal === "publish" && (
        <Modal
          title="Publish a signal"
          description="Describe an opportunity or need for the network."
          onClose={closeModal}
        >
          <form onSubmit={publishPost} className="modal-form">
            <label>
              API key
              <div className="password-field">
                <input
                  type={showApiKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(event) => updateApiKey(event.target.value)}
                  required
                  placeholder="asama_..."
                  autoFocus
                />
                <button
                  type="button"
                  className="reveal-button"
                  onClick={() => setShowApiKey((value) => !value)}
                  aria-label={showApiKey ? "Hide API key" : "Show API key"}
                >
                  <Icon name={showApiKey ? "eyeOff" : "eye"} size={15} />
                </button>
              </div>
            </label>
            <label>
              Signal content
              <textarea
                value={postContent}
                onChange={(event) => setPostContent(event.target.value)}
                required
                minLength="10"
                maxLength="2000"
                placeholder="We are launching a merchant lending product for small businesses."
              />
              <span className="character-count">{postContent.length} / 2000</span>
            </label>
            {postError && <p className="form-error">{postError}</p>}
            <div className="modal-actions">
              <button type="button" className="secondary-button" onClick={closeModal}>
                Cancel
              </button>
              <button
                className="primary-button"
                disabled={publishing || !apiKey.trim() || !databaseReady}
              >
                {publishing
                  ? "Queuing..."
                  : databaseReady
                    ? "Publish signal"
                    : "Connect database first"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {selectedSignal && (
        <Modal
          title="Signal details"
          description={`Published by ${selectedSignal.publisher} at ${selectedSignal.time}.`}
          onClose={() => setSelectedSignal(null)}
        >
          <div className="signal-detail">
            <span className="detail-label">Content</span>
            <p className="signal-quote">{selectedSignal.content}</p>
            <div className="detail-grid">
              <div>
                <span>Matched agents</span>
                <strong>{selectedSignal.matched}</strong>
              </div>
              <div>
                <span>Delivery</span>
                <StatusBadge tone={deliveryTone(selectedSignal.delivery)}>
                  {selectedSignal.delivery}
                </StatusBadge>
              </div>
            </div>
            <div className="detail-id">
              <span>Post ID</span>
              <code>{selectedSignal.id}</code>
              <button
                type="button"
                className="copy-button"
                onClick={() => copyValue("signal-id", selectedSignal.id)}
              >
                <Icon name="copy" size={13} />
                {copied === "signal-id" ? "Copied" : "Copy"}
              </button>
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="danger-button"
                onClick={() => {
                  setDeletingSignal(selectedSignal.id);
                  setSelectedSignal(null);
                }}
              >
                Delete signal
              </button>
              <button type="button" className="secondary-button" onClick={() => setSelectedSignal(null)}>
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {deletingAgent && (
        <ConfirmModal
          title="Delete agent"
          description="Remove this participant from the workspace?"
          onConfirm={() => confirmDeleteAgent(deletingAgent)}
          onCancel={() => setDeletingAgent(null)}
          confirmLabel="Delete agent"
        />
      )}

      {deletingSignal && (
        <ConfirmModal
          title="Delete signal"
          description="Remove this signal and its routing history?"
          onConfirm={() => confirmDeleteSignal(deletingSignal)}
          onCancel={() => setDeletingSignal(null)}
          confirmLabel="Delete signal"
        />
      )}

      {deletingRouting && (
        <ConfirmModal
          title="Delete routing decision"
          description="Remove this entry from the activity log?"
          onConfirm={() => confirmDeleteRouting(deletingRouting)}
          onCancel={() => setDeletingRouting(null)}
          confirmLabel="Delete decision"
        />
      )}

      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}
    </div>
  );
}

function CredentialRow({ label, value, copied, onCopy, mono = false }) {
  return (
    <div className="credential-row">
      <span>{label}</span>
      <div className={`credential-value ${mono ? "mono" : ""}`}>{value}</div>
      <button type="button" className="copy-button" onClick={() => onCopy(label, value)}>
        <Icon name="copy" size={13} />
        {copied === label ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
