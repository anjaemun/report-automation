/**
 * excelParser.ts
 * ─────────────────────────────────────────────────────────────
 * 엑셀(.xlsx / .xls) 파일을 읽어서 앱 내부에서 쓰기 좋은 JSON 형태로 변환합니다.
 *
 * 전체 흐름:
 *   File (브라우저) → ArrayBuffer → XLSX.read() → 시트 파싱 → ParsedRow[]
 *
 * 핵심 설계 포인트:
 * 1. 컬럼명을 엄격히 고정하지 않고 COLUMN_ALIASES로 유연하게 매칭
 * 2. 1행이 헤더가 아닐 수 있어 detectHeaderRow()로 최대 10행 스캔
 * 3. 파싱 실패 시 parseError 메시지를 UI에 전달
 */

import * as XLSX from "xlsx";
import { SalesRecord } from "./database";

/** 파서가 만든 "한 줄" 데이터. validator·analyzer가 이 형태를 사용합니다. */
export type ParsedRow = {
  date: string;       // YYYY-MM-DD
  product: string;    // 상품명
  amount: number;     // 금액(원)
  quantity: number;   // 수량
  fileName: string;   // 어느 파일에서 왔는지 (여러 파일 업로드 대비)
  rowIndex: number;   // 엑셀 기준 행 번호 (에러 메시지 표시용, 1행=헤더)
};

/** 파일 하나를 파싱한 결과 */
export type ParseResult = {
  rows: ParsedRow[];
  fileName: string;
  sheetName: string;   // 데이터를 읽은 시트 이름
  parseError?: string; // 행이 0개일 때 사용자에게 보여줄 이유
};

/**
 * 논리 필드명 → 실제 엑셀에서 쓸 수 있는 헤더 후보들
 * 예: "날짜" 대신 "일자", "date"로 적어도 date 필드로 인식
 */
const COLUMN_ALIASES: Record<string, string[]> = {
  date: ["날짜", "일자", "date", "Date", "판매일", "거래일"],
  product: ["상품", "상품명", "제품", "제품명", "품목", "product", "Product", "item"],
  amount: ["매출", "금액", "매출액", "판매금액", "amount", "Amount", "sales", "price"],
  quantity: ["수량", "판매수량", "qty", "quantity", "Quantity", "개수"],
};

/** 헤더 문자열 정규화: 보이지 않는 특수문자 제거 + trim + 소문자 */
function normalizeHeader(header: unknown): string {
  return String(header ?? "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "") // zero-width 문자 제거
    .trim()
    .toLowerCase();
}

/**
 * headers 배열에서 field(논리명)에 해당하는 실제 컬럼 키를 찾습니다.
 * @returns 매칭된 원본 헤더 문자열 (sheet_to_json 객체의 key로 사용)
 */
function findColumn(headers: string[], field: string): string | null {
  const aliases = COLUMN_ALIASES[field];
  for (const alias of aliases) {
    const normalizedAlias = alias.toLowerCase();
    const found = headers.find((h) => normalizeHeader(h) === normalizedAlias);
    if (found) return found;
  }
  return null;
}

/** 최소한 날짜 + 상품 컬럼이 있어야 유효한 헤더 행으로 판단 */
function hasRequiredColumns(headers: string[]): boolean {
  return Boolean(findColumn(headers, "date") && findColumn(headers, "product"));
}

/**
 * SheetJS sheet_to_json 래퍼
 * @param headerRow 0-based 행 인덱스. 이 행을 헤더로 쓰고 그 아래를 데이터로 읽음
 */
function sheetToRows(
  sheet: XLSX.WorkSheet,
  headerRow: number
): Record<string, unknown>[] {
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",        // 빈 셀은 "" 로 채움
    raw: true,         // 숫자/날짜를 가공 전 원시값으로
    range: headerRow,  // 이 행부터 읽기 시작 (헤더 행 지정)
    blankrows: false,  // 완전 빈 행은 스킵
  });
}

/** 셀에서 표시 텍스트 추출 (w=포맷된 문자열, v=원시값) */
function getCellText(cell: XLSX.CellObject | undefined): string {
  if (!cell) return "";
  if (cell.w != null) return String(cell.w).trim();
  if (cell.v != null) return String(cell.v).trim();
  return "";
}

/** 헤더 행의 각 열을 직접 읽어 헤더 이름 배열 반환 (데이터 행이 없을 때 사용) */
function getHeaderNames(sheet: XLSX.WorkSheet, headerRow: number): string[] {
  const ref = sheet["!ref"]; // 시트 범위 e.g. "A1:D10"
  if (!ref) return [];

  const range = XLSX.utils.decode_range(ref);
  const headers: string[] = [];

  for (let col = range.s.c; col <= range.e.c; col++) {
    const cell = sheet[XLSX.utils.encode_cell({ r: headerRow, c: col })];
    const text = getCellText(cell);
    if (text) headers.push(text);
  }

  return headers;
}

/**
 * 헤더 이름 가져오기 (우선 sheet_to_json 키, 없으면 셀 직접 읽기)
 * sheet_to_json은 첫 데이터 행 객체의 key가 곧 헤더명
 */
function getHeaderNamesFromSheet(sheet: XLSX.WorkSheet, headerRow: number): string[] {
  const dataRows = sheetToRows(sheet, headerRow);
  if (dataRows.length > 0) {
    return Object.keys(dataRows[0]);
  }
  return getHeaderNames(sheet, headerRow);
}

/**
 * 시트 상단 10행을 스캔해 "날짜+상품" 헤더가 있는 행을 찾습니다.
 * @returns 0-based 헤더 행 인덱스, 없으면 null
 */
