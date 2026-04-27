'use client';

import { EvalScores, getScoreColor } from '@/lib/types';

interface RadarChartProps {
  scores: EvalScores;
}

export function RadarChart({ scores }: RadarChartProps) {
  const labels = [
    { key: 'socratism', label: 'Socratismo' },
    { key: 'age_fit', label: 'Ajuste edad' },
    { key: 'builds_on', label: 'Construye' },
    { key: 'openness', label: 'Apertura' },
    { key: 'advancement', label: 'Avance' },
  ];

  const maxScore = 5;
  const center = 100;
  const radius = 80;

  const points = labels.map((label, i) => {
    const angle = (Math.PI * 2 * i) / labels.length - Math.PI / 2;
    const value = (scores[label.key as keyof EvalScores] / maxScore) * radius;
    return {
      x: center + value * Math.cos(angle),
      y: center + value * Math.sin(angle),
      ...label,
    };
  });

  const polygonPoints = points.map((p) => `${p.x},${p.y}`).join(' ');
  const gridLevels = [0.2, 0.4, 0.6, 0.8, 1];

  return (
    <div className="relative">
      <svg viewBox="0 0 200 200" className="w-full max-w-[300px] mx-auto">
        {/* Grid circles */}
        {gridLevels.map((level) => (
          <circle
            key={level}
            cx={center}
            cy={center}
            r={radius * level}
            fill="none"
            stroke="currentColor"
            strokeWidth="0.5"
            className="text-gray-300 dark:text-gray-600"
          />
        ))}

        {/* Axis lines */}
        {points.map((point, i) => (
          <line
            key={i}
            x1={center}
            y1={center}
            x2={point.x}
            y2={point.y}
            stroke="currentColor"
            strokeWidth="0.5"
            className="text-gray-300 dark:text-gray-600"
          />
        ))}

        {/* Data polygon */}
        <polygon
          points={polygonPoints}
          fill="currentColor"
          fillOpacity="0.2"
          stroke="currentColor"
          strokeWidth="2"
          className="text-amber-500"
        />

        {/* Data points */}
        {points.map((point, i) => (
          <circle
            key={i}
            cx={point.x}
            cy={point.y}
            r="4"
            fill="currentColor"
            className="text-amber-500"
          />
        ))}
      </svg>

      {/* Labels */}
      <div className="absolute inset-0 pointer-events-none">
        {points.map((point, i) => (
          <div
            key={i}
            className="absolute text-xs font-medium text-gray-700 dark:text-gray-300"
            style={{
              left: `${(point.x / 200) * 100}%`,
              top: `${(point.y / 200) * 100}%`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <div className="text-center">
              <div>{point.label}</div>
              <div className={`font-bold ${getScoreColor(scores[point.key as keyof EvalScores])}`}>
                {scores[point.key as keyof EvalScores].toFixed(1)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
