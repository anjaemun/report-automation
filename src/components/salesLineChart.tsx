/**
 * salesLineChart.tsx
 * ─────────────────────────────────────────────────────────────
 * 일별 매출 추이 선차트 (Recharts)
 *
 * - data: analyzer.daily (날짜 오름차순)
 * - X축: MM/dd 라벨
 * - Y축: 만원 단위
 * - 날짜가 많아지면 x축 라벨이 겹칠 수 있음 (고정 높이 240px)
 */

"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { DailyData } from "@/lib/analyzer";
import { format, parseISO } from "date-fns";

type Props = {
  data: DailyData[];
};

/** 마우스 호버 시 나오는 툴팁 */
const CustomTooltip = ({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
        <p className="text-sm font-medium text-gray-700 mb-1">{label}</p>
        <p className="text-sm text-blue-600">
          매출: ₩{payload[0].value.toLocaleString()}
        </p>
      </div>
    );
  }
  return null;
};

export default function SalesLineChart({ data }: Props) {
  const formatted = data.map((d) => ({
    ...d,
    dateLabel: format(parseISO(d.date), "MM/dd"),
  }));

  return (
    <div>
      <h3 className="text-sm font-medium text-gray-600 mb-3">매출 추이</h3>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={formatted} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="dateLabel"
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            axisLine={{ stroke: "#e2e8f0" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${(v / 10000).toFixed(0)}만`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="amount"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ r: 3, fill: "#3b82f6", strokeWidth: 0 }}
            activeDot={{ r: 5, fill: "#1d4ed8" }}
            name="매출"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
