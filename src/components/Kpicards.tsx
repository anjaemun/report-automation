/**
 * Kpicards.tsx
 * ─────────────────────────────────────────────────────────────
 * KPI 4칸 카드 (총매출 / 총수량 / 거래건수 / 건당평균)
 *
 * 파일 2개 이상 업로드 시 "통합 KPI" ↔ "파일별 KPI" 토글
 * fileKpis는 analyzer가 파일명별로 계산해 넘김
 */

"use client";

import { useState } from "react";
import { KpiData } from "@/lib/analyzer";

type Props = {
  totalKpi: KpiData;
  fileKpis: Record<string, KpiData>;
};

/** 카드 1개에 표시할 지표 정의 (key = KpiData 필드명) */
const KPI_CONFIG = [
  {
    key: "totalAmount" as keyof KpiData,
    label: "총 매출",
    format: (v: number) => `₩${v.toLocaleString()}`,
    color: "blue",
  },
  {
    key: "totalQuantity" as keyof KpiData,
    label: "총 수량",
    format: (v: number) => `${v.toLocaleString()}개`,
    color: "teal",
  },
  {
    key: "totalOrders" as keyof KpiData,
    label: "거래 건수",
    format: (v: number) => `${v.toLocaleString()}건`,
    color: "purple",
  },
  {
    key: "avgOrderAmount" as keyof KpiData,
    label: "건당 평균",
    format: (v: number) => `₩${v.toLocaleString()}`,
    color: "orange",
  },
];

const COLOR_MAP: Record<string, { bg: string; text: string; icon: string }> = {
  blue: { bg: "bg-blue-50", text: "text-blue-700", icon: "text-blue-500" },
  teal: { bg: "bg-teal-50", text: "text-teal-700", icon: "text-teal-500" },
  purple: { bg: "bg-purple-50", text: "text-purple-700", icon: "text-purple-500" },
  orange: { bg: "bg-orange-50", text: "text-orange-700", icon: "text-orange-500" },
};

function KpiCard({ label, value, color }: { label: string; value: string; color: string }) {
  const c = COLOR_MAP[color];
  return (
    <div className={`rounded-xl p-4 ${c.bg}`}>
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className={`text-xl font-semibold ${c.text}`}>{value}</p>
    </div>
  );
}

export default function KpiCards({ totalKpi, fileKpis }: Props) {
  const [mode, setMode] = useState<"total" | "individual">("total");
  const fileNames = Object.keys(fileKpis);

  return (
    <div>
      {/* 파일 2개 이상일 때만 토글 표시 */}
      {fileNames.length > 1 && (
        <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1 w-fit">
          <button
            onClick={() => setMode("total")}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
              mode === "total" ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            통합 KPI
          </button>
          <button
            onClick={() => setMode("individual")}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
              mode === "individual" ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            파일별 KPI
          </button>
        </div>
      )}

      {mode === "total" && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {KPI_CONFIG.map((cfg) => (
            <KpiCard
              key={cfg.key}
              label={cfg.label}
              value={cfg.format(totalKpi[cfg.key])}
              color={cfg.color}
            />
          ))}
        </div>
      )}

      {mode === "individual" && (
        <div className="space-y-4">
          {fileNames.map((fileName) => {
            const kpi = fileKpis[fileName];
            return (
              <div key={fileName}>
                <p className="text-sm font-medium text-gray-600 mb-2 flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {fileName}
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {KPI_CONFIG.map((cfg) => (
                    <KpiCard
                      key={cfg.key}
                      label={cfg.label}
                      value={cfg.format(kpi[cfg.key])}
                      color={cfg.color}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
