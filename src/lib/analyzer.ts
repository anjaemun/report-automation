/**
 * analyzer.ts
 * ─────────────────────────────────────────────────────────────
 * Supabase/ParsedRow 형태의 판매 레코드를 집계·분석해
 * 대시보드·차트·인사이트 패널이 쓰는 AnalysisResult를 만듭니다.
 *
 * 분석 기준:
 *  - "당월" 데이터 = 가장 최근 월의 레코드 (전월 대비 인사이트용)
 *  - KPI, 일별, 상품별, 주차별 집계는 당월 기준
 *  - fileKpis는 업로드된 파일별로 전체 기간 합산
 */

import { SalesRecord } from "./database";
import { format, getWeek, startOfWeek, endOfWeek, parseISO } from "date-fns";
import { ko } from "date-fns/locale";

/** KPI 4종 (KpiCards 컴포넌트와 1:1 대응) */
export type KpiData = {
  totalAmount: number;    // 총 매출
  totalQuantity: number;  // 총 수량
  totalOrders: number;    // 거래 건수 (= 행 개수)
  avgOrderAmount: number; // 건당 평균 매출
};

/** 일별 매출 추이 차트용 */
export type DailyData = {
  date: string;
  amount: number;
  quantity: number;
};

/** 상품별 매출 (테이블·막대차트용) */
export type ProductData = {
  product: string;
  amount: number;
  quantity: number;
  percentage: number; // 전체 매출 대비 % (소수 1자리)
};

/** 주차별 매출 (인사이트 peakWeek 계산용) */
export type WeeklyData = {
  week: string;      // "6월 24주차" 같은 라벨
  amount: number;
  startDate: string;
  endDate: string;
};

/** InsightPanel에 표시할 문장들 (이미 포맷된 문자열) */
export type InsightComment = {
  momChange: string;
  topProduct: string;
  topProductShare: string;
  peakWeek: string;
  peakWeekAmount: string;
  avgDailySales: string;
};

/** analyze() 반환 타입 — 대시보드 전체가 이 객체 하나로 렌더링 */
export type AnalysisResult = {
  kpi: KpiData;
  daily: DailyData[];
  products: ProductData[];
  weekly: WeeklyData[];
  insights: InsightComment;
  fileKpis: Record<string, KpiData>; // key = 파일명
};

/**
 * 레코드를 "가장 최근 월(당월)"과 "그 전월"로 나눔
 * 월이 1개뿐이면 previous는 빈 배열 → 전월 대비 인사이트 불가
 */
function splitByMonth(records: SalesRecord[]) {
  if (records.length === 0) return { current: [], previous: [] };

  const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));
  const months = [...new Set(sorted.map((r) => r.date.slice(0, 7)))].sort(); // "2026-06"

  if (months.length === 1) {
    return { current: sorted, previous: [] };
  }

  const latestMonth = months[months.length - 1];
  const prevMonth = months[months.length - 2];

  return {
    current: sorted.filter((r) => r.date.startsWith(latestMonth)),
    previous: sorted.filter((r) => r.date.startsWith(prevMonth)),
  };
}

/** 레코드 배열에서 KPI 4종 계산 */
function calcKpi(records: SalesRecord[]): KpiData {
  const totalAmount = records.reduce((s, r) => s + r.amount, 0);
  const totalQuantity = records.reduce((s, r) => s + r.quantity, 0);
  return {
    totalAmount,
    totalQuantity,
    totalOrders: records.length,
    avgOrderAmount: records.length > 0 ? Math.round(totalAmount / records.length) : 0,
  };
}

/**
 * 메인 분석 함수
 * dashboard/page.tsx에서 SalesRecord[] 넘기면 AnalysisResult 반환
 */
