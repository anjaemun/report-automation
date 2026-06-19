/**
 * app/api/upload/route.ts
 * ─────────────────────────────────────────────────────────────
 * Next.js App Router API Route (서버에서 실행)
 *
 * POST /api/upload
 * Body: { rows: ParsedRow[], fileNames: string[] }
 *
 * 처리 순서:
 *  1. upload_sessions에 세션 1건 INSERT → sessionId 발급
 *  2. rows를 sales_records로 변환 후 100건씩 배치 INSERT
 *  3. { sessionId, rowCount } JSON 반환
 *
 * 클라이언트(page.tsx)는 sessionId를 sessionStorage에 넣고 /dashboard로 이동
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { toSalesRecords } from "@/lib/excelParser";
import { ParsedRow } from "@/lib/excelParser";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabase();
    const body = await req.json();
    const { rows, fileNames }: { rows: ParsedRow[]; fileNames: string[] } = body;

    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: "저장할 데이터가 없습니다" }, { status: 400 });
    }

    // 1. 업로드 세션 생성 (이번 업로드 묶음의 메타정보)
    const { data: session, error: sessionError } = await supabase
      .from("upload_sessions")
      .insert({
        file_names: fileNames,
        row_count: rows.length,
      })
      .select()
      .single();

    if (sessionError || !session) {
      console.error("Session error:", sessionError);
      return NextResponse.json({ error: "세션 생성 실패" }, { status: 500 });
    }

    // 2. 매출 데이터 저장 — Supabase 한 번에 너무 많이 넣지 않도록 100건씩 분할
    const records = toSalesRecords(rows, session.id);
    const batchSize = 100;
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const { error: insertError } = await supabase.from("sales_records").insert(batch);
      if (insertError) {
        console.error("Insert error:", insertError);
        return NextResponse.json({ error: "데이터 저장 실패" }, { status: 500 });
      }
    }

    return NextResponse.json({ sessionId: session.id, rowCount: records.length });
  } catch (err) {
    console.error("Upload route error:", err);
    const message =
      err instanceof Error ? err.message : "서버 오류";
    const isConfigError = message.includes("NEXT_PUBLIC_SUPABASE");
    return NextResponse.json(
      {
        error: isConfigError
          ? "Supabase 환경변수가 설정되지 않았습니다"
          : message,
      },
      { status: 500 }
    );
  }
}
