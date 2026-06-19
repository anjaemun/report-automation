/** Supabase 테이블 타입 (클라이언트 import 없이 사용) */

export type SalesRecord = {
  id?: string;
  session_id?: string;
  file_name: string;
  date: string;
  product: string;
  amount: number;
  quantity: number;
};

export type UploadSession = {
  id?: string;
  created_at?: string;
  file_names: string[];
  row_count: number;
  ai_comment?: string;
};
