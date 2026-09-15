import { Metadata } from "next";

export const metadata: Metadata = {
  title: { absolute: "プライバシーポリシー | 紹介設計研究所" },
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white pt-24 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">プライバシーポリシー</h1>
        <div className="prose prose-lg max-w-none">
          <p>
            Global Information Academy（以下、「当方」といいます。）は、本ウェブサイト上で提供するサービス（以下、「本サービス」といいます。）における、ユーザーの個人情報の取扱いについて、以下のとおりプライバシーポリシー（以下、「本ポリシー」といいます。）を定めます。
          </p>

          <h2 className="text-2xl font-bold mt-8 mb-4">第1条（個人情報）</h2>
          <p>
            「個人情報」とは、個人情報保護法にいう「個人情報」を指すものとし、生存する個人に関する情報であって、当該情報に含まれる氏名、生年月日、住所、電話番号、連絡先その他の記述等により特定の個人を識別できる情報及び容貌、指紋、声紋にかかるデータ、及び健康保険証の保険者番号などの当該情報単体から特定の個人を識別できる情報（個人識別情報）を指します。
          </p>

          {/* 以下、ダミーテキスト */}
          <h2 className="text-2xl font-bold mt-8 mb-4">第2条（個人情報の収集方法）</h2>
          <p>
            当方は、ユーザーが利用登録をする際に氏名、生年月日、住所、電話番号、メールアドレス、銀行口座番号、クレジットカード番号、運転免許証番号などの個人情報をお尋ねすることがあります。
          </p>

          <p>
            （ここにさらにポリシーが続きます）
          </p>
        </div>
      </div>
    </div>
  );
}
