import { useEffect, useState } from "react";

export function Icon({ name, size = 16, strokeWidth = 1.7, className = "" }) {
  const paths = {
    overview: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1.6" />
        <rect x="14" y="3" width="7" height="7" rx="1.6" />
        <rect x="3" y="14" width="7" height="7" rx="1.6" />
        <rect x="14" y="14" width="7" height="7" rx="1.6" />
      </>
    ),
    agents: (
      <>
        <circle cx="9" cy="8" r="3.4" />
        <path d="M2.8 20.8a6.2 6.2 0 0 1 12.4 0" />
        <path d="M16.2 4.8a3.4 3.4 0 0 1 0 6.4" />
        <path d="M17.6 14.6a5.4 5.4 0 0 1 3.6 5.2" />
      </>
    ),
    signals: (
      <>
        <circle cx="12" cy="12" r="2.1" />
        <path d="M8.4 8.4a5.1 5.1 0 0 0 0 7.2" />
        <path d="M15.6 8.4a5.1 5.1 0 0 1 0 7.2" />
        <path d="M5.6 5.6a9.1 9.1 0 0 0 0 12.8" />
        <path d="M18.4 5.6a9.1 9.1 0 0 1 0 12.8" />
      </>
    ),
    activity: <path d="M3 12h4l2-7 4 14 2-7h6" />,
    docs: (
      <>
        <path d="M5 3.5h11.5A2.5 2.5 0 0 1 19 6v14H7a2 2 0 0 1-2-2z" />
        <path d="M8.5 7.5h7M8.5 11h7M8.5 14.5h4.5" />
      </>
    ),
    code: <path d="m8 8-4 4 4 4M16 8l4 4-4 4M13.5 5l-3 14" />,
    search: (
      <>
        <circle cx="11" cy="11" r="6.6" />
        <path d="m20 20-4.2-4.2" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    refresh: (
      <>
        <path d="M20 11a8 8 0 0 0-14.6-3.9M4.4 4.6v4.2h4.2" />
        <path d="M4 13a8 8 0 0 0 14.6 3.9M19.6 19.4v-4.2h-4.2" />
      </>
    ),
    sun: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" />
      </>
    ),
    moon: <path d="M20 15.4A8.4 8.4 0 0 1 8.6 4a8.4 8.4 0 1 0 11.4 11.4Z" />,
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    copy: (
      <>
        <rect x="9" y="9" width="11" height="11" rx="2" />
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
      </>
    ),
    check: <path d="m5 12.5 4.2 4L19 6.5" />,
    chevronRight: <path d="m9 5 7 7-7 7" />,
    trash: (
      <>
        <path d="M4 7h16M9.5 7V4.5h5V7M6.5 7l.9 13h9.2l.9-13" />
        <path d="M10 11v5M14 11v5" />
      </>
    ),
    key: (
      <>
        <circle cx="8" cy="15" r="4" />
        <path d="m11 12 8.5-8.5M16.5 6.5 19 9M14 9l2.5 2.5" />
      </>
    ),
    eye: (
      <>
        <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
        <circle cx="12" cy="12" r="2.6" />
      </>
    ),
    eyeOff: (
      <>
        <path d="m3 3 18 18" />
        <path d="M10.6 10.7a2.6 2.6 0 0 0 3.7 3.7" />
        <path d="M9.9 5.2A10.6 10.6 0 0 1 12 5c6 0 9.5 7 9.5 7a19 19 0 0 1-3.1 4.2" />
        <path d="M6.6 6.6C3.6 8.4 2.5 12 2.5 12s3.5 7 9.5 7a10.4 10.4 0 0 0 3.1-.5" />
      </>
    ),
    shield: (
      <>
        <path d="M12 3 5 6v5.4c0 4.5 3 7.7 7 9.6 4-1.9 7-5.1 7-9.6V6l-7-3Z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
    alert: (
      <>
        <path d="M12 3.5 22 20H2L12 3.5Z" />
        <path d="M12 9.5v4.5M12 17h.01" />
      </>
    ),
    info: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v5M12 8h.01" />
      </>
    ),
  };

  return (
    <svg
      className={`icon ${className}`.trim()}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {paths[name] || null}
    </svg>
  );
}

export function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none">
        <path
          d="M12 5.4 5.6 18.2M12 5.4l6.4 12.8M5.6 18.2h12.8"
          stroke="currentColor"
          strokeWidth="1.2"
          opacity=".5"
          strokeLinecap="round"
        />
        <circle cx="12" cy="5.4" r="2.5" fill="currentColor" />
        <circle cx="5.6" cy="18.2" r="2.5" fill="currentColor" />
        <circle cx="18.4" cy="18.2" r="2.5" fill="currentColor" />
        <circle cx="12" cy="12.6" r="1.5" fill="currentColor" />
      </svg>
    </span>
  );
}

const monogramTones = ["tone-a", "tone-b", "tone-c", "tone-d"];

function initials(value) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

export function Monogram({ name, size = "md" }) {
  const hash = Array.from(name).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return (
    <span className={`monogram ${monogramTones[hash % monogramTones.length]} ${size}`} aria-hidden="true">
      {initials(name)}
    </span>
  );
}

export function StatusBadge({ tone = "neutral", children }) {
  return (
    <span className={`badge ${tone}`}>
      <span className="badge-dot" aria-hidden="true" />
      {children}
    </span>
  );
}

export function ScoreMeter({ score }) {
  const passing = score >= 0.75;
  return (
    <div className="score-meter">
      <span className="score-value">{score.toFixed(2)}</span>
      <span className="score-track" aria-hidden="true">
        <span className={`score-fill ${passing ? "pass" : "low"}`} style={{ width: `${Math.round(score * 100)}%` }} />
      </span>
    </div>
  );
}

