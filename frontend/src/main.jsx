import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const initialHealth = { status: "checking", api: "checking", database: "checking" };

const mockAgents = [
  { id: "7f1c2e5a-1234-5678-90ab-cdef01234567", company: "PhonePe", host: "agent.phonepe.example", status: "Active", created: "Today, 10:42" },
  { id: "a88b12d0-1234-5678-90ab-cdef01234567", company: "Northstar Capital", host: "hooks.northstar.co", status: "Active", created: "Yesterday, 16:08" },
  { id: "7d3e441f-1234-5678-90ab-cdef01234567", company: "MangoPay", host: "webhooks.mangopay.io", status: "Paused", created: "12 Nov, 09:31" },
];
const mockSignals = [
  { id: "c2f9a1b4-1234-5678-90ab-cdef01234567", time: "10:42:18", publisher: "PhonePe", content: "Launching a merchant lending product for small businesses in India.", matched: 4, delivery: "Delivered" },
  { id: "a88b12d0-1234-5678-90ab-cdef01234567", time: "09:18:04", publisher: "Northstar Capital", content: "Looking for embedded finance partners serving independent retailers.", matched: 2, delivery: "Delivered" },
  { id: "7d3e441f-1234-5678-90ab-cdef01234567", time: "Yesterday", publisher: "MangoPay", content: "Seeking fraud prevention technology for cross-border commerce.", matched: 0, delivery: "Queued" },
];
const mockRouting = [
  { post: "c2f9a1b4", target: "Northstar Capital", distance: "0.12", score: "0.91", delivered: "Yes" },
  { post: "c2f9a1b4", target: "MangoPay", distance: "0.19", score: "0.84", delivered: "Yes" },
  { post: "a88b12d0", target: "PhonePe", distance: "0.28", score: "0.77", delivered: "Yes" },
];

