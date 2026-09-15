// 売上ボトルネック診断（無料・公開・ログイン不要）。
// 正本: contexts/projects/gia/sales_bottleneck_diagnosis.md
//
// 20の質問で売上を5項目（集客/成約/単価/リピート/キャパ）に分解採点し、
// ボトルネックと「まず打つ一手」を返す自己診断ツール。
// リード取り（メール収集・DB保存）はなし。結果はその場で全表示＋画像/PDFで保存可。

import { DiagnosisForm } from "./_components/DiagnosisForm";

export const metadata = {
  title: "売上導線診断 | GIA",
  description:
    "20の質問で、あなたの売上が伸びるポイントを見える化。集客→見込み客化→商談化→成約→継続・紹介の5項目を採点し、まず伸ばすべき一手をお返しします。無料・登録不要。",
};

export default function DiagnosisPage() {
  return (
    <div className="min-h-screen bg-[var(--gia-deck-paper)] pt-24 pb-20 print:pt-0 print:pb-0 print:bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 print:px-0 print:max-w-none">
        <DiagnosisForm />
      </div>
    </div>
  );
}
