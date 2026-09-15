export interface Tag {
  id: string;
  name: string;
  type: "industry" | "region" | "challenge" | "strength";
}

/**
 * 連絡先リンクの公開可否マップ。
 * STEP6 のウィザードで各項目に公開／非公開を設定するためのフラグ。
 * key は contactLinks のキーと同じ（"line" | "sns" | "site"）。
 */
export interface ContactLinksVisibility {
  line?: boolean;
  sns?: boolean;
  site?: boolean;
}

export interface Member {
  id: string;
  slug: string;
  /** STEP1: 名前（漢字） */
  name: string;
  /** STEP1: 名前（フリガナ） */
  nameFurigana: string;
  /** STEP1: ニックネーム／呼ばれ方 */
  nickname: string;
  /** STEP1: 会員番号（自動採番、文字列。例 "001"） */
  memberNumber: string;
  /** STEP1: プロフィール写真URL */
  photoUrl: string;
  /** STEP2: ジャンル（43種から1つ選択。lib/genres.ts 参照） */
  genre: string;
  /** STEP2: 役職 */
  roleTitle: string;
  /** STEP2: 職種・専門 */
  jobTitle: string;
  /** STEP2: 拠点（複数可。改行区切りで保存） */
  location: string;
  /** STEP2: 一言で「何をしている人」か */
  headline: string;
  /** STEP2: サービス内容のサマリ */
  servicesSummary: string;
  /** STEP3: この仕事を始めたきっかけ */
  storyOrigin: string;
  /** STEP3: 転機になった出来事 */
  storyTurningPoint: string;
  /** STEP3: 今どんな想いで活動しているか */
  storyNow: string;
  /** STEP3: これからやりたいこと */
  storyFuture: string;
  /** STEP4: どんな人とつながりたいか（紹介導線の核・必須） */
  wantToConnectWith: string;
  /** STEP5: 好きなもの（任意） */
  favorites?: string;
  /** STEP5: 最近ハマっていること（任意） */
  currentHobby?: string;
  /** STEP5: 学生時代どんな子だったか（任意） */
  schoolDaysSelf?: string;
  /** STEP5: 大切にしていること（任意） */
  values?: string;
  /** STEP5: ステータスメッセージ（LINEのプロフ一言と同種、気軽に書き換える短文。任意） */
  statusMessage?: string;
  tags: Tag[];
  status: "draft" | "published" | "private";
  /** STEP6: アプリ内で直接連絡を許可するか */
  allowDirectContact: boolean;
  /** STEP6: 各種連絡先（値）。既存スキーマ互換のため文字列で保持 */
  contactLinks: {
    line?: string;
    site?: string;
    sns?: string;
  };
  /** STEP6: 各項目の公開／非公開フラグ。未指定時は非公開扱い */
  contactLinksVisibility?: ContactLinksVisibility;
  /** 将来の CRM 連携用ID（Company OS の data/crm/ と紐づけ） */
  crmRefId?: string;
  createdAt: string;
  updatedAt: string;
}
