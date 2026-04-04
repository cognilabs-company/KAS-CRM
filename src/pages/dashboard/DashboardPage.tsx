import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Users, MessageSquare, MapPin, TrendingUp,
  ArrowRight, Clock,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import api from '@shared/api/axios'
import { MetricCard } from '@shared/ui/MetricCard'
import { formatDate, formatRelative, truncate } from '@shared/lib/utils'
import type {
  DashboardStats, ChartDataPoint, RegionData, TopProduct, Lead,
} from '@shared/types/api'

const CHART_STYLE = {
  tooltip: {
    contentStyle: {
      background: '#1C1C26',
      border: '1px solid #2A2A3A',
      borderRadius: '8px',
      fontSize: '12px',
      color: '#F0F0F5',
    },
    cursor: { stroke: '#2A2A3A' },
  },
}

type Period = '7d' | '30d'

export function DashboardPage() {
  const [period, setPeriod] = useState<Period>('7d')

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.get<DashboardStats>('/dashboard/stats').then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  })

  const { data: leadsChart } = useQuery({
    queryKey: ['dashboard-leads-chart', period],
    queryFn: () =>
      api.get<ChartDataPoint[]>(`/dashboard/chart/leads?period=${period}`).then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  })

  const { data: regionsChart } = useQuery({
    queryKey: ['dashboard-regions'],
    queryFn: () => api.get<RegionData[]>('/dashboard/chart/regions').then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  })

  const { data: topProducts } = useQuery({
    queryKey: ['dashboard-top-products'],
    queryFn: () => api.get<TopProduct[]>('/dashboard/top-products').then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  })

  const { data: recentLeads, isLoading: leadsLoading } = useQuery({
    queryKey: ['recent-leads'],
    queryFn: () =>
      api.get<{ data: Lead[] }>('/leads?limit=10').then((r) => r.data.data),
    staleTime: 5 * 60 * 1000,
  })

  return (
    <div className="p-6 max-w-content mx-auto space-y-6">
      {/* Page header */}
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">KAS CRM tizimiga xush kelibsiz</p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard
          title="Bugungi Leadlar"
          value={stats?.todayLeads ?? 0}
          trend={stats?.todayLeadsTrend}
          icon={TrendingUp}
          iconColor="text-primary"
          loading={statsLoading}
        />
        <MetricCard
          title="Jami Foydalanuvchilar"
          value={stats ? `${(stats.totalUsers / 1000).toFixed(1)}k` : '0'}
          trend={stats?.totalUsersTrend}
          icon={Users}
          iconColor="text-success"
          loading={statsLoading}
        />
        <MetricCard
          title="Faol Chatlar"
          value={stats?.activeChats ?? 0}
          trend={stats?.activeChatsTrend}
          icon={MessageSquare}
          iconColor="text-warning"
          loading={statsLoading}
        />
        <MetricCard
          title="Magazinlar Soni"
          value={stats?.totalStores ?? 0}
          trend={stats?.totalStoresTrend}
          icon={MapPin}
          iconColor="text-danger"
          loading={statsLoading}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Leads dynamics */}
        <div className="kas-card p-5 xl:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-semibold text-text-primary">Leadlar dinamikasi</h2>
              <p className="text-xs text-text-muted mt-0.5">Vaqt bo'yicha so'rovlar</p>
            </div>
            <div className="flex items-center gap-1 bg-surface-2 rounded-md p-0.5">
              {(['7d', '30d'] as Period[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                    period === p
                      ? 'bg-primary text-white'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {p === '7d' ? '7 kun' : '30 kun'}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={leadsChart ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2A2A3A" />
              <XAxis
                dataKey="date"
                tickFormatter={(v: string) => v.slice(5)}
                tick={{ fill: '#8B8BA0', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#8B8BA0', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={30}
              />
              <Tooltip
                {...CHART_STYLE.tooltip}
                labelFormatter={(v: string) => formatDate(v)}
                formatter={(v: number) => [v, 'Leadlar']}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#4F6EF7"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: '#4F6EF7' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Top products */}
        <div className="kas-card p-5">
          <div className="mb-5">
            <h2 className="text-sm font-semibold text-text-primary">Eng ko'p so'ralgan</h2>
            <p className="text-xs text-text-muted mt-0.5">Top 5 mahsulot</p>
          </div>
          {topProducts ? (
            <div className="space-y-3">
              {topProducts.map((prod, i) => {
                const max = topProducts[0]?.requests ?? 1
                const pct = Math.round((prod.requests / max) * 100)
                return (
                  <div key={prod.id}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-text-muted w-4">{i + 1}</span>
                        <span className="text-xs text-text-primary truncate max-w-[140px]">
                          {prod.name}
                        </span>
                      </div>
                      <span className="text-xs font-medium text-text-secondary">
                        {prod.requests}
                      </span>
                    </div>
                    <div className="h-1 bg-surface-2 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-3 bg-surface-2 rounded w-3/4 mb-1" />
                  <div className="h-1 bg-surface-2 rounded" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Regions bar chart */}
      <div className="kas-card p-5">
        <div className="mb-5">
          <h2 className="text-sm font-semibold text-text-primary">Hududlar bo'yicha leadlar</h2>
          <p className="text-xs text-text-muted mt-0.5">Toshkent tumanlari bo'yicha taqsimot</p>
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={regionsChart ?? []} barSize={24}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2A2A3A" vertical={false} />
            <XAxis
              dataKey="district"
              tick={{ fill: '#8B8BA0', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#8B8BA0', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={30}
            />
            <Tooltip
              {...CHART_STYLE.tooltip}
              formatter={(v: number) => [v, 'Leadlar']}
            />
            <Bar dataKey="leads" fill="#4F6EF7" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Recent leads table */}
      <div className="kas-card">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h2 className="text-sm font-semibold text-text-primary">So'nggi leadlar</h2>
            <p className="text-xs text-text-muted mt-0.5">Oxirgi 10 ta so'rov</p>
          </div>
          <Link
            to="/leads"
            className="flex items-center gap-1 text-xs text-primary hover:text-primary-hover transition-colors"
          >
            Barchasini ko'rish <ArrowRight size={12} />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="kas-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Ism</th>
                <th>Mahsulotlar</th>
                <th>Magazin</th>
                <th>Vaqt</th>
              </tr>
            </thead>
            <tbody>
              {leadsLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="!cursor-default">
                      {Array.from({ length: 5 }).map((__, j) => (
                        <td key={j}>
                          <div className="h-4 bg-surface-2 rounded animate-pulse w-3/4" />
                        </td>
                      ))}
                    </tr>
                  ))
                : recentLeads?.map((lead) => (
                    <tr key={lead.id}>
                      <td>
                        <span className="font-mono text-xs text-text-muted">
                          {lead.id.slice(-6)}
                        </span>
                      </td>
                      <td>
                        <div>
                          <p className="font-medium text-text-primary">{lead.fullName}</p>
                          {lead.username && (
                            <p className="text-xs text-text-muted">@{lead.username}</p>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-1">
                          {lead.products.slice(0, 2).map((p) => (
                            <span
                              key={p.id}
                              className="kas-badge bg-surface-2 text-text-secondary text-xs"
                            >
                              {truncate(p.name, 18)}
                            </span>
                          ))}
                          {lead.products.length > 2 && (
                            <span className="kas-badge bg-surface-2 text-text-muted">
                              +{lead.products.length - 2}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className="text-text-secondary">
                          {lead.nearestStore?.name ?? '—'}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-1 text-text-muted">
                          <Clock size={12} />
                          <span className="text-xs">{formatRelative(lead.createdAt)}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
