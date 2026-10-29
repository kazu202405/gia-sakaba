// 店ごとのプロフィール（0134・0135）。どの店でどの項目を出すか・建設・不動産の店だけの選択肢を置く唯一の場所。
// 「どの店で何を出すか」の元は DB の guilds.profile_fields。この表（lib/guild/stores.ts の profileFields）と食い違うと
// stores.test.ts が落ちる。画面は store.config.profileFields を読み、関数（DB）も同じ一覧で返す項目を絞る。
// 名前・ふりがな・顔写真・連絡先・名刺は、どの店でも出すので一覧に入れない。

/** 項目の名前（DB の guilds.profile_fields と同じ綴り） */
export const PROFILE_FIELDS = [
  "headline",
  "job",
  /** 業種を自由に書く（タグ）。GIAの酒場 */
  "industry",
  /** 業種を選択肢から1つ選ぶ。建設・不動産の酒場 */
  "industry_choice",
  "region",
  /** 対応エリア（都道府県を複数） */
  "work_areas",
  "bio",
  "can_help_with",
  /** 得意な工事・できること（選択肢から複数） */
  "work_types",
  /** 許可・免許の印 */
  "licenses",
  "strengths",
  "values_text",
  "vision",
  "social_issue",
  "looking_for",
  "want_to_meet",
  "want_to_solve",
  "hometown",
  "hobbies",
  "life_story",
  "birthday",
  /** 伝えたいことに添える写真（任意・3枚まで） */
  "work_photos",
] as const;

export type ProfileField = (typeof PROFILE_FIELDS)[number];

export function storeHasField(config: { profileFields: readonly ProfileField[] }, field: ProfileField): boolean {
  return config.profileFields.includes(field);
}

/** 建設・不動産の店：業種の選択肢（キーが DB の guild_profiles.industry に入る） */
export const INDUSTRIES: readonly { key: string; label: string }[] = [
  { key: "roof", label: "屋根・外壁" },
  { key: "interior", label: "内装・リフォーム" },
  { key: "equipment", label: "設備・電気" },
  { key: "realestate", label: "不動産の仲介・管理" },
  { key: "finance", label: "補助金・資金" },
];

export function industryLabel(key: string): string {
  return INDUSTRIES.find((item) => item.key === key)?.label ?? "";
}

/** 建設・不動産の店：得意な工事・できること（DB の guild_profiles.work_types にそのまま入る） */
export const WORK_TYPES: readonly string[] = ["屋根", "外壁塗装", "雨漏り", "内装", "水まわり", "電気", "解体", "外構", "店舗改装", "賃貸管理"];

/** 建設・不動産の店：対応エリア（地方ごと） */
export const AREA_REGIONS: readonly { label: string; prefectures: readonly string[] }[] = [
  { label: "北海道・東北", prefectures: ["北海道", "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県"] },
  { label: "関東", prefectures: ["茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県"] },
  { label: "中部", prefectures: ["新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県", "岐阜県", "静岡県", "愛知県"] },
  { label: "近畿", prefectures: ["三重県", "滋賀県", "京都府", "大阪府", "兵庫県", "奈良県", "和歌山県"] },
  { label: "中国・四国", prefectures: ["鳥取県", "島根県", "岡山県", "広島県", "山口県", "徳島県", "香川県", "愛媛県", "高知県"] },
  { label: "九州・沖縄", prefectures: ["福岡県", "佐賀県", "長崎県", "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県"] },
];

/** 伝えたいことの写真：枚数の上限（DB のトリガーと sakaba_set_work_photos も 3） */
export const WORK_PHOTO_MAX = 3;
/** 伝えたいことの写真の保存場所（非公開バケット。0134） */
export const WORK_PHOTO_BUCKET = "sakaba-work-photos";
/** 元の画像の上限（縮める前） */
export const WORK_PHOTO_SOURCE_LIMIT = 20 * 1024 * 1024;

/** 保存場所の名前「<本人のid>/<店のid>/<ランダム>.jpg」 */
export function workPhotoPath(userId: string, guildId: string, token: string): string {
  return `${userId}/${guildId}/${token}.jpg`;
}

/** 顔写真の保存場所「<本人のid>/<店のid>/sakaba-avatar.jpg」（公開バケット profile-photos。店ごとに別の写真にできる） */
export function avatarPath(userId: string, guildId: string): string {
  return `${userId}/${guildId}/sakaba-avatar.jpg`;
}

/** 建設・不動産の店だけの項目（関数 sakaba_get_my_profile / sakaba_list_members が返す形） */
export type StoreProfileExtras = {
  work_areas: string[];
  work_types: string[];
  has_construction_license: boolean;
  has_real_estate_license: boolean;
  /** 伝えたいことの写真（保存場所の名前の並び） */
  work_photos: string[];
};

export const EMPTY_STORE_PROFILE_EXTRAS: StoreProfileExtras = {
  work_areas: [],
  work_types: [],
  has_construction_license: false,
  has_real_estate_license: false,
  work_photos: [],
};

/** 建設・不動産の店だけの項目を、この店で1つでも出すか（出さない店では保存の呼び出しもしない） */
export function hasStoreOnlyFields(config: { profileFields: readonly ProfileField[] }): boolean {
  return (["industry_choice", "work_areas", "work_types", "licenses"] as const).some((field) => storeHasField(config, field));
}

/** 業種を画面に出す文字。選ぶ店（industry_choice）はキー→名前、書く店はそのまま */
export function industryText(config: { profileFields: readonly ProfileField[] }, value: string): string {
  return storeHasField(config, "industry_choice") ? industryLabel(value) : value;
}
