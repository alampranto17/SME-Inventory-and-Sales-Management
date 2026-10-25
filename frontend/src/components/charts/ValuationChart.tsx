"use client";

// 💰 Bar chart: value of stock for each product at cost price vs. selling price.
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

export type ValuationItem = {
  productName: string;
  qty: number;
  costValue: string;
  retailValue: string;
};

export default function ValuationChart({ items }: { items: ValuationItem[] }) {
  if (items.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-500">No stock yet.</p>;
  }

  // recharts needs numbers, the API sends strings ("20400.00")
  const data = items.map((item) => ({
    name: item.productName,
    cost: Number(item.costValue),
    retail: Number(item.retailValue),
  }));

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }} barGap={2}>
          <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
          <XAxis dataKey="name" tick={AXIS_TICK} tickLine={false} axisLine={false} interval={0} angle={-20} textAnchor="end" height={60} />
          <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={60} />
          <Tooltip cursor={{ fill: "#f1f5f9" }} formatter={(value) => formatMoney(Number(value))} />
          <Legend verticalAlign="top" height={28} iconType="circle" />
          <Bar dataKey="cost" name="At cost price" fill={CHART_COLORS.series1} radius={[4, 4, 0, 0]} maxBarSize={28} />
          <Bar dataKey="retail" name="At selling price" fill={CHART_COLORS.series2} radius={[4, 4, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
