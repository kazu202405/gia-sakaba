import { Metadata } from "next";

export const metadata: Metadata = {
  title: { absolute: "特定商取引法に基づく表記 | GIAの酒場" },
};

// GIAの酒場の特商法表記。2026-10-01 に酒場の料金へ書き直した。
// 所在地・電話番号は「請求があれば遅滞なく開示」とする（五島さん決定 2026-10-01）。
// 料金・解約・返金は /terms 第5・6条と、申し込み画面の要点（components/guild/legal-consent.tsx）と揃える。

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <tr className="block border-b border-gray-200 align-top sm:table-row">
      {/* スマホでは見出しを上、中身を下に積む（横に並べると表が画面からはみ出す） */}
      <th className="block pt-4 pb-1 font-medium text-gray-900 sm:table-cell sm:w-1/3 sm:whitespace-nowrap sm:py-4 sm:pr-4">
        {label}
      </th>
      <td className="block pb-4 text-gray-700 leading-relaxed [overflow-wrap:anywhere] sm:table-cell sm:py-4">{children}</td>
    </tr>
  );
}

export default function TokushohoPage() {
  return (
    <div className="min-h-screen bg-white pb-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          特定商取引法に基づく表記
        </h1>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[15px]">
            <tbody>
              <Row label="サービス名">GIAの酒場</Row>
              <Row label="販売事業者名">
                株式会社グローバル・インフォメーション・アカデミー
              </Row>
              <Row label="運営統括責任者">五島 一将</Row>
              <Row label="所在地">
                ご請求があれば、遅滞なく開示いたします（下記メールアドレスへご連絡ください）。
              </Row>
              <Row label="電話番号">
                ご請求があれば、遅滞なく開示いたします（下記メールアドレスへご連絡ください）。
              </Row>
              <Row label="メールアドレス">
                global.information.academy@gmail.com
              </Row>
              <Row label="販売価格">
                フリープラン：0円
                <br />
                プラスプラン：月額480円（税込）
                <br />
                ビジネスプラン：月額880円（税込）
              </Row>
              <Row label="商品代金以外の必要料金">
                インターネット接続に必要な通信料、決済に係る手数料等はお客様のご負担となります。
              </Row>
              <Row label="お支払い方法">クレジットカード決済（Stripe）</Row>
              <Row label="お支払い時期・自動更新">
                お申し込み時に初回分を決済し、以降は解約のない限り、毎月同日に自動的に更新（継続課金）されます。無料体験期間はありません。
              </Row>
              <Row label="役務の提供時期">
                決済完了後、直ちにご利用いただけます。
              </Row>
              <Row label="プランの変更">
                本サービス内の支払い管理画面から変更できます。変更に伴う請求額は、変更の手続時に表示される内容によります。
              </Row>
              <Row label="解約について">
                いつでも解約いただけます。解約は本サービス内の支払い管理画面から、次回更新日の前日までにお手続きください。お手続きがない場合は自動的に更新されます。解約された場合も、当該利用期間の満了日までは有料プランの機能をご利用いただけます。
              </Row>
              <Row label="返品・返金について">
                本サービスは役務の提供という性質上、当社の責めに帰すべき事由がある場合を除き、お申し込み後のキャンセル、ならびに既にお支払いいただいた料金の返金（日割りでの返金を含みます）はお受けできません。
              </Row>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
