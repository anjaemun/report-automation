/**
 * app/dashboard/page.tsx — 매출 대시보드
 * ─────────────────────────────────────────────────────────────
 * 사용자 여정 2단계:
 *   sessionStorage에서 rows 읽기 → analyze() → 차트/KPI 렌더링 → PDF 저장
 *
 * 데이터 소스: sessionStorage "dashboardData" (홈에서 저장 후 push)
 * sessionStorage 없으면 / 로 리다이렉트
 *
 * id="pdf-*" 섹션: pdfExporter.ts가 PDF 캡처할 DOM 영역
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ParsedRow } from "@/lib/excelParser";
import { analyze, AnalysisResult } from "@/lib/analyzer";
import { SalesRecord } from "@/lib/supabase";
import KpiCards from "@/components/Kpicards";
import SalesLineChart from "@/components/salesLineChart";
import ProductBarChart from "@/components/productBarChart";
import InsightPanel from "@/components/insightPanel";
import PdfExportButton from "@/components/PdfExportButton";

/** 홈 page.tsx가 sessionStorage에 저장하는 JSON 구조 */
type SessionData = {
  rows: ParsedRow[];
  fileNames: string[];
  sessionId: string;
};

export default function DashboardPage() {
  const router = useRouter();
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [sessionId, setSessionId] = useState<string>("");

  useEffect(() => {
    const raw = sessionStorage.getItem("dashboardData");
    if (!raw) {
      router.replace("/");
      return;
    }

    try {
      const data: SessionData = JSON.parse(raw);
      setFileNames(data.fileNames);
      setSessionId(data.sessionId);

      // ParsedRow → SalesRecord (analyzer 입력 형식)
      const records: SalesRecord[] = data.rows.map((r) => ({
        session_id: data.sessionId,
        file_name: r.fileName,
        date: r.date,
        product: r.product,
        amount: r.amount,
        quantity: r.quantity,
      }));

      const result = analyze(records);
      setAnalysis(result);
    } catch (err) {
      console.error(err);
      router.replace("/");
    }
  }, [router]);

  // analyze 완료 전 로딩 UI
  if (!analysis) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <svg className="w-8 h-8 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-gray-500 text-sm">데이터 분석 중...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* 상단 고정 헤더 */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/")}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-base font-semibold text-gray-900">매출 대시보드</h1>
              <p className="text-xs text-gray-400">{fileNames.join(", ")}</p>
            </div>
          </div>
          <PdfExportButton fileNames={fileNames} />
        </div>
      </div>

      <div id="dashboard-content" className="max-w-5xl mx-auto px-4 py-6 space-y-6">

        {/* PDF 섹션 1: KPI */}
        <section id="pdf-kpi" className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <KpiCards totalKpi={analysis.kpi} fileKpis={analysis.fileKpis} />
        </section>

        {/* PDF 섹션 2: 인사이트 */}
        <section id="pdf-insights" className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <InsightPanel insights={analysis.insights} />
        </section>

        {/* PDF 섹션 3·4: 차트 (모바일 1열, md 이상 2열) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <section id="pdf-chart-line" className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <SalesLineChart data={analysis.daily} />
          </section>
          <section id="pdf-chart-bar" className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <ProductBarChart data={analysis.products} />
          </section>
        </div>

        {/* PDF 섹션 5: 상품별 상세 테이블 (전체 품목, 막대차트는 상위 10개만) */}
        <section id="pdf-table" className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <h3 className="text-sm font-medium text-gray-600 mb-3">상품별 매출 상세</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 pr-4 text-gray-500 font-medium">상품</th>
                  <th className="text-right py-2 pr-4 text-gray-500 font-medium">매출</th>
                  <th className="text-right py-2 pr-4 text-gray-500 font-medium">수량</th>
                  <th className="text-right py-2 text-gray-500 font-medium">비중</th>
                </tr>
              </thead>
              <tbody>
                {analysis.products.map((p, i) => (
                  <tr key={p.product} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-2 pr-4 font-medium text-gray-800">
                      <span className="inline-block w-5 text-gray-400 text-xs">{i + 1}</span>
                      {p.product}
                    </td>
                    <td className="py-2 pr-4 text-right text-gray-700">
                      ₩{p.amount.toLocaleString()}
                    </td>
                    <td className="py-2 pr-4 text-right text-gray-500">
                      {p.quantity.toLocaleString()}개
                    </td>
                    <td className="py-2 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 bg-gray-100 rounded-full h-1.5">
                          <div
                            className="bg-blue-500 h-1.5 rounded-full"
                            style={{ width: `${p.percentage}%` }}
                          />
                        </div>
                        <span className="text-gray-600 w-10 text-right">{p.percentage}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
