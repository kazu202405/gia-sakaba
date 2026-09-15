// Company Note（株・企業分析アプリ）への戻り先。
//
// 別ドメイン（note.gia2018.com）だが、認証は GIA の Supabase Auth に統一
// 済みなので、同じメール・パスワードでそのまま入れる。
//
// ⚠️ **決済の戻り先をここに集約する。** 直書きすると、片方だけ直して
//    もう片方が古いまま残る（GIA側とCompany Note側の両方に導線がある）。
export const NOTE_URL =
  process.env.NEXT_PUBLIC_COMPANY_NOTE_URL || "https://note.gia2018.com";
