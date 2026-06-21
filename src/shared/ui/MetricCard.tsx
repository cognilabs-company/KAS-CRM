import type { LucideIcon } from 'lucide-react'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { LineChart, Line, ResponsiveContainer } from 'recharts'
import { cn } from '@shared/lib/utils'

interface MetricCardProps {
  title: string
  value: string | number
  trend?: number
  icon: LucideIcon
  iconColor?: string
  sparkline?: number[]
  loading?: boolean
  context?: string
  tone?: 'blue' | 'green' | 'amber' | 'red'
}

export function MetricCard({
  title,
  value,
  trend,
  icon: Icon,
  iconColor,
  sparkline,
  loading,
  context = 'oldingi davrga nisbatan',
  tone = 'blue',
}: MetricCardProps) {
  if (loading) {
    return (
      <div className="kas-card p-5 animate-pulse">
        <div className="flex items-center justify-between mb-4">
          <div className="h-4 bg-surface-2 rounded w-28" />
          <div className="w-9 h-9 bg-surface-2 rounded-md" />
        </div>
        <div className="h-8 bg-surface-2 rounded w-20 mb-2" />
        <div className="h-3 bg-surface-2 rounded w-16" />
      </div>
    )
  }

  const isPositive = (trend ?? 0) >= 0
  const sparkData = (sparkline ?? []).map(
    (v) => ({ v })
  )
  const toneStyles = {
    blue: 'bg-primary/10 text-primary',
    green: 'bg-success/10 text-success',
    amber: 'bg-warning/10 text-warning',
    red: 'bg-danger/10 text-danger',
  }

  return (
    <div className="kas-card relative overflow-hidden p-4 sm:p-5 group hover:-translate-y-0.5 hover:border-primary/30 transition-all duration-200">
      <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-primary/60 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      <div className="flex items-start justify-between gap-3 mb-3">
        <p className="text-[11px] sm:text-xs font-medium text-text-secondary uppercase tracking-wider">
          {title}
        </p>
        <div
          className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center', toneStyles[tone],
            'group-hover:scale-105 transition-transform'
          )}
        >
          <Icon size={16} className={iconColor} />
        </div>
      </div>

      <div className="flex items-end justify-between">
        <div>
          <p className="text-xl sm:text-2xl font-bold text-text-primary mb-1">{value}</p>
          {trend !== undefined && (
            <div
              className={cn(
                'flex items-center gap-1 text-[11px] sm:text-xs font-medium',
                isPositive ? 'text-success' : 'text-danger'
              )}
            >
              {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              <span>
                {isPositive ? '+' : ''}
                {Math.abs(trend).toFixed(1)}% {context}
              </span>
            </div>
          )}
        </div>

        {sparkData.length > 1 && <div className="w-16 sm:w-20 h-10 opacity-70">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sparkData}>
              <Line
                type="monotone"
                dataKey="v"
                stroke={isPositive ? '#22C55E' : '#EF4444'}
                strokeWidth={1.5}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>}
      </div>
    </div>
  )
}
