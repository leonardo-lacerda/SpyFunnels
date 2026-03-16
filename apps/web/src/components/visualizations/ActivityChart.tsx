import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function ActivityChart({
  data,
}: {
  data: Array<{ date: string; signals: number; alerts: number }>;
}) {
  return (
    <div className="h-[320px] w-full rounded-[24px] bg-[radial-gradient(circle_at_top_left,rgba(15,23,42,0.05),transparent_45%),linear-gradient(180deg,rgba(255,255,255,0.95),rgba(248,245,239,0.85))] p-4">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 12, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="signalsFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#1d4ed8" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#1d4ed8" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="alertsFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#b45309" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#b45309" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="rgba(148,163,184,0.18)" />
          <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "#6b7280", fontSize: 12 }} />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: "#6b7280", fontSize: 12 }} />
          <Tooltip
            cursor={{ stroke: "rgba(15,23,42,0.15)", strokeDasharray: "4 4" }}
            contentStyle={{
              borderRadius: 18,
              border: "1px solid rgba(203,213,225,0.75)",
              boxShadow: "0 18px 40px rgba(15,23,42,0.12)",
              background: "rgba(255,255,255,0.96)",
            }}
          />
          <Area type="monotone" dataKey="signals" stroke="#1d4ed8" strokeWidth={2.5} fill="url(#signalsFill)" />
          <Area type="monotone" dataKey="alerts" stroke="#b45309" strokeWidth={2} fill="url(#alertsFill)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
