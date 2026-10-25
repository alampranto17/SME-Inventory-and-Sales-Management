"use client";

// 📦 Bar chart: stock of each product vs. its reorder level.
// If the blue bar is shorter than the orange bar -> time to buy more.
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

export type StockItem = {
  name: string;
  currentStock: number;
  reorderLevel: number;
};

export default function StockLevelChart({ items }: { items: StockItem[] }) {
  if (items.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-500">No products yet.</p>;
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        {/* barGap={2} -> small space between the 2 bars of one product */}
        <BarChart data={items} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={2}>
          <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
          <XAxis dataKey="name" tick={AXIS_TICK} tickLine={false} axisLine={false} interval={0} angle={-20} textAnchor="end" height={60} />
          <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={40} allowDecimals={false} />
          <Tooltip cursor={{ fill: "#f1f5f9" }} />
          <Legend verticalAlign="top" height={28} iconType="circle" />
          <Bar dataKey="currentStock" name="In stock" fill={CHART_COLORS.series1} radius={[4, 4, 0, 0]} maxBarSize={28} />
          <Bar dataKey="reorderLevel" name="Reorder level" fill={CHART_COLORS.series2} radius={[4, 4, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
