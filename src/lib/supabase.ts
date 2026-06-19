/**
 * supabase.ts — Supabase 클라이언트 (서버 API 전용)
 *
 * 환경변수:
 *  - NEXT_PUBLIC_SUPABASE_URL
 *  - NEXT_PUBLIC_SUPABASE_ANON_KEY
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

export type { SalesRecord, UploadSession } from "./database";

let supabaseClient: SupabaseClient | null = null;

const BUILD_PLACEHOLDER_URL = "https://placeholder.supabase.co";
const BUILD_PLACEHOLDER_KEY = "placeholder-key";

function resolveSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (url && key) {
    return { url, key };
  }

  // Vercel/Next 빌드 시 page data 수집 단계에서 env가 없을 수 있음
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return { url: BUILD_PLACEHOLDER_URL, key: BUILD_PLACEHOLDER_KEY };
  }

  return null;
}

/** 요청 시점에 초기화 */
export function getSupabase(): SupabaseClient {
  if (!supabaseClient) {
    const config = resolveSupabaseConfig();
    if (!config) {
      throw new Error("NEXT_PUBLIC_SUPABASE_URL 및 NEXT_PUBLIC_SUPABASE_ANON_KEY가 필요합니다.");
    }
    supabaseClient = createClient(config.url, config.key);
  }
  return supabaseClient;
}
