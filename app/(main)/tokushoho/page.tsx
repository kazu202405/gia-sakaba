import { Metadata } from "next";

export const metadata: Metadata = {
  title: { absolute: "特定商取引法に基づく表記 | 紹介設計研究所" },
};

// 注意：所在地・電話番号は仮置きです。施行前に正式な事業者情報（住所・電話・
// 社名の正式表記）を確定してください。価格・支払/解約/返金条件は利用規約と整合。

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <tr className="border-b border-gray-200 align-top">
      <th className="py-4 pr-4 font-medium text-gray-900 w-1/3 whitespace-nowrap">
        {label}
      </th>
      <td className="py-4 text-gray-700 leading-relaxed">{children}</td>
    </tr>
  );
}

export default function TokushohoPage() {
  return (
    <div className="min-h-screen bg-white pt-24 pb-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          特定商取引法に基づく表記
        </h1>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[15px]">
            <tbody>
              <Row label="販売事業者名">
                株式会社グローバル・インフォメーション・アカデミー
              </Row>
              <Row label="運営統括責任者">五島 一将</Row>
              <Row label="所在地">
                大阪府大阪市（※住所詳細は準備中）
              </Row>
              <Row label="電話番号">
                ご請求に応じて遅滞なく開示いたします（お問い合わせは下記メールにて承ります）。
              </Row>
              <Row label="メールアドレス">
                global.information.academy@gmail.com
              </Row>
              <Row label="販売価格">
                本会員：月額 4,980円（税別／税込 5,478円）
                <br />
                ※ 各プランの価格は申込画面に表示します。
              </Row>
              <Row label="商品代金以外の必要料金">
                インターネット接続に必要な通信料、決済に係る手数料等はお客様のご負担となります。
              </Row>
              <Row label="お支払い方法">クレジットカード決済</Row>
              <Row label="お支払い時期・自動更新">
                お申し込み時に初回分を決済し、以降は解約のない限り、毎月同日に自動的に更新（継続課金）されます。
              </Row>
              <Row label="役務の提供時期">
                決済完了後、直ちにご利用いただけます。
              </Row>
              <Row label="解約について">
                いつでも解約いただけます。解約は次回更新日の前日までに所定の方法でお手続きください。お手続きがない場合は自動的に更新されます。解約された場合も、当該利用期間の満了日まではご利用いただけます（日割りでの返金はございません）。
              </Row>
              <Row label="返品・返金について">
                本サービスは役務およびデジタルコンテンツの提供という性質上、当社の責めに帰すべき事由がある場合を除き、お申し込み後のキャンセル、ならびに既にお支払いいただいた料金の返品・返金は一切お受けできません。
              </Row>
            </tbody>
          </table>
        </div>

        <p className="mt-8 text-[13px] text-gray-500 leading-relaxed">
          ※ 本表記の所在地・電話番号は準備中の仮表示です。正式な内容は確定次第更新します。
        </p>
      </div>
    </div>
  );
}
