/**
 * insightPanel.tsx
 * ─────────────────────────────────────────────────────────────
 * analyzer.insights 객체를 6개 카드로 표시
 * 문장은 analyzer에서 이미 한글로 포맷되어 옴
 */

"use client";

import { InsightComment } from "@/lib/analyzer";

type Props = {
  insights: InsightComment;
};

/** 카드 메타정보: insights 객체의 key와 1:1 매칭 */
const INSIGHT_ITEMS = [
  {
    key: "momChange" as keyof InsightComment,
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
    label: "전월 대비",
    color: "blue",
  },
  {
    key: "topProduct" as keyof InsightComment,
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
      </svg>
    ),
    label: "최고 매출 상품",
    color: "yellow",
  },
  {
    key: "topProductShare" as keyof InsightComment,
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
      </svg>
    ),
    label: "상품 매출 비중",
    color: "purple",
  },
  {
    key: "peakDate" as keyof InsightComment,
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    label: "최고 매출 일자",
    color: "teal",
  },
  {
    key: "peakDateAmount" as keyof InsightComment,
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    label: "최고 매출 금액",
    color: "green",
  },
  {
    key: "avgDailySales" as keyof InsightComment,
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    label: "일평균 매출",
    color: "orange",
  },
];

const COLOR_MAP: Record<string, { bg: string; icon: string; value: string }> = {
  blue: { bg: "bg-blue-50 border-blue-100", icon: "text-blue-500", value: "text-blue-700" },
  yellow: { bg: "bg-yellow-50 border-yellow-100", icon: "text-yellow-500", value: "text-yellow-700" },
  purple: { bg: "bg-purple-50 border-purple-100", icon: "text-purple-500", value: "text-purple-700" },
  teal: { bg: "bg-teal-50 border-teal-100", icon: "text-teal-500", value: "text-teal-700" },
  green: { bg: "bg-green-50 border-green-100", icon: "text-green-500", value: "text-green-700" },
  orange: { bg: "bg-orange-50 border-orange-100", icon: "text-orange-500", value: "text-orange-700" },
};

export default function InsightPanel({ insights }: Props) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
        <h3 className="text-sm font-medium text-gray-600">자동 인사이트</h3>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {INSIGHT_ITEMS.map((item) => {
          const c = COLOR_MAP[item.color];
          return (
            <div key={item.key} className={`rounded-lg border p-3 ${c.bg}`}>
              <div className={`mb-1 ${c.icon}`}>{item.icon}</div>
              <p className="text-xs text-gray-500 mb-0.5">{item.label}</p>
              <p className={`text-sm font-medium ${c.value}`}>{insights[item.key]}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
