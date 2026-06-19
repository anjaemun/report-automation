/**
 * supabase.ts
 * ─────────────────────────────────────────────────────────────
 * Supabase 클라이언트 및 DB 테이블 타입 정의
 *
 * 사용 테이블:
 *  - upload_sessions: 업로드 1회 = 세션 1개 (파일명 목록, 행 수)
 *  - sales_records:   개별 판매 행 (세션에 FK)
 *
 * 환경변수 (.env.local):
 *  - NEXT_PUBLIC_SUPABASE_URL
 *  - NEXT_PUBLIC_SUPABASE_ANON_KEY
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/** 앱 전역에서 import해서 쓰는 Supabase 클라이언트 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/** sales_records 테이블 1행 */
export type SalesRecord = {
  id?: string;
  session_id?: string;
  file_name: string;
  date: string;
  product: string;
  amount: number;
  quantity: number;
};

/** upload_sessions 테이블 1행 */
export type UploadSession = {
  id?: string;
  created_at?: string;
  file_names: string[];
  row_count: number;
  ai_comment?: string;
};