export function analyze(records: SalesRecord[]): AnalysisResult {
  if (records.length === 0) {
    const empty: KpiData = { totalAmount: 0, totalQuantity: 0, totalOrders: 0, avgOrderAmount: 0 };
    return {
      kpi: empty,
      daily: [],
      products: [],
      weekly: [],
      insights: {
        momChange: "데이터 없음",
        topProduct: "-",
        topProductShare: "-",
        peakWeek: "-",
        peakWeekAmount: "-",
        avgDailySales: "-",
      },
      fileKpis: {},
    };
  }

  const { current, previous } = splitByMonth(records);
  // 당월이 비어 있으면(엣지 케이스) 전체 레코드 사용
  const workingRecords = current.length > 0 ? current : records;

  const kpi = calcKpi(workingRecords);
  const prevKpi = calcKpi(previous);

  // ── 파일별 KPI (파일 여러 개 업로드 시 KpiCards 토글용) ──
  const fileNames = [...new Set(records.map((r) => r.file_name))];
  const fileKpis: Record<string, KpiData> = {};
  fileNames.forEach((fn) => {
    fileKpis[fn] = calcKpi(records.filter((r) => r.file_name === fn));
  });

  // ── 일별 매출: 같은 날짜 행은 amount/quantity 합산 ──
  const dailyMap = new Map<string, DailyData>();
  workingRecords.forEach((r) => {
    const existing = dailyMap.get(r.date) ?? { date: r.date, amount: 0, quantity: 0 };
    dailyMap.set(r.date, {
      date: r.date,
      amount: existing.amount + r.amount,
      quantity: existing.quantity + r.quantity,
    });
  });
  const daily = [...dailyMap.values()].sort((a, b) => a.date.localeCompare(b.date));

  // ── 상품별: 매출 내림차순 + 비중(%) 계산 ──
  const productMap = new Map<string, { amount: number; quantity: number }>();
  workingRecords.forEach((r) => {
    const existing = productMap.get(r.product) ?? { amount: 0, quantity: 0 };
    productMap.set(r.product, {
      amount: existing.amount + r.amount,
      quantity: existing.quantity + r.quantity,
    });
  });
  const products: ProductData[] = [...productMap.entries()]
    .map(([product, data]) => ({
      product,
      amount: data.amount,
      quantity: data.quantity,
      percentage: kpi.totalAmount > 0 ? Math.round((data.amount / kpi.totalAmount) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  // ── 주차별: 월요일 시작 주(weekStartsOn: 1) 기준 ──
  const weekMap = new Map<string, WeeklyData>();
  workingRecords.forEach((r) => {
    const date = parseISO(r.date);
    const weekNum = getWeek(date, { locale: ko });
    const start = startOfWeek(date, { weekStartsOn: 1 });
    const end = endOfWeek(date, { weekStartsOn: 1 });
    const key = format(start, "yyyy-MM-dd");
    const label = `${format(date, "M")}월 ${weekNum}주차`;
    const existing = weekMap.get(key) ?? {
      week: label,
      amount: 0,
      startDate: format(start, "MM/dd"),
      endDate: format(end, "MM/dd"),
    };
    weekMap.set(key, { ...existing, amount: existing.amount + r.amount });
  });
  const weekly = [...weekMap.values()].sort((a, b) => a.startDate.localeCompare(b.startDate));

  // ── 인사이트 문장 생성 (UI에 바로 표시) ──
  const momChange =
    previous.length > 0 && prevKpi.totalAmount > 0
      ? `전월 대비 ${(((kpi.totalAmount - prevKpi.totalAmount) / prevKpi.totalAmount) * 100).toFixed(1)}% ${kpi.totalAmount >= prevKpi.totalAmount ? "증가" : "감소"}`
      : "전월 데이터 없음";

  const topProduct = products[0];
  const peakWeek = weekly.reduce(
    (max, w) => (w.amount > max.amount ? w : max),
    weekly[0] ?? { week: "-", amount: 0, startDate: "", endDate: "" }
  );
  const avgDailySales = daily.length > 0 ? Math.round(kpi.totalAmount / daily.length) : 0;

  return {
    kpi,
    daily,
    products,
    weekly,
    insights: {
      momChange,
      topProduct: topProduct?.product ?? "-",
      topProductShare: topProduct ? `전체 매출의 ${topProduct.percentage}%` : "-",
      peakWeek: peakWeek?.week ?? "-",
      peakWeekAmount: peakWeek ? `${peakWeek.amount.toLocaleString()}원` : "-",
      avgDailySales: `일평균 ${avgDailySales.toLocaleString()}원`,
    },
    fileKpis,
  };
}
