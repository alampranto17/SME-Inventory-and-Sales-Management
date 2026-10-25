"use client";

// 📊 Super admin: how much we BILLED vs. how much we COLLECTED each month.
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AXIS_TICK, CHART_COLORS } from "./chartColors";
import { formatMoney } from "@/lib/format";

export type BillingPoint = { month: string; billed: number; collected: number };

export default function BillingChart({ points }: { points: BillingPoint[] }) {
  // "2026-10" -> "Oct 2026"
  const data = points.map((p) => ({
    ...p,
    label: new Date(p.month + "-01T00:00:00").toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    }),
  }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }} barGap={2}>
          <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
          <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={false} />
          <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={60} />
          <Tooltip cursor={{ fill: "#f1f5f9" }} formatter={(value) => formatMoney(Number(value))} />
          <Legend verticalAlign="top" height={28} iconType="circle" />
          <Bar dataKey="billed" name="Billed" fill={CHART_COLORS.series1} radius={[4, 4, 0, 0]} maxBarSize={32} />
          <Bar dataKey="collected" name="Collected" fill={CHART_COLORS.series2} radius={[4, 4, 0, 0]} maxBarSize={32} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
