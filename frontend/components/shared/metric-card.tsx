'use client';

import { LucideIcon, ArrowUp, ArrowDown } from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  /** e.g. +12 → shows "+12%" with an up arrow in emerald; negative → red */
  changePct?: number;
  /** Optional sparkline series (numbers only) */
  sparkline?: number[];
  /** Sparkline stroke color (defaults to chart-1 / blue) */
  sparkColor?: string;
}

/**
 * Dashboard tile: small uppercase label, large tracking-tight number,
 * optional change indicator and sparkline. Border, no shadow.
 */
export function MetricCard({
  label,
  value,
  icon: Icon,
  changePct,
  sparkline,
  sparkColor = 'var(--chart-1)',
}: MetricCardProps) {
  const up = (changePct ?? 0) >= 0;
  const chartData = sparkline?.map((v, i) => ({ i, v }));

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-start justify-between">
        <span className="text-xs uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground/60" />}
      </div>

      <div className="mt-2 flex items-end justify-between gap-2">
        <div>
          <div className="text-3xl font-semibold tracking-tight tabular-nums">
            {value}
          </div>
          {changePct !== undefined && (
            <div
              className={cn(
                'mt-1 flex items-center gap-0.5 text-xs',
                up ? 'text-emerald-600 dark:text-emerald-500' : 'text-red-600 dark:text-red-500'
              )}
            >
              {up ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
              {Math.abs(changePct)}%
            </div>
          )}
        </div>

        {chartData && chartData.length > 1 && (
          <div className="h-8 w-24">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id={`spark-${label}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={sparkColor} stopOpacity={0.25} />
                    <stop offset="100%" stopColor={sparkColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="v"
                  stroke={sparkColor}
                  strokeWidth={1.5}
                  fill={`url(#spark-${label})`}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
