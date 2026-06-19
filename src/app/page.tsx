/**
 * app/page.tsx — 홈 (업로드 페이지)
 * ─────────────────────────────────────────────────────────────
 * 사용자 여정 1단계:
 *   엑셀 업로드 → 검증 통과 → Supabase 저장 → 대시보드 이동
 *
 * "use client": FileUploader, sessionStorage, fetch 등 브라우저 API 사용
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import FileUploader from "@/components/FileUploader";
import { ParsedRow } from "@/lib/excelParser";

/** 저장 버튼 상태 */
type UploadState = "idle" | "saving" | "done" | "error";

export default function HomePage() {
  const router = useRouter();
  const [state, setState] = useState<UploadState>("idle");
  const [validatedRows, setValidatedRows] = useState<ParsedRow[] | null>(null);
  const [fileNames, setFileNames] = useState<string[]>([]);

  /** FileUploader가 검증 통과 시 호출 — 아직 DB 저장 전 */
  const handleValidated = (rows: ParsedRow[], names: string[]) => {
    setValidatedRows(rows);
    setFileNames(names);
    setState("idle");
  };

  /** "저장 후 대시보드 이동" 클릭 시 API 호출 */
  const handleSave = async () => {
    if (!validatedRows || validatedRows.length === 0) return;
    setState("saving");

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: validatedRows, fileNames }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "저장 실패");
      }

      const { sessionId } = await res.json();
      setState("done");

      // 대시보드는 URL 파라미터 대신 sessionStorage로 데이터 전달
      // (새로고침 시 데이터 유지, 탭 닫으면 사라짐)
      sessionStorage.setItem(
        "dashboardData",
        JSON.stringify({ rows: validatedRows, fileNames, sessionId })
      );
      router.push("/dashboard");
    } catch (err) {
      console.error(err);
      setState("error");
    }
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-16">
        {/* 헤더 */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full mb-4">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
            </svg>
            Sales Report Automation
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">매출 보고서 자동화</h1>
          <p className="text-gray-500">
            엑셀 파일을 업로드하면 자동으로 분석하여 대시보드와 PDF 보고서를 생성합니다.
          </p>
        </div>

        {/* 업로드 카드 */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm mb-4">
          <h2 className="text-base font-semibold text-gray-800 mb-4">파일 업로드</h2>
          <FileUploader onValidated={handleValidated} />
        </div>

        {/* 검증 통과 후에만 보이는 저장 버튼 */}
        {validatedRows && validatedRows.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">
                  {validatedRows.length}개 행 준비 완료
                </p>
                <p className="text-xs text-gray-400">{fileNames.join(", ")}</p>
              </div>
              <button
                onClick={handleSave}
                disabled={state === "saving"}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded-xl transition-colors"
              >
                {state === "saving" ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    저장 중...
                  </>
                ) : (
                  <>
                    저장 후 대시보드 이동
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </>
                )}
              </button>
            </div>
            {state === "error" && (
              <p className="mt-2 text-sm text-red-600">저장 중 오류가 발생했습니다. 다시 시도해주세요.</p>
            )}
          </div>
        )}

        {/* 엑셀 컬럼 안내 (excelParser COLUMN_ALIASES와 동일) */}
        <div className="mt-6 p-4 bg-blue-50 rounded-xl">
          <p className="text-xs font-medium text-blue-700 mb-2">엑셀 파일 필수 컬럼</p>
          <div className="grid grid-cols-2 gap-1">
            {[
              ["날짜 / 일자 / date", "판매 날짜"],
              ["상품 / 상품명 / product", "상품 이름"],
              ["매출 / 금액 / amount", "판매 금액"],
              ["수량 / qty / quantity", "판매 수량"],
            ].map(([col, desc]) => (
              <div key={col} className="flex gap-2 text-xs">
                <span className="font-mono text-blue-600">{col}</span>
                <span className="text-blue-400">→ {desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
