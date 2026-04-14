import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Clock, MapPin, MessageSquare, TrendingUp, Users } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Bar,
  BarChart,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import api from '@shared/api/axios'
import {
  mapDashboardStats,
  mapLeadListItem,
  mapLeadsDynamics,
  mapRegionData,
  mapTopProducts,
  type BackendDashboardStatsResponse,
  type BackendLeadsDynamicsResponse,
} from '@shared/api/backend'
import { formatDate, formatRelative, truncate } from '@shared/lib/utils'
import { MetricCard } from '@shared/ui/MetricCard'

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
  const navigate = useNavigate()

  const { data: statsResponse, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () =>
      api.get<BackendDashboardStatsResponse>('/admin/dashboard/stats').then((response) => response.data),
    staleTime: 5 * 60 * 1000,
  })

  const { data: leadsChart } = useQuery({
    queryKey: ['dashboard-leads-chart', period],
    queryFn: () =>
      api
        .get<BackendLeadsDynamicsResponse>('/admin/dashboard/leads-dynamics', {
          params: { days: period === '7d' ? 7 : 30 },
        })
        .then((response) => mapLeadsDynamics(response.data)),
    staleTime: 5 * 60 * 1000,
  })

  const stats = statsResponse ? mapDashboardStats(statsResponse) : null
  const regionsChart = statsResponse ? mapRegionData(statsResponse.leads_by_district) : []
  const hasRegionsData = regionsChart.some((region) => region.leads > 0)
  const topProducts = statsResponse ? mapTopProducts(statsResponse.top_products) : []
  const recentLeads = statsResponse?.recent_leads.map(mapLeadListItem) ?? []

  function openLeadDetails(leadId: string) {
    navigate(`/leads?leadId=${encodeURIComponent(leadId)}`)
  }

  return (
    <div className="p-4 sm:p-6 max-w-content mx-auto space-y-4 sm:space-y-6">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">KAS CRM tizimiga xush kelibsiz</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
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
          value={stats?.totalUsers ?? 0}
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

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="kas-card p-5 xl:col-span-2">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-text-primary">Leadlar dinamikasi</h2>
              <p className="text-xs text-text-muted mt-0.5">Vaqt bo&apos;yicha so&apos;rovlar</p>
            </div>
            <div className="flex w-full sm:w-auto items-center gap-1 bg-surface-2 rounded-md p-0.5">
              {(['7d', '30d'] as Period[]).map((value) => (
                <button
                  key={value}
                  onClick={() => setPeriod(value)}
                  className={`flex-1 sm:flex-none px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                    period === value
                      ? 'bg-primary text-white'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {value === '7d' ? '7 kun' : '30 kun'}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={leadsChart ?? []}>
              <XAxis
                dataKey="date"
                tickFormatter={(value: string) => value.slice(5)}
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
                labelFormatter={(value: unknown) =>
                  typeof value === 'string' || value instanceof Date ? formatDate(value) : String(value)
                }
                formatter={(value: number) => [value, 'Leadlar']}
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

        <div className="kas-card p-5">
          <div className="mb-5">
            <h2 className="text-sm font-semibold text-text-primary">Eng ko&apos;p so&apos;ralgan</h2>
            <p className="text-xs text-text-muted mt-0.5">Top 5 mahsulot</p>
          </div>
          {topProducts.length > 0 ? (
            <div className="space-y-3">
              {topProducts.map((product, index) => {
                const max = topProducts[0]?.requests ?? 1
                const percent = Math.round((product.requests / max) * 100)
                return (
                  <div key={product.id}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-text-muted w-4">{index + 1}</span>
                        <span className="text-xs text-text-primary truncate max-w-[220px] sm:max-w-[180px]">
                          {product.name}
                        </span>
                      </div>
                      <span className="text-xs font-medium text-text-secondary">
                        {product.requests}
                      </span>
                    </div>
                    <div className="h-1 bg-surface-2 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-sm text-text-muted">Mahsulot statistikasi topilmadi</div>
          )}
        </div>
      </div>

      <div className="kas-card p-5">
        <div className="mb-5">
          <h2 className="text-sm font-semibold text-text-primary">Hududlar bo&apos;yicha leadlar</h2>
          <p className="text-xs text-text-muted mt-0.5">Tumanlar bo&apos;yicha taqsimot</p>
        </div>
        {hasRegionsData ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={regionsChart} barSize={24}>
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
                formatter={(value: number) => [value, 'Leadlar']}
              />
              <Bar dataKey="leads" fill="#4F6EF7" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-[220px] items-center justify-center rounded-md border border-dashed border-border bg-surface-2/30 px-4 text-center text-sm text-text-muted">
            Hududlar bo&apos;yicha lead statistikasi hali yo&apos;q
          </div>
        )}
      </div>

      <div className="kas-card">
        <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-4 border-b border-border">
          <div>
            <h2 className="text-sm font-semibold text-text-primary">So&apos;nggi leadlar</h2>
            <p className="text-xs text-text-muted mt-0.5">Oxirgi so&apos;rovlar</p>
          </div>
          <Link
            to="/leads"
            className="flex items-center gap-1 text-xs text-primary hover:text-primary-hover transition-colors"
          >
            Barchasini ko&apos;rish <ArrowRight size={12} />
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
              {statsLoading
                ? Array.from({ length: 5 }).map((_, index) => (
                    <tr key={index} className="!cursor-default">
                      {Array.from({ length: 5 }).map((__, cellIndex) => (
                        <td key={cellIndex}>
                          <div className="h-4 bg-surface-2 rounded animate-pulse w-3/4" />
                        </td>
                      ))}
                    </tr>
                  ))
                : recentLeads.map((lead) => (
                    <tr key={lead.id} onClick={() => openLeadDetails(lead.id)}>
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
                          {lead.products.slice(0, 2).map((product) => (
                            <span
                              key={product.id}
                              className="kas-badge bg-surface-2 text-text-secondary text-xs"
                            >
                              {truncate(product.name, 18)}
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
                          {lead.nearestStore?.name ?? '-'}
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
