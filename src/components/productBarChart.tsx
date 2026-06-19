/**
 * productBarChart.tsx
 * ─────────────────────────────────────────────────────────────
 * 상품별 매출 막대차트 (Recharts)
 *
 * - analyzer.products 중 상위 10개만 표시 (slice(0, 10))
 * - 나머지 품목은 대시보드 하단 테이블에서 확인
 * - X축 상품명 -30도 기울임 (긴 이름 대비)
 */

"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { ProductData } from "@/lib/analyzer";

type Props = {
  data: ProductData[];
};

const COLORS = ["#3b82f6", "#6366f1", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b"];

const CustomTooltip = ({ active, payload }: {
  active?: boolean;
  payload?: Array<{ payload: ProductData }>;
}) => {
  if (active && payload && payload.length) {
    const d = payload[0].payload;
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
        <p className="text-sm font-medium text-gray-700 mb-1">{d.product}</p>
        <p className="text-sm text-blue-600">매출: ₩{d.amount.toLocaleString()}</p>
        <p className="text-sm text-gray-500">비중: {d.percentage}%</p>
      </div>
    );
  }
  return null;
};

export default function ProductBarChart({ data }: Props) {
  const top10 = data.slice(0, 10);

  return (
    <div>
      <h3 className="text-sm font-medium text-gray-600 mb-3">상품별 매출</h3>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart
          data={top10}
          margin={{ top: 4, right: 8, left: 8, bottom: 24 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis
            dataKey="product"
            tick={{ fontSize: 10, fill: "#94a3b8" }}
            axisLine={{ stroke: "#e2e8f0" }}
            tickLine={false}
            angle={-30}
            textAnchor="end"
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${(v / 10000).toFixed(0)}만`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="amount" radius={[4, 4, 0, 0]} name="매출">
            {top10.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
