/**
 * pdfExporter.ts
 * ─────────────────────────────────────────────────────────────
 * 대시보드 화면을 PDF로 저장합니다.
 *
 * 방식: jsPDF + html2canvas-pro
 *  - 대시보드 각 섹션을 DOM 캡처(스크린샷) → PNG → PDF에 붙임
 *  - 한글·차트는 브라우저가 렌더링한 그대로 이미지로 들어감
 *
 * dashboard/page.tsx의 section id와 PDF_SECTIONS 순서가 일치해야 함
 */

import jsPDF from "jspdf";
import html2canvas from "html2canvas-pro"; // Tailwind v4 lab() 색상 지원
import { format } from "date-fns";

/** PDF에 넣을 섹션 순서 (위에서 아래로) */
const PDF_SECTIONS = [
  "pdf-kpi",
  "pdf-insights",
  "pdf-chart-line",
  "pdf-chart-bar",
  "pdf-table",
] as const;

type CapturedImage = {
  data: string;   // base64 PNG data URL
  width: number;  // 캡처 캔버스 픽셀 너비
  height: number;
};

/**
 * DOM 요소를 고해상도(scale:2) PNG로 캡처
 * 화면에 보이는 레이아웃·한글·차트가 그대로 이미지화됨
 */
async function captureElement(element: HTMLElement): Promise<CapturedImage> {
  const canvas = await html2canvas(element, {
    scale: 2,              // Retina급 선명도
    useCORS: true,
    backgroundColor: "#ffffff",
    logging: false,
  });

  return {
    data: canvas.toDataURL("image/png"),
    width: canvas.width,
    height: canvas.height,
  };
}

/** 각 페이지 하단에 "1 / 3" 형식 페이지 번호 */
function addPageFooter(pdf: jsPDF, page: number, total: number, pageW: number, pageH: number) {
  pdf.setFontSize(8);
  pdf.setTextColor(156, 163, 175);
  pdf.text(`${page} / ${total}`, pageW / 2, pageH - 8, { align: "center" });
}

/**
 * PDF 생성 메인 함수
 * @param fileNames 표지에 표시할 업로드 파일명 목록
 */
export async function exportToPdf(fileNames: string[]): Promise<void> {
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageW = 210;  // A4 너비 mm
  const pageH = 297;
  const margin = 14;
  const contentW = pageW - margin * 2; // 본문 사용 가능 너비
  const today = format(new Date(), "yyyy-MM-dd");

  // ── 1페이지 상단 헤더 바 (jsPDF로 직접 그림, 영문만) ──
  pdf.setFillColor(37, 99, 235);
  pdf.rect(0, 0, pageW, 24, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(15);
  pdf.setFont("helvetica", "bold");
  pdf.text("Sales Report", margin, 15);
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "normal");
  pdf.text(today, pageW - margin, 15, { align: "right" });

  let y = 32; // 현재 그리기 Y 위치 (mm, 위에서 아래로 증가)
  pdf.setTextColor(107, 114, 128);
  pdf.setFontSize(8);
  const fileLine = `Files: ${fileNames.join(", ")}`;
  pdf.text(fileLine, margin, y, { maxWidth: contentW });
  y += fileNames.length > 1 ? 12 : 8;

  // ── 섹션별 캡처 → PDF에 순서대로 배치 ──
  for (const sectionId of PDF_SECTIONS) {
    const element = document.getElementById(sectionId);
    if (!element) continue;

    const { data, width, height } = await captureElement(element);

    // 가로는 contentW에 맞추고, 세로는 비율 유지
    const imgH = (height * contentW) / width;
    const gap = 6;

    // 남은 페이지 공간 부족하면 새 페이지
    if (y + imgH > pageH - margin) {
      pdf.addPage();
      y = margin;
    }

    pdf.addImage(data, "PNG", margin, y, contentW, imgH);
    y += imgH + gap;
  }

  // ── 모든 페이지에 푸터 ──
  const pageCount = pdf.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    addPageFooter(pdf, i, pageCount, pageW, pageH);
  }

  pdf.save(`sales_report_${today}.pdf`);
}