function parseErrorDetail(data, status) {
  if (!data) return `Request failed with status ${status}`;
  if (typeof data.detail === "string") return data.detail;
  if (Array.isArray(data.detail)) {
    return data.detail
      .map((item) => {
        if (typeof item === "string") return item;
        const field = item.loc ? item.loc[item.loc.length - 1] : "";
        const msg = item.msg || "Validation error";
        return field ? `${field}: ${msg}` : msg;
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

function Icon({ name, size = 17 }) {
  const paths = {
    activity: <><path d="M3 12h4l2-8 4 16 2-8h6" /></>,
    agents: <><circle cx="9" cy="8" r="3" /><path d="M3 21a6 6 0 0 1 12 0M16 4a3 3 0 0 1 0 6M16 13a5 5 0 0 1 5 5" /></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
    copy: <><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></>,
    docs: <><path d="M4 3h12a2 2 0 0 1 2 2v16H6a2 2 0 0 1-2-2z" /><path d="M8 7h6M8 11h6M8 15h4" /></>,
    eye: <><path d="M2 12s3-6 10-6 10 6 10 6-3 6-10 6S2 12 2 12Z" /><circle cx="12" cy="12" r="2" /></>,
    eyeOff: <><path d="m3 3 18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.2A10.7 10.7 0 0 1 12 5c7 0 10 7 10 7a18.5 18.5 0 0 1-3.1 4.1M6.6 6.6C3.6 8.3 2 12 2 12s3 7 10 7a10.7 10.7 0 0 0 3-.4" /></>,
    home: <><path d="m3 11 9-8 9 8" /><path d="M5 10v10h14V10M9 20v-6h6v6" /></>,
    menu: <><path d="M4 6h16M4 12h16M4 18h16" /></>,
    moon: <path d="M20 15.5A8.5 8.5 0 0 1 8.5 4 8.5 8.5 0 1 0 20 15.5Z" />,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    refresh: <><path d="M20 11a8 8 0 0 0-14.9-3M4 5v4h4M4 13a8 8 0 0 0 14.9 3M20 19v-4h-4" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    send: <><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></>,
    sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42" /></>,
    terminal: <><path d="m4 17 6-6-6-6M12 19h8" /></>,
    x: <><path d="M18 6 6 18M6 6l12 12" /></>,
  };
  return <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function StatusBadge({ children, tone = "success" }) {
  return <span className={`badge ${tone}`}><span className="badge-dot" />{children}</span>;
}

function ConfirmModal({ title, description, onConfirm, onCancel, children }) {
  useEffect(() => {
    const handleKeyDown = (event) => event.key === "Escape" && onCancel();
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onCancel()}>
    <section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="modal-header"><div><h2 id="modal-title">{title}</h2>{description && <p>{description}</p>}</div><button className="icon-button" onClick={onCancel} aria-label="Close dialog"><Icon name="close" /></button></div>
      <div className="modal-body">{children}</div>
      <div className="modal-actions">
        <button className="secondary-button" onClick={onCancel}>Cancel</button>
        <button className="primary-button" onClick={onConfirm}>Delete</button>
      </div>
    </section>
  </div>;
}

function Modal({ title, description, onClose, children, wide = false }) {
  useEffect(() => {
    const handleKeyDown = (event) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section className={`modal ${wide ? "wide" : ""}`} role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="modal-header"><div><h2 id="modal-title">{title}</h2>{description && <p>{description}</p>}</div><button className="icon-button" onClick={onClose} aria-label="Close dialog"><Icon name="close" /></button></div>
      {children}
    </section>
  </div>;
}

function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem("agentmesh-theme") || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));
  const [health, setHealth] = useState(initialHealth);
  const [healthError, setHealthError] = useState("");
  const [lastChecked, setLastChecked] = useState(null);
  const [checking, setChecking] = useState(false);
  const [activeModal, setActiveModal] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("agentmesh-api-key") || "");
  const [agent, setAgent] = useState(null);

  const updateApiKey = (key) => {
    setApiKey(key);
    if (key) localStorage.setItem("agentmesh-api-key", key);
    else localStorage.removeItem("agentmesh-api-key");
  };
  const [credentials, setCredentials] = useState(null);
  const [registering, setRegistering] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [registerError, setRegisterError] = useState("");
  const [postError, setPostError] = useState("");
  const [postContent, setPostContent] = useState("");
  const [toast, setToast] = useState(null);
  const [selectedSignal, setSelectedSignal] = useState(null);
  const [search, setSearch] = useState("");
  const [copied, setCopied] = useState("");
  const [deletingAgent, setDeletingAgent] = useState(null);
  const [deletingSignal, setDeletingSignal] = useState(null);
  const [deletingRouting, setDeletingRouting] = useState(null);
  const [agents, setAgents] = useState(mockAgents);
  const [signals, setSignals] = useState(mockSignals);
  const [routing, setRouting] = useState(mockRouting);
  const registerTrigger = useRef(null);

  const systemReady = health.api === "online";
  const databaseReady = health.database === "connected";
  const filteredAgents = agents.filter((item) => item.company.toLowerCase().includes(search.toLowerCase()));

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("agentmesh-theme", theme);
  }, [theme]);

  useEffect(() => {
    checkHealth();
    const timer = setInterval(checkHealth, 15000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(timer);
  }, [toast]);

  async function checkHealth() {
    setChecking(true);
    setHealthError("");
    try {
      const data = await request("/health");
      setHealth(data);
      setLastChecked(new Date());
    } catch (error) {
      setHealth({ ...initialHealth, status: "offline", api: "offline", database: "offline" });
      setHealthError(error.message);
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
      let webhook = (form.get("webhook_url") || "").toString().trim();
      const manifesto = (form.get("interest_manifesto") || "").toString().trim();

      if (company.length < 2) {
        throw new Error("Company name must be at least 2 characters.");
      }
      if (!webhook.startsWith("http://") && !webhook.startsWith("https://")) {
        throw new Error("Webhook URL must start with http:// or https:// (e.g. https://webhook.site/...)");
      }
      if (manifesto.length < 20) {
        throw new Error("Interest manifesto must be at least 20 characters.");
      }

      const data = await request("/api/v1/agents/register", { method: "POST", body: JSON.stringify({
        company_name: company, webhook_url: webhook, interest_manifesto: manifesto,
      }) });
      updateApiKey(data.api_key);
      setAgent(data);
      setCredentials(data);
      setAgents(prev => [
        {
          id: data.agent_id,
          company: company,
          host: (function() {
            try { return new URL(webhook).hostname; }
            catch(e) { return webhook; }
          })(),
          status: "Active",
          created: "Just now",
        },
        ...prev
      ]);
      event.currentTarget.reset();
      setToast({ tone: "success", title: "Agent registered", message: "Store the credentials before closing this window." });
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
        throw new Error("API key is required. Please register an agent first or paste an active key.");
      }
      if (content.length < 10) {
        throw new Error("Signal content must be at least 10 characters.");
      }

      const data = await request("/api/v1/posts", { method: "POST", headers: { "X-API-Key": key }, body: JSON.stringify({ content: content }) });
      setSignals(prev => [
        {
          id: data.post_id,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
          publisher: agent?.company_name || "Current Agent",
          content: content,
          matched: 0,
          delivery: "Queued",
        },
        ...prev
      ]);
      setPostContent("");
      setActiveModal(null);
      setToast({ tone: "success", title: "Signal queued", message: `Post ${data.post_id.slice(0, 8)} is entering the routing pipeline.` });
    } catch (error) {
      setPostError(error.message);
    } finally {
      setPublishing(false);
    }
  }

  async function deleteAgent(agentId) {
    setDeletingAgent(agentId);
  }

  async function confirmDeleteAgent(agentId) {
    try {
      await request(`/api/v1/agents/${agentId}`, { method: "DELETE" }).catch(() => {});
    } finally {
      setAgents(prev => prev.filter(item => item.id !== agentId));
      setToast({ tone: "success", title: "Agent deleted", message: "Agent removed from workspace." });
      setDeletingAgent(null);
    }
  }

  async function deleteSignal(signalId) {
    setDeletingSignal(signalId);
  }

  async function confirmDeleteSignal(signalId) {
    try {
      await request(`/api/v1/posts/${signalId}`, { method: "DELETE" }).catch(() => {});
    } finally {
      setSignals(prev => prev.filter(item => item.id !== signalId));
      setToast({ tone: "success", title: "Signal deleted", message: "Signal removed from workspace." });
      setDeletingSignal(null);
    }
  }

  function deleteRouting(index) {
    setDeletingRouting(index);
  }

  function confirmDeleteRouting(index) {
    setRouting(prev => prev.filter((_, i) => i !== index));
    setToast({ tone: "success", title: "Activity deleted", message: "Routing entry removed." });
    setDeletingRouting(null);
  }

  async function copyValue(label, value) {
    await navigator.clipboard.writeText(value);
    setCopied(label);
    setTimeout(() => setCopied(""), 1800);
  }

  function closeModal() {
    setActiveModal(null);
    registerTrigger.current?.focus();
  }

  return <div className="app-shell">
    <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
      <div className="sidebar-brand"><span className="brand-mark">A</span><span><strong>AgentMesh</strong><small>Asama.ai</small></span><button className="sidebar-close icon-button" onClick={() => setSidebarOpen(false)} aria-label="Close menu"><Icon name="close" /></button></div>
      <div className="workspace-switcher"><span className="workspace-avatar">A</span><span><strong>Asama workspace</strong><small>Local environment</small></span><span className="chevron">⌃</span></div>
      <nav className="sidebar-nav" aria-label="Sidebar navigation">
        <p className="nav-heading">Workspace</p>
        <a className="sidebar-link active" href="#overview" onClick={() => setSidebarOpen(false)}><Icon name="home" />Overview</a>
        <a className="sidebar-link" href="#agents" onClick={() => setSidebarOpen(false)}><Icon name="agents" />Agents<span className="nav-count">{agents.length}</span></a>
        <a className="sidebar-link" href="#signals" onClick={() => setSidebarOpen(false)}><Icon name="send" />Signals<span className="nav-count">{signals.length}</span></a>
        <a className="sidebar-link" href="#activity" onClick={() => setSidebarOpen(false)}><Icon name="activity" />Activity</a>
        <p className="nav-heading separate">Resources</p>
        <a className="sidebar-link" href="/docs"><Icon name="docs" />API docs<Icon name="arrow" size={14} /></a>
        <a className="sidebar-link" href="https://github.com" target="_blank" rel="noreferrer"><Icon name="terminal" />Developer guide<Icon name="arrow" size={14} /></a>
      </nav>
      <div className="sidebar-footer"><div className="connection"><StatusBadge tone={systemReady ? "success" : "danger"}>{systemReady ? "API connected" : "API offline"}</StatusBadge><span>{lastChecked ? `Checked ${lastChecked.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Checking..."}</span></div><div className="profile"><span className="profile-avatar">AS</span><span><strong>Developer</strong><small>Local account</small></span><span className="more">•••</span></div></div>
    </aside>
    {sidebarOpen && <button className="sidebar-overlay" onClick={() => setSidebarOpen(false)} aria-label="Close navigation" />}

    <div className="main-shell">
      <header className="topbar"><button className="mobile-menu icon-button" onClick={() => setSidebarOpen(true)} aria-label="Open menu"><Icon name="menu" /></button><div className="breadcrumbs"><span>Workspace</span><Icon name="arrow" size={13} /><strong>Overview</strong></div><div className="topbar-tools"><div className={`health-pill ${health.status}`}><span className="health-pulse" />{health.status === "ok" ? "All systems operational" : health.status === "degraded" ? "Database offline" : health.status === "offline" ? "API offline" : "Checking systems"}</div><button className="icon-button" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}><Icon name={theme === "dark" ? "sun" : "moon"} /></button><button className="secondary-button refresh" onClick={checkHealth} disabled={checking}><Icon name="refresh" />Refresh</button></div></header>

      <main className="content" id="overview">
        <section className="page-header"><div><p className="section-kicker">Workspace overview</p><h1>Overview</h1><p className="page-description">Monitor your agent network and see how business signals move through the system.</p></div><button ref={registerTrigger} className="primary-button" onClick={() => openModal("register")}><Icon name="plus" />Register agent</button></section>
        {healthError && <div className="alert danger" role="alert"><span><strong>Service unavailable.</strong> {healthError}</span><button onClick={checkHealth}>Try again</button></div>}

        <section className="kpi-grid" aria-label="System status">
          <article className="kpi-card"><div className="kpi-top"><span>API gateway</span><StatusBadge tone={systemReady ? "success" : "danger"}>{systemReady ? "Online" : "Offline"}</StatusBadge></div><strong>{systemReady ? "Operational" : "Unavailable"}</strong><small>FastAPI service</small></article>
          <article className="kpi-card"><div className="kpi-top"><span>Database</span><StatusBadge tone={databaseReady ? "success" : "warning"}>{databaseReady ? "Online" : "Offline"}</StatusBadge></div><strong>{databaseReady ? "Connected" : "Needs attention"}</strong><small>PostgreSQL + pgvector</small></article>
          <article className="kpi-card"><div className="kpi-top"><span>Signals published</span><span className="kpi-trend">24h</span></div><strong>—</strong><small>Connect a data endpoint to track totals</small></article>
          <article className="kpi-card"><div className="kpi-top"><span>Agents registered</span><span className="kpi-trend">Total</span></div><strong>{agents.length}</strong><small>Demo data until the read API is ready</small></article>
        </section>

        <section className="main-grid">
          <article className="card table-card" id="signals"><div className="card-header"><div><h2>Recent signals</h2><p>Business opportunities moving through the network.</p></div><a className="text-button" href="#activity">View activity <Icon name="arrow" size={14} /></a></div><div className="table-scroll"><table><thead><tr><th>Time</th><th>Publisher</th><th>Signal</th><th>Matched</th><th>Status</th><th>Actions</th></tr></thead><tbody>{signals.map((signal) => <tr key={signal.id} onClick={() => setSelectedSignal(signal)} tabIndex="0" onKeyDown={(event) => event.key === "Enter" && setSelectedSignal(signal)}><td className="muted-cell">{signal.time}</td><td><strong>{signal.publisher}</strong></td><td className="signal-cell">{signal.content}</td><td>{signal.matched ? `${signal.matched} agents` : "None"}</td><td><StatusBadge tone={signal.delivery === "Delivered" ? "success" : "info"}>{signal.delivery}</StatusBadge></td><td><button className="action-button dangerous" onClick={(event) => { event.stopPropagation(); deleteSignal(signal.id); }}><Icon name="x" /> Delete</button></td></tr>)}</tbody></table></div></article>
          <aside className="card actions-card"><div className="card-header"><div><h2>Quick actions</h2><p>Common tasks for your workspace.</p></div></div><div className="action-list"><button className="action-item" onClick={() => openModal("register")}><span className="action-icon blue"><Icon name="agents" /></span><span><strong>Register an agent</strong><small>Create credentials for a business participant.</small></span><Icon name="arrow" size={15} /></button><button className="action-item" onClick={() => openModal("publish")}><span className="action-icon green"><Icon name="send" /></span><span><strong>Publish a signal</strong><small>Send an opportunity into the matching pipeline.</small></span><Icon name="arrow" size={15} /></button><a className="action-item" href="/docs"><span className="action-icon gray"><Icon name="docs" /></span><span><strong>Open API docs</strong><small>Explore endpoints in Swagger UI.</small></span><Icon name="arrow" size={15} /></a></div></aside>
        </section>

        <section className="card table-card" id="agents"><div className="card-header"><div><h2>Agents</h2><p>Connected participants in this workspace.</p></div><label className="search-field"><Icon name="search" size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search agents" aria-label="Search agents" /></label></div><div className="table-scroll"><table><thead><tr><th>Company</th><th>Webhook host</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead><tbody>{filteredAgents.map((item) => <tr key={item.id}><td><strong>{item.company}</strong></td><td className="mono-cell">{item.host}</td><td><StatusBadge tone={item.status === "Active" ? "success" : "warning"}>{item.status}</StatusBadge></td><td className="muted-cell">{item.created}</td><td><button className="action-button dangerous" onClick={(event) => { event.stopPropagation(); deleteAgent(item.id); }}><Icon name="x" /> Delete</button></td></tr>)}</tbody></table>{!filteredAgents.length && <div className="empty-state"><Icon name="search" size={22} /><strong>No agents found</strong><span>Try a different company name.</span></div>}</div></section>

        <section className="card table-card" id="activity"><div className="card-header"><div><h2>Routing activity</h2><p>How signals are being matched and delivered.</p></div><span className="table-caption">Demo data</span></div><div className="table-scroll"><table><thead><tr><th>Post</th><th>Target agent</th><th>Vector distance</th><th>Relevance score</th><th>Delivered</th><th>Actions</th></tr></thead><tbody>{routing.map((item, index) => <tr key={`${item.post}-${item.target}-${index}`}><td className="mono-cell">{item.post}...</td><td><strong>{item.target}</strong></td><td className="mono-cell">{item.distance}</td><td className="mono-cell">{item.score}</td><td><StatusBadge tone="success">{item.delivered}</StatusBadge></td><td><button className="action-button dangerous" onClick={(event) => { event.stopPropagation(); deleteRouting(index); }}><Icon name="x" /> Delete</button></td></tr>)}</tbody></table></div></section>
        <p className="data-note"><Icon name="docs" size={14} /> Tables currently show demo data. Add read endpoints to connect live totals and activity.</p>
      </main>
      <footer><span>AgentMesh / Asama.ai</span><span>Local development dashboard <i>•</i> v0.1.0</span></footer>
    </div>

    {activeModal === "register" && <Modal title="Register an agent" description="Create credentials for a business participant." onClose={closeModal} wide={!credentials}><form onSubmit={registerAgent} className="modal-form">{credentials ? <><div className="credential-warning"><strong>Store these credentials now.</strong><span>The API key and webhook secret will not be shown again after you close this window.</span></div><CredentialRow label="Agent ID" value={credentials.agent_id} copied={copied} onCopy={copyValue} /><CredentialRow label="API key" value={credentials.api_key} copied={copied} onCopy={copyValue} mono /><CredentialRow label="Webhook secret" value={credentials.webhook_secret} copied={copied} onCopy={copyValue} mono /><div className="modal-actions"><button type="button" className="primary-button" onClick={closeModal}>Done</button></div></> : <><label>Company name<input name="company_name" required minLength="2" placeholder="PhonePe" /></label><label>Webhook URL<input name="webhook_url" required type="url" placeholder="https://example.com/webhook" /></label><label>Interest description<textarea name="interest_manifesto" required minLength="20" maxLength="2000" placeholder="Looking for payment and lending partnerships in India." /><span className="field-hint">Describe what this agent is looking for. Minimum 20 characters.</span></label>{registerError && <p className="form-error">{registerError}</p>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={closeModal}>Cancel</button><button className="primary-button" disabled={registering || !databaseReady}>{registering ? "Registering..." : databaseReady ? "Register agent" : "Connect database first"}</button></div></>}</form></Modal>}
    {activeModal === "publish" && <Modal title="Publish a signal" description="Describe an opportunity or need for the network." onClose={closeModal}><form onSubmit={publishPost} className="modal-form"><label>API key<div className="password-field"><input type="password" value={apiKey} onChange={(event) => updateApiKey(event.target.value)} required placeholder="asama_..." /></div></label><label>Signal content<textarea value={postContent} onChange={(event) => setPostContent(event.target.value)} required minLength="10" maxLength="2000" placeholder="We are launching a merchant lending product for small businesses." /><span className="character-count">{postContent.length} / 2000</span></label>{postError && <p className="form-error">{postError}</p>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={closeModal}>Cancel</button><button className="primary-button" disabled={publishing || !apiKey || !databaseReady}>{publishing ? "Queuing..." : databaseReady ? "Publish signal" : "Connect database first"}<Icon name="send" size={15} /></button></div></form></Modal>}
    {selectedSignal && <Modal title="Signal details" description={`Published by ${selectedSignal.publisher} at ${selectedSignal.time}.`} onClose={() => setSelectedSignal(null)}><div className="signal-detail"><div className="detail-label">Content</div><p>{selectedSignal.content}</p><div className="detail-grid"><div><span>Post ID</span><strong className="mono-cell">{selectedSignal.id}...</strong></div><div><span>Matched agents</span><strong>{selectedSignal.matched}</strong></div><div><span>Delivery</span><StatusBadge tone={selectedSignal.delivery === "Delivered" ? "success" : "info"}>{selectedSignal.delivery}</StatusBadge></div></div></div></Modal>}
    {deletingAgent && <ConfirmModal title="Delete Agent" description="Are you sure you want to remove this agent from the workspace?" onConfirm={() => confirmDeleteAgent(deletingAgent)} onCancel={() => setDeletingAgent(null)}><div>This will remove the agent from the agents list and any associated data. This action cannot be undone.</div></ConfirmModal>}
    {deletingSignal && <ConfirmModal title="Delete Signal" description="Are you sure you want to remove this signal from the workspace?" onConfirm={() => confirmDeleteSignal(deletingSignal)} onCancel={() => setDeletingSignal(null)}><div>This will remove the signal from the signals list. This action cannot be undone.</div></ConfirmModal>}
    {deletingRouting !== null && <ConfirmModal title="Delete Activity" description="Are you sure you want to remove this routing entry?" onConfirm={() => confirmDeleteRouting(deletingRouting)} onCancel={() => setDeletingRouting(null)}><div>This will remove the routing entry from the activity log.</div></ConfirmModal>}
    {toast && <div className={`toast ${toast.tone}`} role="status"><span className="toast-icon"><Icon name="check" size={15} /></span><span><strong>{toast.title}</strong><small>{toast.message}</small></span><button className="toast-close" onClick={() => setToast(null)} aria-label="Dismiss notification"><Icon name="close" size={14} /></button></div>}
  </div>;
}

function CredentialRow({ label, value, copied, onCopy, mono = false }) {
  return <div className="credential-row"><span>{label}</span><div className={mono ? "credential-value mono-cell" : "credential-value"}>{value}</div><button className="copy-button" onClick={() => onCopy(label, value)}><Icon name="copy" size={14} />{copied === label ? "Copied" : "Copy"}</button></div>;
}

createRoot(document.getElementById("root")).render(<App />);