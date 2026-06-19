/**
 * validator.ts
 * ─────────────────────────────────────────────────────────────
 * excelParser가 만든 ParsedRow[]를 검증합니다.
 * FileUploader에서 파싱 직후 호출되며, 결과는 UI에 그대로 표시됩니다.
 *
 * 검증 항목:
 *  - 필수값: 날짜, 상품명
 *  - 날짜 형식: YYYY-MM-DD
 *  - 숫자: 금액/수량 NaN·음수 불가
 *  - 이상치: 금액 1억 초과
 *  - 중복: 같은 파일 내 동일 날짜+상품
 */

import { ParsedRow } from "./excelParser";

/** 행 단위 오류 정보 (UI 목록에 표시) */
export type ValidationError = {
  rowIndex: number;
  fileName: string;
  field: string;   // "날짜", "상품명", "금액" 등
  message: string;
};

export type ValidationResult = {
  valid: ParsedRow[];      // 통과한 행
  errors: ValidationError[];
  isValid: boolean;        // 행이 1개 이상 + 오류 0건
};

/** YYYY-MM-DD 형식 + 실제 달력상 유효한 날짜인지 확인 */
function isValidDate(dateStr: string): boolean {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  return !isNaN(date.getTime()) && dateStr.match(/^\d{4}-\d{2}-\d{2}$/) !== null;
}

/**
 * 같은 파일에서 이전 행들과 날짜+상품이 겹치는지 확인
 * @param index 현재 행의 배열 인덱스 (자기 자신보다 앞만 비교)
 */
function isDuplicate(rows: ParsedRow[], row: ParsedRow, index: number): boolean {
  return rows.some(
    (r, i) =>
      i < index &&
      r.date === row.date &&
      r.product === row.product &&
      r.fileName === row.fileName
  );
}

/**
 * 모든 행을 순회하며 검증
 * 한 행에 여러 오류가 있으면 errors에 여러 건이 쌓임
 */
export function validateRows(rows: ParsedRow[]): ValidationResult {
  const errors: ValidationError[] = [];
  const valid: ParsedRow[] = [];

  rows.forEach((row, index) => {
    const rowErrors: ValidationError[] = [];

    // ── 날짜 검사 ──
    if (!row.date || row.date.trim() === "") {
      rowErrors.push({
        rowIndex: row.rowIndex,
        fileName: row.fileName,
        field: "날짜",
        message: "날짜가 비어 있습니다",
      });
    } else if (!isValidDate(row.date)) {
      rowErrors.push({
        rowIndex: row.rowIndex,
        fileName: row.fileName,
        field: "날짜",
        message: `날짜 형식이 올바르지 않습니다 (값: ${row.date})`,
      });
    }

    // ── 상품명 검사 ──
    if (!row.product || row.product.trim() === "") {
      rowErrors.push({
        rowIndex: row.rowIndex,
        fileName: row.fileName,
        field: "상품명",
        message: "상품명이 비어 있습니다",
      });
    }

    // ── 금액 검사 ──
    if (isNaN(row.amount) || row.amount < 0) {
      rowErrors.push({
        rowIndex: row.rowIndex,
        fileName: row.fileName,
        field: "금액",
        message: `금액이 유효하지 않습니다 (값: ${row.amount})`,
      });
    }

    // ── 수량 검사 ──
    if (isNaN(row.quantity) || row.quantity < 0) {
      rowErrors.push({
        rowIndex: row.rowIndex,
        fileName: row.fileName,
        field: "수량",
        message: `수량이 유효하지 않습니다 (값: ${row.quantity})`,
      });
    }

    // ── 이상치: 1억 원 초과 (오타 방지용) ──
    if (row.amount > 100_000_000) {
      rowErrors.push({
        rowIndex: row.rowIndex,
        fileName: row.fileName,
        field: "금액",
        message: `금액이 이상값입니다 (${row.amount.toLocaleString()}원)`,
      });
    }

    // ── 중복 행 ──
    if (isDuplicate(rows, row, index)) {
      rowErrors.push({
        rowIndex: row.rowIndex,
        fileName: row.fileName,
        field: "중복",
        message: `동일 날짜·상품 중복 행입니다 (${row.date} / ${row.product})`,
      });
    }

    if (rowErrors.length > 0) {
      errors.push(...rowErrors);
    } else {
      valid.push(row);
    }
  });

  return {
    valid,
    errors,
    // 빈 배열은 오류 0건이어도 "통과"가 아님 (파싱 실패와 구분은 FileUploader에서 처리)
    isValid: rows.length > 0 && errors.length === 0,
  };
}
