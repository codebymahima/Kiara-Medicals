import { useState } from "react";

const PALETTE = [
  "#2563eb", // Royal blue
  "#10b981", // Emerald green
  "#f59e0b", // Amber
  "#8b5cf6", // Purple
  "#ec4899", // Pink
  "#06b6d4", // Cyan
  "#f97316", // Orange
  "#64748b", // Slate
];

export function DonutChart({
  data = [],
  title = "Distribution",
  centerLabel = "Total",
  formatValue = (v) => `₹${Number(v).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`,
  height = 240,
}) {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  const cleanData = data
    .map((item, i) => ({
      ...item,
      value: Math.max(0, Number(item.value) || 0),
      color: item.color || PALETTE[i % PALETTE.length],
    }))
    .filter((d) => d.value > 0);

  const total = cleanData.reduce((sum, d) => sum + d.value, 0);

  if (!cleanData.length || total === 0) {
    return (
      <div className="chart-container empty-chart">
        {title && <h4 className="chart-title">{title}</h4>}
        <div className="chart-empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 6v6l4 2" />
          </svg>
          <p>No activity data available for this period</p>
        </div>
      </div>
    );
  }

  const radius = 64;
  const strokeWidth = 26;
  const circumference = 2 * Math.PI * radius;
  let accumulatedPercent = 0;

  const slices = cleanData.map((item, idx) => {
    const percent = item.value / total;
    const strokeDasharray = `${percent * circumference} ${circumference}`;
    const strokeDashoffset = -accumulatedPercent * circumference;
    accumulatedPercent += percent;
    return {
      ...item,
      percent: Math.round(percent * 100),
      strokeDasharray,
      strokeDashoffset,
      idx,
    };
  });

  const activeSlice = hoveredIndex !== null ? slices[hoveredIndex] : null;

  return (
    <div className="chart-container">
      {title && <h4 className="chart-title">{title}</h4>}
      <div className="chart-donut-wrap" style={{ minHeight: height }}>
        <div className="chart-svg-box">
          <svg viewBox="0 0 180 180" className="donut-svg">
            <g transform="rotate(-90 90 90)">
              {slices.map((slice) => {
                const isHovered = hoveredIndex === slice.idx;
                return (
                  <circle
                    key={slice.label + slice.idx}
                    cx="90"
                    cy="90"
                    r={radius}
                    fill="transparent"
                    stroke={slice.color}
                    strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                    strokeDasharray={slice.strokeDasharray}
                    strokeDashoffset={slice.strokeDashoffset}
                    className="donut-segment"
                    style={{
                      transition: "stroke-width 0.2s ease, opacity 0.2s ease",
                      cursor: "pointer",
                      opacity: hoveredIndex === null || isHovered ? 1 : 0.65,
                    }}
                    onMouseEnter={() => setHoveredIndex(slice.idx)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  />
                );
              })}
            </g>
          </svg>
          <div className="donut-center-text">
            <span className="donut-center-label">
              {activeSlice ? activeSlice.label : centerLabel}
            </span>
            <strong className="donut-center-value">
              {activeSlice
                ? formatValue(activeSlice.value)
                : formatValue(total)}
            </strong>
            {activeSlice && (
              <span className="donut-center-sub">
                {activeSlice.percent}% of total
              </span>
            )}
          </div>
        </div>

        <div className="chart-legend">
          {slices.map((slice) => (
            <div
              key={slice.label}
              className={`legend-item ${hoveredIndex === slice.idx ? "active" : ""}`}
              onMouseEnter={() => setHoveredIndex(slice.idx)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <span
                className="legend-dot"
                style={{ backgroundColor: slice.color }}
              />
              <span className="legend-label">{slice.label}</span>
              <strong className="legend-value">{formatValue(slice.value)}</strong>
              <span className="legend-percent">{slice.percent}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function BarChart({
  categories = [],
  series = [],
  title = "Analytics Comparison",
  formatValue = (v) => `₹${Number(v).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`,
  height = 260,
}) {
  const [tooltip, setTooltip] = useState(null);

  // Find max value across all series
  let maxVal = 0;
  for (const s of series) {
    for (const v of s.data || []) {
      const num = Number(v) || 0;
      if (num > maxVal) maxVal = num;
    }
  }

  // Nice scale ceiling
  const yCeil = maxVal > 0 ? Math.ceil(maxVal * 1.15) : 1000;
  const gridTicks = [0, 0.25, 0.5, 0.75, 1].map((frac) => Math.round(yCeil * frac));

  const hasData = categories.length > 0 && series.some((s) => (s.data || []).some((v) => Number(v) > 0));

  if (!hasData) {
    return (
      <div className="chart-container empty-chart">
        {title && <h4 className="chart-title">{title}</h4>}
        <div className="chart-empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5">
            <rect x="3" y="12" width="4" height="8" rx="1" />
            <rect x="10" y="8" width="4" height="12" rx="1" />
            <rect x="17" y="4" width="4" height="16" rx="1" />
          </svg>
          <p>No comparison data recorded yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chart-container">
      <div className="chart-header-row">
        {title && <h4 className="chart-title">{title}</h4>}
        <div className="bar-series-legend">
          {series.map((s) => (
            <span key={s.name} className="series-legend-item">
              <span className="series-legend-swatch" style={{ backgroundColor: s.color }} />
              {s.name}
            </span>
          ))}
        </div>
      </div>

      <div className="bar-chart-body" style={{ height }}>
        {/* Y-Axis Gridlines & labels */}
        <div className="bar-chart-grid">
          {gridTicks.slice().reverse().map((tick) => (
            <div key={tick} className="grid-row">
              <span className="grid-label">{formatValue(tick)}</span>
              <div className="grid-line" />
            </div>
          ))}
        </div>

        {/* Categories and bars */}
        <div className="bar-chart-columns">
          {categories.map((cat, catIdx) => (
            <div key={cat} className="bar-group-wrap">
              <div className="bar-group">
                {series.map((s, seriesIdx) => {
                  const val = Number(s.data?.[catIdx] || 0);
                  const heightPercent = yCeil > 0 ? Math.min(100, Math.max(4, (val / yCeil) * 100)) : 0;
                  const isVisible = val > 0;

                  return (
                    <div
                      key={s.name}
                      className="bar-pillar"
                      style={{
                        height: isVisible ? `${heightPercent}%` : "3px",
                        backgroundColor: s.color,
                        opacity: isVisible ? 1 : 0.4,
                      }}
                      onMouseEnter={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setTooltip({
                          label: `${cat} — ${s.name}`,
                          value: formatValue(val),
                          x: rect.left + rect.width / 2,
                          y: rect.top - 10,
                        });
                      }}
                      onMouseLeave={() => setTooltip(null)}
                    >
                      {isVisible && heightPercent > 25 && (
                        <span className="bar-inner-label">
                          {formatValue(val)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
              <span className="bar-category-label" title={cat}>
                {cat}
              </span>
            </div>
          ))}
        </div>
      </div>

      {tooltip && (
        <div
          className="chart-floating-tooltip"
          style={{
            position: "fixed",
            left: tooltip.x,
            top: tooltip.y,
            transform: "translate(-50%, -100%)",
            pointerEvents: "none",
            zIndex: 9999,
          }}
        >
          <div className="tooltip-title">{tooltip.label}</div>
          <div className="tooltip-value">{tooltip.value}</div>
        </div>
      )}
    </div>
  );
}

export function MetricBreakdownBar({
  title = "Cash Flow Breakdown",
  items = [],
  formatValue = (v) => `₹${Number(v).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`,
}) {
  const cleanItems = items.filter((it) => Number(it.value) > 0);
  const total = cleanItems.reduce((acc, it) => acc + Number(it.value), 0);

  if (total === 0) return null;

  return (
    <div className="metric-breakdown-card">
      <div className="breakdown-head">
        <h4>{title}</h4>
        <span>Total: {formatValue(total)}</span>
      </div>
      <div className="breakdown-bar">
        {cleanItems.map((item) => {
          const widthPct = (item.value / total) * 100;
          return (
            <div
              key={item.label}
              className="breakdown-segment"
              style={{
                width: `${widthPct}%`,
                backgroundColor: item.color,
              }}
              title={`${item.label}: ${formatValue(item.value)} (${Math.round(widthPct)}%)`}
            />
          );
        })}
      </div>
      <div className="breakdown-legend">
        {cleanItems.map((item) => {
          const pct = Math.round((item.value / total) * 100);
          return (
            <div key={item.label} className="breakdown-legend-item">
              <span className="breakdown-dot" style={{ backgroundColor: item.color }} />
              <span className="breakdown-name">{item.label}</span>
              <strong className="breakdown-amount">{formatValue(item.value)}</strong>
              <span className="breakdown-pct">({pct}%)</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