function detectHeaderRow(sheet: XLSX.WorkSheet): number | null {
  const ref = sheet["!ref"];
  if (!ref) return null;

  const range = XLSX.utils.decode_range(ref);
  const maxScanRow = Math.min(range.s.r + 9, range.e.r);

  for (let row = range.s.r; row <= maxScanRow; row++) {
    const headerNames = getHeaderNamesFromSheet(sheet, row);
    if (hasRequiredColumns(headerNames)) return row;
  }

  return null;
}

/** 파싱 실패 시 UI에 보여줄 구체적인 한글 메시지 생성 */
function describeParseFailure(sheet: XLSX.WorkSheet): string {
  const ref = sheet["!ref"];
  if (!ref) {
    return "시트가 비어 있습니다.";
  }

  const range = XLSX.utils.decode_range(ref);
  const scannedHeaders = getHeaderNamesFromSheet(sheet, range.s.r);
  const headerRow = detectHeaderRow(sheet);

  if (headerRow == null) {
    const found =
      scannedHeaders.length > 0
        ? ` (1행에서 읽은 값: ${scannedHeaders.join(", ")})`
        : " (1행이 비어 있거나 헤더를 읽지 못했습니다)";
    return `필수 컬럼(날짜, 상품)을 찾을 수 없습니다.${found} 첫 행에 날짜·상품·금액·수량 헤더가 있는지 확인해주세요.`;
  }

  const dataRows = sheetToRows(sheet, headerRow);
  if (dataRows.length === 0) {
    return "헤더는 찾았지만 데이터 행이 없습니다. 헤더 아래 판매 데이터가 있는지 확인해주세요.";
  }

  return "파일에서 유효한 데이터 행을 읽지 못했습니다.";
}

/** 날짜·상품·금액·수량이 모두 비어 있으면 의미 없는 행으로 간주 */
function isEmptyRow(row: ParsedRow): boolean {
  return (
    !row.date.trim() &&
    !row.product.trim() &&
    row.amount === 0 &&
    row.quantity === 0
  );
}

/**
 * 엑셀 날짜 셀 → YYYY-MM-DD 문자열
 * - 숫자: 엑셀 시리얼 날짜 (44927 같은 값)
 * - 문자열: 2026-06-01, 2026.06.01, 2026/06/01
 */
function parseExcelDate(value: unknown): string {
  if (!value) return "";

  if (typeof value === "number") {
    const date = XLSX.SSF.parse_date_code(value);
    if (date) {
      const y = date.y;
      const m = String(date.m).padStart(2, "0");
      const d = String(date.d).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
  }

  if (typeof value === "string") {
    const cleaned = value.replace(/[./]/g, "-").trim();
    const match = cleaned.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (match) {
      return `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`;
    }
  }

  return String(value);
}

/** 워크시트 하나를 ParsedRow 배열로 변환 */
function parseSheet(
  sheet: XLSX.WorkSheet,
  fileName: string,
  sheetName: string
): { rows: ParsedRow[]; parseError?: string } {
  const headerRow = detectHeaderRow(sheet);
  if (headerRow == null) {
    return { rows: [], parseError: describeParseFailure(sheet) };
  }

  const rawData = sheetToRows(sheet, headerRow);
  if (rawData.length === 0) {
    return { rows: [], parseError: describeParseFailure(sheet) };
  }

  // sheet_to_json 결과의 key = 헤더명
  const headers = Object.keys(rawData[0]);
  const dateCol = findColumn(headers, "date");
  const productCol = findColumn(headers, "product");
  const amountCol = findColumn(headers, "amount");
  const quantityCol = findColumn(headers, "quantity");

  const rows = rawData
    .map((row, i) => ({
      date: dateCol ? parseExcelDate(row[dateCol]) : "",
      product: productCol ? String(row[productCol] ?? "").trim() : "",
      amount: amountCol ? Number(row[amountCol]) || 0 : 0,
      quantity: quantityCol ? Number(row[quantityCol]) || 0 : 0,
      fileName,
      // 엑셀 행 번호: headerRow(0-based) + 데이터인덱스 + 헤더1행 + 1(1-based)
      rowIndex: headerRow + i + 2,
    }))
    .filter((row) => !isEmptyRow(row));

  if (rows.length === 0) {
    return { rows: [], parseError: describeParseFailure(sheet) };
  }

  return { rows };
}

/**
 * 엑셀 파일(ArrayBuffer)을 파싱하는 메인 진입점
 * 여러 시트가 있으면 데이터가 있는 첫 시트를 사용
 */
export function parseExcelFile(buffer: ArrayBuffer, fileName: string): ParseResult {
  const workbook = XLSX.read(buffer, { type: "array", cellDates: false });
  let lastError: string | undefined;

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const { rows, parseError } = parseSheet(sheet, fileName, sheetName);
    if (rows.length > 0) {
      return { rows, fileName, sheetName };
    }
    lastError = parseError ?? lastError;
  }

  const sheetName = workbook.SheetNames[0] ?? "";
  return {
    rows: [],
    fileName,
    sheetName,
    parseError: lastError ?? "파일이 비어 있거나 읽을 수 없습니다.",
  };
}

/** 여러 파일 파싱 결과를 하나의 배열로 합침 */
export function mergeParseResults(results: ParseResult[]): ParsedRow[] {
  return results.flatMap((r) => r.rows);
}

/** Supabase sales_records 테이블 INSERT용 형태로 변환 */
export function toSalesRecords(rows: ParsedRow[], sessionId: string): SalesRecord[] {
  return rows.map((row) => ({
    session_id: sessionId,
    file_name: row.fileName,
    date: row.date,
    product: row.product,
    amount: row.amount,
    quantity: row.quantity,
  }));
}
