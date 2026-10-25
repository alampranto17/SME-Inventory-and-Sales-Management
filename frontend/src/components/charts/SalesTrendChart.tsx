"use client";

// 📈 Line/area chart: revenue per day.
// Data comes from GET /reports/sales-summary?groupBy=day
//
// Recharts basics:
//   <ResponsiveContainer>  -> chart takes the width of its parent
//   <AreaChart data={...}> -> the list of points
//   <XAxis dataKey="date"> -> which field goes left-to-right
//   <Area dataKey="revenue"> -> which field is the height
//   <Tooltip>              -> box that shows the value when you hover
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AXIS_TICK, CHART_COLORS } from "./chartColors";
import { formatMoney, toInputDate } from "@/lib/format";

export type SalesPoint = { date: string; orderCount: number; revenue: string; profit: string };

type Props = {
  points: SalesPoint[];
  dateFrom: string; // "2026-06-01"
  dateTo: string;
};

export default function SalesTrendChart({ points, dateFrom, dateTo }: Props) {
  // The API skips days with no sales. A chart needs EVERY day,
  // so we build the full list of days and put 0 where there were no sales.
  const data = fillMissingDays(points, dateFrom, dateTo);

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
          <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={false} />
          <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={60} />
          <Tooltip
            formatter={(value) => [formatMoney(Number(value)), "Revenue"]}
            labelFormatter={(label) => `Date: ${label}`}
          />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke={CHART_COLORS.series1}
            strokeWidth={2}
            fill={CHART_COLORS.series1}
            fillOpacity={0.12}
            activeDot={{ r: 5 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function fillMissingDays(points: SalesPoint[], dateFrom: string, dateTo: string) {
  const result: { label: string; revenue: number; orders: number }[] = [];
  const day = new Date(dateFrom + "T00:00:00");
  const end = new Date(dateTo + "T00:00:00");

  while (day <= end) {
    const key = toInputDate(day);
    const found = points.find((p) => p.date === key);
    result.push({
      label: day.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      revenue: found ? Number(found.revenue) : 0,
      orders: found ? found.orderCount : 0,
    });
    day.setDate(day.getDate() + 1);
  }

  return result;
}
