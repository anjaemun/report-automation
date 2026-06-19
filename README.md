프로젝트 한 줄 소개

# 매출 보고서 자동화
엑셀 업로드 → 검증 → 대시보드 분석 → PDF 보고서 생성까지 한 번에 처리하는 웹 앱

데모 링크

- https://report-automation-ll14.vercel.app/

주요 기능

- 엑셀 드래그앤드롭 업로드
- 컬럼명 자동 매칭·데이터 검증
- KPI / 차트 / 인사이트 대시보드
- PDF 보고서 다운로드
- Supabase 업로드 이력 저장

기술 스택

- 프론트엔드 : Next.js 16, React 19, TypeScript, Tailwind CSS
- 차트 : Recharts
- 액셀 : SheetJS (xlsx)
- PDF : html2canvas-pro, jsPDF
- 백엔드, DB : Next.js, API routes, Supabase
- 배포 : Vercel

실행 방법

- npm install
- npm run dev

환경 변수

- NEXT_PUBLIC_SUPABASE_URL=
- NEXT_PUBLIC_SUPABASE_ANON_KEY=