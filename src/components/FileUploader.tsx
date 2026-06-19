/**
 * FileUploader.tsx
 * ─────────────────────────────────────────────────────────────
 * 엑셀 드래그앤드롭 / 파일 선택 UI
 *
 * 처리 흐름:
 *  1. File[] → ArrayBuffer → parseExcelFile (파일별)
 *  2. mergeParseResults → validateRows
 *  3. 성공 시 onValidated 콜백 (부모 page.tsx로 rows 전달)
 *
 * 부모에게 넘기는 Props:
 *  - onValidated(rows, fileNames)
 */

"use client";

import { useCallback, useState } from "react";
import { parseExcelFile, mergeParseResults, ParsedRow, ParseResult } from "@/lib/excelParser";
import { validateRows, ValidationResult } from "@/lib/validator";

type Props = {
  onValidated: (rows: ParsedRow[], fileNames: string[]) => void;
};

export default function FileUploader({ onValidated }: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [validation, setValidation] = useState<ValidationResult | null>(null);

  /** 핵심: 선택/드롭된 파일들 파싱 + 검증 */
  const processFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;
      setIsProcessing(true);
      setValidation(null);

      try {
        const results: ParseResult[] = [];
        for (const file of files) {
          const buffer = await file.arrayBuffer();
          const result = parseExcelFile(buffer, file.name);
          results.push(result);
        }

        const merged = mergeParseResults(results);
        const names = files.map((f) => f.name);
        setFileNames(names);

        // 파싱은 됐지만 행 0개 → parseError를 검증 UI에 표시
        const parseErrors = results
          .filter((result) => result.parseError)
          .map((result) => ({
            rowIndex: 0,
            fileName: result.fileName,
            field: "파일",
            message: result.parseError!,
          }));

        if (merged.length === 0) {
          setValidation({
            valid: [],
            errors:
              parseErrors.length > 0
                ? parseErrors
                : [
                    {
                      rowIndex: 0,
                      fileName: names.join(", "),
                      field: "파일",
                      message: "읽을 수 있는 데이터 행이 없습니다.",
                    },
                  ],
            isValid: false,
          });
          return;
        }

        const validationResult = validateRows(merged);
        setValidation(validationResult);

        // 오류 0건이면 부모에게 알림 → 저장 버튼 표시
        if (validationResult.isValid) {
          onValidated(merged, names);
        }
      } catch (err) {
        console.error(err);
        alert("파일 파싱 중 오류가 발생했습니다. 엑셀 파일(.xlsx, .xls)인지 확인해주세요.");
      } finally {
        setIsProcessing(false);
      }
    },
    [onValidated]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const files = Array.from(e.dataTransfer.files).filter(
        (f) => f.name.endsWith(".xlsx") || f.name.endsWith(".xls")
      );
      processFiles(files);
    },
    [processFiles]
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    processFiles(files);
    e.target.value = ""; // 같은 파일 재선택 가능하도록 초기화
  };

  /** 일부 행만 오류일 때 정상 행만으로 진행 */
  const handleIgnoreErrors = () => {
    if (validation && validation.valid.length > 0) {
      onValidated(validation.valid, fileNames);
    }
  };

  return (
    <div className="space-y-4">
      {/* 드래그 앤 드롭 영역 — input이 전체를 덮어 클릭도 가능 */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200 ${
          isDragging
            ? "border-blue-500 bg-blue-50"
            : "border-gray-200 hover:border-blue-400 hover:bg-gray-50"
        }`}
      >
        <input
          type="file"
          accept=".xlsx,.xls"
          multiple
          onChange={handleFileInput}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div className="flex flex-col items-center gap-3 pointer-events-none">
          <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center">
            <svg className="w-7 h-7 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          </div>
          {isProcessing ? (
            <p className="text-blue-600 font-medium">파일 분석 중...</p>
          ) : (
            <>
              <p className="text-gray-700 font-medium">
                엑셀 파일을 드래그하거나 클릭해서 선택하세요
              </p>
              <p className="text-sm text-gray-400">.xlsx, .xls 지원 · 여러 파일 동시 업로드 가능</p>
            </>
          )}
        </div>
      </div>

      {fileNames.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {fileNames.map((name) => (
            <span
              key={name}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 text-sm rounded-full"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {name}
            </span>
          ))}
        </div>
      )}

      {/* 검증 결과: 초록=통과, 노랑=오류 */}
      {validation && (
        <div className={`rounded-xl border p-4 ${validation.isValid ? "border-green-200 bg-green-50" : "border-amber-200 bg-amber-50"}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {validation.isValid ? (
                <>
                  <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="font-medium text-green-700">
                    검증 통과 — {validation.valid.length}개 행 정상
                  </span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span className="font-medium text-amber-700">
                    오류 {validation.errors.length}건 발견 · 정상 {validation.valid.length}개 행
                  </span>
                </>
              )}
            </div>
            {!validation.isValid && validation.valid.length > 0 && (
              <button
                onClick={handleIgnoreErrors}
                className="text-sm text-amber-700 underline hover:text-amber-900"
              >
                오류 행 제외하고 계속 진행
              </button>
            )}
          </div>

          {validation.errors.length > 0 && (
            <div className="mt-2 max-h-40 overflow-y-auto space-y-1">
              {validation.errors.map((err, i) => (
                <div key={i} className="flex gap-2 text-sm text-amber-800">
                  <span className="font-mono text-xs bg-amber-100 px-1.5 py-0.5 rounded shrink-0">
                    {err.fileName} · {err.rowIndex}행
                  </span>
                  <span>[{err.field}] {err.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