export function ThroughputChart({ data }) {
  const [hover, setHover] = useState(null);
  const max = Math.max(...data.flatMap((day) => [day.signals, day.matches]));
  const top = Math.max(2, Math.ceil(max / 2) * 2);
  const pad = 3;
  const xFor = (index) => pad + (index / (data.length - 1)) * (100 - pad * 2);
  const yFor = (value) => 100 - (value / top) * 100;
  const series = (key) =>
    data.map((day, index) => `${xFor(index).toFixed(2)},${yFor(day[key]).toFixed(2)}`).join(" ");
  const areaPath = `M ${xFor(0).toFixed(2)},100 L ${data
    .map((day, index) => `${xFor(index).toFixed(2)},${yFor(day.signals).toFixed(2)}`)
    .join(" L ")} L ${xFor(data.length - 1).toFixed(2)},100 Z`;

  const activeIndex = hover;
  const activeDay = activeIndex === null ? null : data[activeIndex];

  function handleMove(event) {
    const rect = event.currentTarget.getBoundingClientRect();
    const position = ((event.clientX - rect.left) / rect.width) * 100;
    const ratio = Math.min(1, Math.max(0, (position - pad) / (100 - pad * 2)));
    setHover(Math.round(ratio * (data.length - 1)));
  }

  return (
    <figure className="throughput" aria-label="Signals published and matches delivered over the last seven days">
      <div className="chart-frame">
        <div className="chart-y" aria-hidden="true">
          <span>{top}</span>
          <span>{top / 2}</span>
          <span>0</span>
        </div>
        <div
          className="chart-plot"
          onMouseMove={handleMove}
          onMouseLeave={() => setHover(null)}
        >
          <div className="chart-grid" aria-hidden="true">
            <i /> <i /> <i />
          </div>
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <linearGradient id="throughput-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" className="area-start" />
                <stop offset="100%" className="area-end" />
              </linearGradient>
            </defs>
            <path d={areaPath} fill="url(#throughput-fill)" />
            <polyline points={series("signals")} className="chart-line signal-line" vectorEffect="non-scaling-stroke" />
            <polyline points={series("matches")} className="chart-line match-line" vectorEffect="non-scaling-stroke" />
          </svg>
          {activeDay && (
            <>
              <span className="chart-guide" style={{ left: `${xFor(activeIndex)}%` }} aria-hidden="true" />
              <span
                className="chart-dot signal-dot"
                style={{ left: `${xFor(activeIndex)}%`, top: `${yFor(activeDay.signals)}%` }}
                aria-hidden="true"
              />
              <span
                className="chart-dot match-dot"
                style={{ left: `${xFor(activeIndex)}%`, top: `${yFor(activeDay.matches)}%` }}
                aria-hidden="true"
              />
              <div
                className="chart-tooltip"
                style={{ left: `clamp(82px, ${xFor(activeIndex)}%, calc(100% - 82px))` }}
              >
                <strong>
                  {activeDay.label} {activeDay.date}
                </strong>
                <span>
                  <i className="swatch signals" aria-hidden="true" />
                  {activeDay.signals} {activeDay.signals === 1 ? "signal" : "signals"}
                </span>
                <span>
                  <i className="swatch matches" aria-hidden="true" />
                  {activeDay.matches} {activeDay.matches === 1 ? "match" : "matches"}
                </span>
              </div>
            </>
          )}
        </div>
        <div className="chart-x" aria-hidden="true">
          {data.map((day, index) => (
            <span key={day.date} className={index === activeIndex ? "active" : ""}>
              {day.label}
            </span>
          ))}
        </div>
      </div>
    </figure>
  );
}

function useDialog(onClose) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);
}

export function Modal({ title, description, onClose, children, wide = false }) {
  useDialog(onClose);
  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className={`modal ${wide ? "wide" : ""}`} role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <header className="modal-header">
          <div>
            <h2 id="modal-title">{title}</h2>
            {description && <p>{description}</p>}
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close dialog">
            <Icon name="close" />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}

export function ConfirmModal({ title, description, confirmLabel = "Delete", onConfirm, onCancel }) {
  useDialog(onCancel);
  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onCancel()}>
      <section className="modal confirm" role="alertdialog" aria-modal="true" aria-labelledby="modal-title">
        <header className="modal-header">
          <div>
            <h2 id="modal-title">{title}</h2>
            {description && <p>{description}</p>}
          </div>
          <button type="button" className="icon-button" onClick={onCancel} aria-label="Close dialog">
            <Icon name="close" />
          </button>
        </header>
        <div className="confirm-body">
          <span className="confirm-icon" aria-hidden="true">
            <Icon name="alert" size={18} />
          </span>
          <p>This action cannot be undone.</p>
        </div>
        <div className="modal-actions">
          <button type="button" className="secondary-button" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="danger-button" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}

export function Toast({ toast, onClose }) {
  return (
    <div className={`toast ${toast.tone || "success"}`} role="status" aria-live="polite">
      <span className="toast-icon" aria-hidden="true">
        <Icon name={toast.tone === "error" ? "alert" : "check"} size={15} />
      </span>
      <span className="toast-copy">
        <strong>{toast.title}</strong>
        <small>{toast.message}</small>
      </span>
      <button type="button" className="toast-close" onClick={onClose} aria-label="Dismiss notification">
        <Icon name="close" size={14} />
      </button>
    </div>
  );
}
