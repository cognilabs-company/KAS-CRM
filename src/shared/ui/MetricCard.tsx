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
}

export function MetricCard({
  title,
  value,
  trend,
  icon: Icon,
  iconColor = 'text-primary',
  sparkline,
  loading,
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
  const sparkData = (sparkline ?? Array.from({ length: 7 }, () => Math.random() * 100)).map(
    (v) => ({ v })
  )

  return (
    <div className="kas-card p-5 group hover:border-primary/30 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-medium text-text-secondary uppercase tracking-wider">
          {title}
        </p>
        <div
          className={cn(
            'w-9 h-9 rounded-md flex items-center justify-center bg-surface-2',
            'group-hover:scale-105 transition-transform'
          )}
        >
          <Icon size={16} className={iconColor} />
        </div>
      </div>

      <div className="flex items-end justify-between">
        <div>
          <p className="text-2xl font-bold text-text-primary mb-1">{value}</p>
          {trend !== undefined && (
            <div
              className={cn(
                'flex items-center gap-1 text-xs font-medium',
                isPositive ? 'text-success' : 'text-danger'
              )}
            >
              {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              <span>
                {isPositive ? '+' : ''}
                {trend.toFixed(1)}% bu hafta
              </span>
            </div>
          )}
        </div>

        <div className="w-20 h-10 opacity-70">
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
        </div>
      </div>
    </div>
  )
}
