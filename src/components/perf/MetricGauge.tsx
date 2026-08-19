import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import type { MetricRating } from '@/src/types/perf';
import { useTranslation } from '@/src/hooks/useTranslation';

interface MetricGaugeProps {
  name: string;
  shortName: string;
  value?: number | null;
  unit: string;
  rating?: MetricRating;
  goodThreshold: string;
  poorThreshold: string;
  description: string;
}

export const MetricGauge: React.FC<MetricGaugeProps> = ({
  name,
  shortName,
  value,
  unit,
  rating = 'good',
  goodThreshold,
  poorThreshold,
  description,
}) => {
  const { t } = useTranslation();

  const formattedValue =
    value === undefined || value === null || isNaN(value)
      ? '---'
      : unit === 'ms'
      ? `${Math.round(value)} ms`
      : unit === 's'
      ? `${(value / 1000).toFixed(2)} s`
      : `${value.toFixed(3)}`;

  const getRatingTheme = (r: MetricRating) => {
    switch (r) {
      case 'good':
        return {
          color: 'text-emerald-400',
          bg: 'bg-emerald-950/40',
          border: 'border-emerald-700/80',
          badgeBg: 'bg-emerald-950 text-emerald-300 border-emerald-800',
          label: t('perf.good'),
          icon: TrendingDown,
        };
      case 'needs-improvement':
        return {
          color: 'text-amber-400',
          bg: 'bg-amber-950/40',
          border: 'border-amber-700/80',
          badgeBg: 'bg-amber-950 text-amber-300 border-amber-800',
          label: t('perf.needsImprovement'),
          icon: Minus,
        };
      case 'poor':
        return {
          color: 'text-rose-400',
          bg: 'bg-rose-950/40',
          border: 'border-rose-700/80',
          badgeBg: 'bg-rose-950 text-rose-300 border-rose-800',
          label: t('perf.poor'),
          icon: TrendingUp,
        };
    }
  };

  const theme = getRatingTheme(rating);
  const StatusIcon = theme.icon;

  return (
    <div
      className={`rounded-lg border p-3.5 flex flex-col font-sans transition-all bg-stone-900/90 ${theme.border} shadow-xs`}
    >
      {/* Metric Header */}
      <div className="flex items-center justify-between pb-2 border-b border-stone-800/80">
        <div className="flex items-center space-x-1.5 min-w-0">
          <span className="font-bold text-stone-100 text-xs font-mono">{shortName}</span>
          <span className="text-stone-400 text-[11px] truncate" title={name}>
            - {name}
          </span>
        </div>
        <span
          className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border flex items-center space-x-1 shrink-0 ${theme.badgeBg}`}
        >
          <StatusIcon className="w-2.5 h-2.5" />
          <span>{theme.label}</span>
        </span>
      </div>

      {/* Main Metric Value Display */}
      <div className="py-3 flex items-baseline justify-between">
        <div className="flex items-baseline space-x-1 font-mono">
          <span className={`text-2xl font-extrabold ${theme.color}`}>{formattedValue}</span>
        </div>
      </div>

      {/* Threshold Reference Footnote */}
      <div className="pt-2 border-t border-stone-800/60 flex items-center justify-between text-[10px] text-stone-400 font-mono">
        <span className="text-emerald-400">Good: {goodThreshold}</span>
        <span className="text-rose-400">Poor: {poorThreshold}</span>
      </div>

      <p className="text-[10px] text-stone-500 mt-2 font-sans line-clamp-2" title={description}>
        {description}
      </p>
    </div>
  );
};
