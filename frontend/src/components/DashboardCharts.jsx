import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, AreaChart, Area,
} from "recharts";

const STATUS_COLORS = {
  submitted: "#64748b",
  shortlist: "#0D9488",
  approved: "#10b981",
  rejected: "#ef4444",
  unknown: "#cbd5e1",
};
const STATUS_LABEL = { submitted: "Submitted", shortlist: "Shortlisted", approved: "Approved", rejected: "Rejected", unknown: "Unknown" };
const PALETTE = ["#BE185D", "#0D9488", "#9F1239", "#F59E0B", "#6366F1", "#10B981"];
const rupee = (n) => `₹ ${Number(n || 0).toLocaleString("en-IN")}`;

const ChartCard = ({ title, sub, right, testid, children }) => (
  <div data-testid={testid} className="rounded-2xl border border-rose-100 bg-white p-6">
    <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
      <div>
        <p className="text-sm font-bold text-[#22090F]">{title}</p>
        {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
      </div>
      {right}
    </div>
    {children}
  </div>
);

const CustomTooltip = ({ active, payload, label, formatter }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="rounded-lg border border-rose-100 bg-white px-3 py-2 text-xs shadow-lg">
      {label && <p className="mb-1 font-bold text-[#22090F]">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="flex items-center gap-2 text-[11.5px] text-slate-500">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: p.color || p.fill }} />
          {p.name}: <span className="font-bold text-[#22090F]">{formatter ? formatter(p.value) : p.value}</span>
        </p>
      ))}
    </div>
  );
};

export const StatusDonut = ({ data = {} }) => {
  const entries = Object.entries(data)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({ name: STATUS_LABEL[k] || k, key: k, value: v, color: STATUS_COLORS[k] || STATUS_COLORS.unknown }));
  const total = entries.reduce((n, e) => n + e.value, 0);

  return (
    <ChartCard title="Status Breakdown" sub={total ? `${total} total applications` : "Applications by current status"} testid="chart-status-donut">
      {total === 0 ? (
        <div className="grid h-56 place-items-center text-[13px] text-slate-400">No applications yet.</div>
      ) : (
        <>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={entries} dataKey="value" nameKey="name" innerRadius={45} outerRadius={72} paddingAngle={2} strokeWidth={0}>
                  {entries.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip content={(props) => <CustomTooltip {...props} />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {entries.map((e) => (
              <div key={e.key} className="flex items-center gap-2 text-xs">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: e.color }} />
                <span className="flex-1 truncate text-slate-500">{e.name}</span>
                <span className="font-bold text-[#22090F]">{e.value}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </ChartCard>
  );
};

export const CollegeBar = ({ data = [] }) => {
  const chartData = (data || []).slice(0, 6).map((d, i) => ({
    name: (d.college || "Unknown").replace(" School of Nursing", " SoN").replace(" College of Nursing", " CoN"),
    count: d.count,
    fill: PALETTE[i % PALETTE.length],
  }));

  return (
    <ChartCard title="Applications by College" sub={chartData.length ? "Distribution across colleges" : "No data yet"} testid="chart-college-bar">
      {chartData.length === 0 ? (
        <div className="grid h-56 place-items-center text-[13px] text-slate-400">No applications yet.</div>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -12, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1E7EC" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 10.5 }} axisLine={false} tickLine={false} interval={0} angle={-12} textAnchor="end" height={46} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip cursor={{ fill: "rgba(190,24,93,0.05)" }} content={(props) => <CustomTooltip {...props} />} />
              <Bar dataKey="count" name="Applications" radius={[8, 8, 0, 0]}>
                {chartData.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
};

export const RevenueArea = ({ data = [], appsByMonth = [] }) => {
  const merged = (data || []).map((d, i) => ({
    label: d.label,
    Revenue: d.amount,
    Applications: appsByMonth[i]?.count || 0,
  }));
  const totalCollected = merged.reduce((s, d) => s + Number(d.Revenue || 0), 0);

  return (
    <ChartCard
      title="Revenue & Applications"
      sub="Last 6 months"
      testid="chart-revenue-area"
      right={
        <div className="text-right">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">6-month collections</p>
          <p className="font-display text-xl font-semibold text-[#BE185D]">{rupee(totalCollected)}</p>
        </div>
      }
    >
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={merged} margin={{ top: 10, right: 4, left: -12, bottom: 0 }}>
            <defs>
              <linearGradient id="svRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#BE185D" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#BE185D" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="svAppsGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0D9488" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#0D9488" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1E7EC" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 10.5 }} axisLine={false} tickLine={false} />
            <YAxis yAxisId="left" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)} />
            <YAxis yAxisId="right" orientation="right" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip cursor={{ stroke: "#BE185D", strokeOpacity: 0.3 }} content={(props) => <CustomTooltip {...props} formatter={(v, name) => (name === "Revenue" ? rupee(v) : v)} />} />
            <Area yAxisId="left" type="monotone" dataKey="Revenue" stroke="#BE185D" strokeWidth={2.5} fill="url(#svRevenueGrad)" />
            <Area yAxisId="right" type="monotone" dataKey="Applications" stroke="#0D9488" strokeWidth={2} strokeDasharray="4 3" fill="url(#svAppsGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
};

export default { StatusDonut, CollegeBar, RevenueArea };
