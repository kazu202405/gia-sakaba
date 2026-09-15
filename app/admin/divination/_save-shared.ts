// /admin/divination 保存系の型と定数。
// "use server" ファイル（_actions.ts）から定数を export できないため別ファイルに分離。
// このファイルはサーバ／クライアント両方から import できる。

// 保存ダイアログのデフォルト選択。
// 五島さんの主用途が goshima テナントへの保存のため、入口での既定値として使う。
export const DEFAULT_DIVINATION_TENANT_SLUG = "goshima";

export interface DivinationSavePayload {
  name: string;
  gender: string;          // "男性" | "女性" | "未指定"
  year: number;
  month: number;
  day: number;
  hour: number | null;
  minute: number | null;
  birthplace: string;
}

export interface PersonSearchHit {
  id: string;
  name: string;
  companyName: string | null;
  birthday: string | null;   // ISO date "YYYY-MM-DD"
  // 鑑定フォームの autofill 用フィールド。
  // SubjectPicker で選択した時にフォーム全体に流し込む。
  gender: string | null;
  birthHour: number | null;
  birthMinute: number | null;
  birthplace: string | null;
}

export interface AccessibleTenant {
  slug: string;
  name: string;
}
