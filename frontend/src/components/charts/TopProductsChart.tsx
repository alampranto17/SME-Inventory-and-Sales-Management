"use client";

// 📊 Horizontal bar chart: best selling products (quantity sold).
// Data comes from GET /reports/top-products
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AXIS_TICK, CHART_COLORS } from "./chartColors";
import { formatMoney } from "@/lib/format";

export type TopProduct = {
  rank: number;
  productId: string;
  productName: string;
  qtySold: number;
  revenue: string;
};

export default function TopProductsChart({ products }: { products: TopProduct[] }) {
  if (products.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-500">No sales in this period.</p>;
  }

  // taller chart when there are more bars
  const height = Math.max(160, products.length * 36);

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        {/* layout="vertical" -> bars go left to right */}
        <BarChart data={products} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={CHART_COLORS.grid} horizontal={false} />
          <XAxis type="number" tick={AXIS_TICK} tickLine={false} axisLine={false} allowDecimals={false} />
          <YAxis type="category" dataKey="productName" tick={AXIS_TICK} tickLine={false} axisLine={false} width={130} />
          <Tooltip
            cursor={{ fill: "#f1f5f9" }}
            formatter={(value, _name, item) => [
              `${value} sold · ${formatMoney(item.payload.revenue)}`,
              "Sales",
            ]}
          />
          <Bar dataKey="qtySold" fill={CHART_COLORS.series1} radius={[0, 4, 4, 0]} barSize={18} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
