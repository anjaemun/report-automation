/**
 * app/layout.tsx — 앱 전체 래퍼
 * Next.js App Router에서 모든 페이지를 감싸는 루트 레이아웃
 */

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "매출 보고서 자동화",
  description: "엑셀 업로드 → 자동 분석 → PDF 보고서",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
