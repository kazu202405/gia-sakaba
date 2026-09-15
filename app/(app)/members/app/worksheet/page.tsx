// 紹介設計ワークシート ページ。
// マイページとは別に、サロン会員が「自社の紹介設計」を 22 項目に書き出す場所。
//
// Phase B（現在）:
//   - SSR で referral_worksheets から初期値取得 → Client (WorksheetEditor) に props で渡す
//   - 編集後は Client 側で debounce upsert（@/lib/coach/worksheet-storage）
//   - localStorage は使わない（クライアント間で同期できないため）
//
// Phase C:
//   - /members/app/coach の system prompt にこのデータを差し込み、個別化された応答を返す

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadWorksheet } from "@/lib/coach/worksheet-storage";
import { WorksheetEditor } from "./_components/WorksheetEditor";

export const metadata = {
  title: "紹介設計ワークシート | GIA Stories",
  description:
    "見せ方／価値／仕組み化の3視点で、自社の紹介設計を言語化する。書いた内容は紹介コーチが読み、個別化された助言を返します。",
};

export default async function WorksheetPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const initialData = await loadWorksheet(supabase, user.id);

  return <WorksheetEditor userId={user.id} initialData={initialData} />;
}
