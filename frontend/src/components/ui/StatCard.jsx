import React, { useState, useEffect } from 'react';

/**
 * Animated counter hook for numbers
 */
export function useAnimatedValue(target, duration = 800) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (typeof target !== 'number' || isNaN(target) || target === 0) {
      setValue(0);
      return;
    }
    const start = performance.now();
    const from = 0;
    function tick(now) {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(from + (target - from) * eased));
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, [target, duration]);
  return value;
}

/**
 * Reusable Executive StatCard matching Main Admin Dashboard
 */
export function StatCard({
  icon,
  label,
  value,
  color = 'blue',
  isCurrency = false,
  subtitle,
  subtext,
  onClick,
  clickable = Boolean(onClick),
}) {
  const isNum = typeof value === 'number';
  const animated = useAnimatedValue(isNum ? value : 0);
  const display = isNum
    ? (isCurrency ? `${animated.toLocaleString()} ETB` : animated.toLocaleString())
    : (value ?? '—');
  const sub = subtitle || subtext;

  return (
    <article
      className={`exec-card ${color} ${clickable ? 'clickable' : ''}`.trim()}
      onClick={onClick}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={(e) => {
        if (clickable && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick?.(e);
        }
      }}
      title={clickable ? `Click to view ${label}` : undefined}
    >
      <div className="card-icon">{icon}</div>
      <div className="card-value">{display}</div>
      <div className="card-label">{label}</div>
      {sub && <div className="card-sub">{sub}</div>}
    </article>
  );
}

export default StatCard;

