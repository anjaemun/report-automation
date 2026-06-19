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

import { createClient, SupabaseClient } from "@supabase/supabase-js";

let supabaseClient: SupabaseClient | null = null;

/** 요청 시점에 초기화 — 빌드 시 env 없어도 실패하지 않음 */
export function getSupabase(): SupabaseClient {
  if (!supabaseClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      throw new Error("NEXT_PUBLIC_SUPABASE_URL 및 NEXT_PUBLIC_SUPABASE_ANON_KEY가 필요합니다.");
    }
    supabaseClient = createClient(url, key);
  }
  return supabaseClient;
}

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
