import React from 'react';

export default function ScoreRing({ score, size = 80, strokeWidth = 6 }) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 80 ? '#16a34a' : score >= 60 ? '#ea580c' : '#dc2626';

  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={strokeWidth} />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
      <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central"
        className="rotate-90" style={{ transform: `rotate(90deg) translate(0, 0)`, fontFamily: 'Inter, sans-serif', fontSize: size * 0.22, fontWeight: '600', fill: color, rotate: '90deg' }}>
      </text>
    </svg>
  );
}
