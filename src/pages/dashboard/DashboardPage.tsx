import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertCircle, ArrowRight, Clock, MapPin, MessageSquare, Package, RefreshCw, TrendingUp, Users } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import api from '@shared/api/axios'
import {
  mapLeadListItem,
  type BackendDashboardOverviewResponse,
  type DashboardPeriod,
} from '@shared/api/backend'
import { formatDate, formatRelative, truncate } from '@shared/lib/utils'
import { DateRangePicker } from '@shared/ui/DateRangePicker'
import { MetricCard } from '@shared/ui/MetricCard'

const CHART_COLORS = ['#2349a4', '#0d9488', '#d97706', '#e01e2d', '#7c3aed', '#0284c7', '#65a30d', '#c2410c']
const tooltipStyle = {
  background: 'rgb(var(--surface))',
  border: '1px solid rgb(var(--border))',
  borderRadius: '12px',
  boxShadow: '0 16px 40px rgb(0 0 0 / .18)',
  fontSize: '12px',
  color: 'rgb(var(--text-primary))',
}

function EmptyChart({ text }: { text: string }) {
  return <div className="grid h-[250px] place-items-center rounded-xl border border-dashed border-border bg-surface-2/25 px-5 text-center text-sm text-text-muted">{text}</div>
}

export function DashboardPage() {
  const [period, setPeriod] = useState<DashboardPeriod>('7d')
  const navigate = useNavigate()
  const queryParams = typeof period === 'object'
    ? { date_from: period.from, date_to: period.to }
    : { range: period }
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['dashboard-overview', queryParams],
    queryFn: () => api.get<BackendDashboardOverviewResponse>('/admin/dashboard/overview', { params: queryParams }).then((response) => response.data),
    staleTime: 3 * 60 * 1000,
  })

  const daily = data?.daily_leads.map((item) => ({ date: item.day, value: item.count })) ?? []
  const districts = data?.leads_by_district.map((item) => ({ name: item.district, value: item.count })) ?? []
  const stores = data?.leads_by_store.map((item) => ({ name: item.store_name, value: item.count })) ?? []
  const products = data?.top_products ?? []
  const recentLeads = data?.recent_leads.map(mapLeadListItem) ?? []
  const sparkline = daily.slice(-12).map((item) => item.value)
  const totalStoreLeads = stores.reduce((total, item) => total + item.value, 0)

  if (isError) {
    return (
      <div className="mx-auto max-w-[1560px] space-y-5 p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div><h1 className="text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">Boshqaruv paneli</h1><p className="mt-1 text-sm text-text-secondary">Savdo oqimi, mijozlar va magazinlar holati.</p></div>
          <DateRangePicker value={period} onChange={setPeriod} />
        </div>
        <div className="kas-card flex min-h-72 flex-col items-center justify-center gap-3 p-6 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-danger/10 text-danger"><AlertCircle size={22} /></span>
          <div><h2 className="font-semibold text-text-primary">Ko‘rsatkichlarni yuklab bo‘lmadi</h2><p className="mt-1 text-sm text-text-muted">Server bilan aloqani tekshirib, qayta urinib ko‘ring.</p></div>
          <button type="button" className="kas-btn-secondary mt-2" onClick={() => void refetch()}><RefreshCw size={15} /> Qayta urinish</button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1560px] space-y-5 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><div className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[.16em] text-primary"><span className="h-1.5 w-1.5 rounded-full bg-primary" /> Jonli ko‘rsatkichlar</div><h1 className="text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">Boshqaruv paneli</h1><p className="mt-1 text-sm text-text-secondary">Savdo oqimi, mijozlar va magazinlar holati.</p></div>
        <DateRangePicker value={period} onChange={setPeriod} />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Davrdagi leadlar" value={data?.leads.value ?? 0} trend={data?.leads.delta_percent} icon={TrendingUp} tone="blue" sparkline={sparkline} loading={isLoading} />
        <MetricCard title="Yangi foydalanuvchilar" value={data?.new_users.value ?? 0} trend={data?.new_users.delta_percent} icon={Users} tone="green" loading={isLoading} />
        <MetricCard title="Faol chatlar" value={data?.active_chats.value ?? 0} trend={data?.active_chats.delta_percent} icon={MessageSquare} tone="amber" loading={isLoading} />
        <MetricCard title="Jami magazinlar" value={data?.stores.value ?? 0} trend={data?.stores.delta_percent} icon={MapPin} tone="red" context="davr boshiga nisbatan" loading={isLoading} />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <section className="kas-card p-4 sm:p-6 xl:col-span-8">
          <div className="mb-5 flex items-start justify-between"><div><h2 className="font-semibold text-text-primary">Leadlar dinamikasi</h2><p className="mt-0.5 text-xs text-text-muted">Kunlik yangi murojaatlar</p></div><span className="rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">{data?.leads.value ?? 0} jami</span></div>
          {daily.some((item) => item.value > 0) ? <ResponsiveContainer width="100%" height={280}><AreaChart data={daily} margin={{ left: -16, right: 8, top: 8, bottom: 0 }}><defs><linearGradient id="kasLeadArea" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="rgb(var(--primary))" stopOpacity={0.38} /><stop offset="100%" stopColor="rgb(var(--primary))" stopOpacity={0.02} /></linearGradient></defs><CartesianGrid vertical={false} stroke="rgb(var(--border))" strokeOpacity={.55} /><XAxis dataKey="date" tickFormatter={(value: string) => value.slice(5)} tick={{ fill: 'rgb(var(--text-muted))', fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={24} /><YAxis allowDecimals={false} tick={{ fill: 'rgb(var(--text-muted))', fontSize: 11 }} axisLine={false} tickLine={false} width={34} /><Tooltip contentStyle={tooltipStyle} labelFormatter={(value) => formatDate(String(value))} formatter={(value: number) => [value, 'Leadlar']} /><Area type="monotone" dataKey="value" stroke="rgb(var(--primary))" strokeWidth={2.5} fill="url(#kasLeadArea)" activeDot={{ r: 5, strokeWidth: 3, fill: 'rgb(var(--surface))' }} /></AreaChart></ResponsiveContainer> : <EmptyChart text="Tanlangan davrda lead ma’lumoti yo‘q" />}
        </section>

        <section className="kas-card p-4 sm:p-6 xl:col-span-4">
          <div className="mb-5"><h2 className="font-semibold text-text-primary">Magazinlar ulushi</h2><p className="mt-0.5 text-xs text-text-muted">Leadlar biriktirilishi</p></div>
          {stores.length ? <div className="grid items-center gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2"><ResponsiveContainer width="100%" height={210}><PieChart><Pie data={stores} dataKey="value" nameKey="name" innerRadius={55} outerRadius={82} paddingAngle={3} stroke="none">{stores.map((item, index) => <Cell key={item.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}</Pie><Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [value, 'Leadlar']} /></PieChart></ResponsiveContainer><div className="space-y-2.5">{stores.slice(0, 5).map((store, index) => <div key={store.name} className="flex items-center gap-2 text-xs"><span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} /><span className="min-w-0 flex-1 truncate text-text-secondary">{store.name}</span><span className="font-bold text-text-primary">{totalStoreLeads ? Math.round(store.value / totalStoreLeads * 100) : 0}%</span></div>)}</div></div> : <EmptyChart text="Magazin taqsimoti hali mavjud emas" />}
        </section>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <section className="kas-card p-4 sm:p-6"><div className="mb-5"><h2 className="font-semibold text-text-primary">Hududlar bo‘yicha</h2><p className="mt-0.5 text-xs text-text-muted">Eng faol tumanlar</p></div>{districts.length ? <ResponsiveContainer width="100%" height={260}><BarChart data={districts} layout="vertical" margin={{ left: 4, right: 18 }}><XAxis type="number" hide /><YAxis type="category" dataKey="name" width={90} tick={{ fill: 'rgb(var(--text-secondary))', fontSize: 11 }} axisLine={false} tickLine={false} /><Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [value, 'Leadlar']} /><Bar dataKey="value" radius={[0, 7, 7, 0]} barSize={18}>{districts.map((item, index) => <Cell key={item.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}</Bar></BarChart></ResponsiveContainer> : <EmptyChart text="Hudud statistikasi hali mavjud emas" />}</section>

        <section className="kas-card p-4 sm:p-6"><div className="mb-5 flex items-start justify-between"><div><h2 className="font-semibold text-text-primary">Ko‘p so‘ralgan mahsulotlar</h2><p className="mt-0.5 text-xs text-text-muted">Mijoz qiziqishi bo‘yicha</p></div><Package size={18} className="text-primary" /></div>{products.length ? <div className="space-y-4">{products.map((product, index) => { const max = products[0]?.count || 1; return <div key={product.product_name}><div className="mb-1.5 flex items-center gap-3"><span className="grid h-6 w-6 place-items-center rounded-md bg-surface-2 text-[10px] font-bold text-text-muted">{index + 1}</span><span className="min-w-0 flex-1 truncate text-sm font-medium text-text-primary">{product.product_name}</span><span className="text-xs font-bold text-text-secondary">{product.count}</span></div><div className="ml-9 h-1.5 overflow-hidden rounded-full bg-surface-2"><div className="h-full rounded-full transition-all duration-700" style={{ width: `${product.count / max * 100}%`, backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} /></div></div>})}</div> : <EmptyChart text="Mahsulot statistikasi hali mavjud emas" />}</section>
      </div>

      <section className="kas-card overflow-hidden"><div className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-6"><div><h2 className="font-semibold text-text-primary">So‘nggi leadlar</h2><p className="mt-0.5 text-xs text-text-muted">Yaqinda kelgan mijoz so‘rovlari</p></div><Link to="/leads" className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary-hover">Barchasi <ArrowRight size={14} /></Link></div><div className="overflow-x-auto"><table className="kas-table"><thead><tr><th>Mijoz</th><th>Mahsulotlar</th><th>Magazin</th><th>Vaqt</th></tr></thead><tbody>{isLoading ? Array.from({ length: 5 }).map((_, index) => <tr key={index}>{Array.from({ length: 4 }).map((__, cell) => <td key={cell}><div className="h-4 w-3/4 animate-pulse rounded bg-surface-2" /></td>)}</tr>) : recentLeads.length ? recentLeads.map((lead) => <tr key={lead.id} onClick={() => navigate(`/leads?leadId=${encodeURIComponent(lead.id)}`)}><td><p className="font-semibold text-text-primary">{lead.fullName}</p><p className="text-xs text-text-muted">{lead.username ? `@${lead.username}` : `#${lead.id.slice(-6)}`}</p></td><td><div className="flex max-w-sm flex-wrap gap-1">{lead.products.slice(0, 2).map((product) => <span key={product.id} className="kas-badge bg-surface-2 text-text-secondary">{truncate(product.name, 22)}</span>)}{lead.products.length > 2 && <span className="kas-badge bg-primary/10 text-primary">+{lead.products.length - 2}</span>}</div></td><td className="text-text-secondary">{lead.nearestStore?.name ?? 'Biriktirilmagan'}</td><td><span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs text-text-muted"><Clock size={13} />{formatRelative(lead.createdAt)}</span></td></tr>) : <tr><td colSpan={4} className="py-10 text-center text-sm text-text-muted">Hozircha leadlar mavjud emas</td></tr>}</tbody></table></div></section>
    </div>
  )
}
