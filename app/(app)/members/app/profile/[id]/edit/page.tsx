"use client";

import { use, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { notFound } from "next/navigation";
import { ArrowLeft, Upload, Camera, Check } from "lucide-react";
import { Member } from "@/lib/types";
import { getMemberById } from "@/lib/mock-data";
import { genreOptions } from "@/lib/genres";

// 編集対象の Member サブセット（id/slug/tags/createdAt 等は触らない）
type EditableMember = Pick<
  Member,
  | "name"
  | "nameFurigana"
  | "nickname"
  | "memberNumber"
  | "photoUrl"
  | "genre"
  | "roleTitle"
  | "jobTitle"
  | "location"
  | "headline"
  | "servicesSummary"
  | "storyOrigin"
  | "storyTurningPoint"
  | "storyNow"
  | "storyFuture"
  | "wantToConnectWith"
  | "favorites"
  | "currentHobby"
  | "schoolDaysSelf"
  | "values"
  | "statusMessage"
  | "allowDirectContact"
  | "contactLinks"
  | "contactLinksVisibility"
>;

// 1画面編集フォームのフィールド定義
type InputType =
  | "text"
  | "textarea"
  | "photo"
  | "select"
  | "locations"
  | "contactLine"
  | "contactSns"
  | "contactSite"
  | "allowDirectContactSwitch";

interface FieldDef {
  /** 質問番号（network_app.md の No.） */
  no: number;
  /** ステップ（1-6） */
  step: number;
  /** 必須／任意 */
  required: boolean;
  /** 見出し（フォームラベル） */
  label: string;
  /** 補足説明 */
  hint?: string;
  /** プレースホルダ */
  placeholder?: string;
  /** 入力タイプ */
  inputType: InputType;
  /** Member のフィールド名（contactLinks 系は別扱い） */
  field?: keyof EditableMember;
}

const stepTitles: Record<number, { title: string; subtitle: string }> = {
  1: { title: "STEP 1", subtitle: "基本情報" },
  2: { title: "STEP 2", subtitle: "仕事のこと" },
  3: { title: "STEP 3", subtitle: "ストーリー" },
  4: { title: "STEP 4", subtitle: "つながり" },
  5: { title: "STEP 5", subtitle: "人柄（任意）" },
  6: { title: "STEP 6", subtitle: "連絡先（任意）" },
};

// タブのラベル（短縮形・network_app.md の STEP に1:1対応）
const tabLabels: Record<number, string> = {
  1: "基本",
  2: "仕事",
  3: "ストーリー",
  4: "つながり",
  5: "人柄",
  6: "連絡先",
};

const fields: FieldDef[] = [
  // STEP 1：基本情報
  { no: 1, step: 1, required: true, label: "プロフィール写真", hint: "顔がわかる写真がおすすめ。後から変更できます。", inputType: "photo", field: "photoUrl" },
  { no: 2, step: 1, required: true, label: "お名前（漢字）", placeholder: "田中 一郎", inputType: "text", field: "name" },
  { no: 3, step: 1, required: true, label: "フリガナ", placeholder: "たなか いちろう", inputType: "text", field: "nameFurigana" },
  { no: 4, step: 1, required: true, label: "ニックネーム", hint: "プロフィールに表示される、呼んでほしい名前です。", placeholder: "いっちー", inputType: "text", field: "nickname" },
  // STEP 2：仕事のこと
  { no: 5, step: 2, required: true, label: "ジャンル", hint: "もっとも近いものを1つ選んでください。", inputType: "select", field: "genre" },
  { no: 6, step: 2, required: true, label: "役職", placeholder: "代表取締役、部長、フリーランスなど", inputType: "text", field: "roleTitle" },
  { no: 7, step: 2, required: true, label: "職種・専門", placeholder: "経営コンサルタント／組織開発", inputType: "text", field: "jobTitle" },
  { no: 8, step: 2, required: true, label: "拠点", hint: "複数ある場合は1行に1つずつ入力してください。", placeholder: "東京\n大阪", inputType: "locations", field: "location" },
  { no: 9, step: 2, required: true, label: "一言で「何をしている人」？", hint: "20〜30文字で、自分の仕事を一言にまとめてください。", placeholder: "人の可能性を信じ、組織を変える", inputType: "text", field: "headline" },
  { no: 10, step: 2, required: true, label: "サービス内容", placeholder: "組織開発コンサルティング / 経営者向けコーチング / リーダーシップ研修", inputType: "textarea", field: "servicesSummary" },
  // STEP 3：ストーリー
  { no: 11, step: 3, required: true, label: "この仕事を始めたきっかけ", hint: "原体験や、当時の気持ちを思い出して書いてみてください。", inputType: "textarea", field: "storyOrigin" },
  { no: 12, step: 3, required: true, label: "転機になった出来事", hint: "考え方が変わった瞬間や、人生の分岐点を教えてください。", inputType: "textarea", field: "storyTurningPoint" },
  { no: 13, step: 3, required: true, label: "今の想い", inputType: "textarea", field: "storyNow" },
  { no: 14, step: 3, required: true, label: "これからやりたいこと", inputType: "textarea", field: "storyFuture" },
  // STEP 4：つながり
  { no: 15, step: 4, required: true, label: "どんな人とつながりたいか", hint: "紹介を受けるときの判断材料になります。具体的にどうぞ。", inputType: "textarea", field: "wantToConnectWith" },
  // STEP 5：人柄（任意）
  { no: 16, step: 5, required: false, label: "好きなもの", placeholder: "本、コーヒー、朝の散歩…", inputType: "textarea", field: "favorites" },
  { no: 17, step: 5, required: false, label: "最近ハマっていること", inputType: "textarea", field: "currentHobby" },
  { no: 18, step: 5, required: false, label: "学生時代どんな子でしたか", inputType: "textarea", field: "schoolDaysSelf" },
  { no: 19, step: 5, required: false, label: "大切にしていること", inputType: "textarea", field: "values" },
  { no: 20, step: 5, required: false, label: "ステータスメッセージ", hint: "LINEのプロフ一言と同じように、気軽に書き換えるための短い一言。", placeholder: "今月は人材育成の話を聞きたい", inputType: "text", field: "statusMessage" },
  // STEP 6：連絡先（任意）
  { no: 21, step: 6, required: false, label: "LINE", hint: "公開／非公開はこの画面で切り替えられます。", placeholder: "https://line.me/...", inputType: "contactLine" },
  { no: 22, step: 6, required: false, label: "Instagram", placeholder: "https://instagram.com/...", inputType: "contactSns" },
  { no: 23, step: 6, required: false, label: "Webサイト", placeholder: "https://example.com", inputType: "contactSite" },
  { no: 24, step: 6, required: false, label: "アプリ内で直接連絡を許可", hint: "オフにすると、紹介依頼は主催者経由になります。", inputType: "allowDirectContactSwitch" },
];

// notFound 前にフックを呼ぶための、null セーフな初期値
const EMPTY_EDITABLE: EditableMember = {
  name: "",
  nameFurigana: "",
  nickname: "",
  memberNumber: "",
  photoUrl: "",
  genre: "",
  roleTitle: "",
  jobTitle: "",
  location: "",
  headline: "",
  servicesSummary: "",
  storyOrigin: "",
  storyTurningPoint: "",
  storyNow: "",
  storyFuture: "",
  wantToConnectWith: "",
  favorites: "",
  currentHobby: "",
  schoolDaysSelf: "",
  values: "",
  statusMessage: "",
  allowDirectContact: false,
  contactLinks: {},
  contactLinksVisibility: {},
};

// Member → EditableMember 変換
function toEditable(member: Member): EditableMember {
  return {
    name: member.name,
    nameFurigana: member.nameFurigana,
    nickname: member.nickname,
    memberNumber: member.memberNumber,
    photoUrl: member.photoUrl,
    genre: member.genre,
    roleTitle: member.roleTitle,
    jobTitle: member.jobTitle,
    location: member.location,
    headline: member.headline,
    servicesSummary: member.servicesSummary,
    storyOrigin: member.storyOrigin,
    storyTurningPoint: member.storyTurningPoint,
    storyNow: member.storyNow,
    storyFuture: member.storyFuture,
    wantToConnectWith: member.wantToConnectWith,
    favorites: member.favorites,
    currentHobby: member.currentHobby,
    schoolDaysSelf: member.schoolDaysSelf,
    values: member.values,
    statusMessage: member.statusMessage,
    allowDirectContact: member.allowDirectContact,
    contactLinks: { ...member.contactLinks },
    contactLinksVisibility: { ...(member.contactLinksVisibility ?? {}) },
  };
}

// 1フィールドが「入力済」かを判定するヘルパ
// allowDirectContact のような boolean は常に「入力済」扱い（true/false どちらでも値は確定している）
function isFieldFilled(f: FieldDef, data: EditableMember): boolean {
  switch (f.inputType) {
    case "contactLine":
      return Boolean(data.contactLinks.line && data.contactLinks.line.trim());
    case "contactSns":
      return Boolean(data.contactLinks.sns && data.contactLinks.sns.trim());
    case "contactSite":
      return Boolean(data.contactLinks.site && data.contactLinks.site.trim());
    case "allowDirectContactSwitch":
      // boolean は常に確定値があるとみなす（required=false かつ常に filled）
      return true;
    default: {
      const v = f.field ? (data[f.field] as unknown) : undefined;
      if (typeof v === "string") return v.trim().length > 0;
      if (typeof v === "boolean") return true;
      return Boolean(v);
    }
  }
}

export default function ProfileEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const initialMember = getMemberById(id);
  // フックは早期リターンより前にすべて宣言する（rules-of-hooks）
  // メンバー未取得時は仮データで初期化し、レンダー段階で notFound() を呼ぶ
  const initialData: EditableMember = useMemo(
    () => (initialMember ? toEditable(initialMember) : EMPTY_EDITABLE),
    [initialMember]
  );
  const backHref = `/members/app/profile/${id}`;
  const router = useRouter();

  const [data, setData] = useState<EditableMember>(initialData);
  // 現在選択中のタブ（= STEP番号 1-6）
  const [activeTab, setActiveTab] = useState<number>(1);

  // 通常フィールドの更新
  const update = <K extends keyof EditableMember>(key: K, value: EditableMember[K]) => {
    setData((prev) => ({ ...prev, [key]: value }));
  };

  // contactLinks の値更新
  const updateContact = (key: "line" | "sns" | "site", value: string) => {
    setData((prev) => ({
      ...prev,
      contactLinks: { ...prev.contactLinks, [key]: value || undefined },
    }));
  };

  // contactLinks の公開フラグ更新
  const updateContactVisibility = (key: "line" | "sns" | "site", isPublic: boolean) => {
    setData((prev) => ({
      ...prev,
      contactLinksVisibility: { ...(prev.contactLinksVisibility ?? {}), [key]: isPublic },
    }));
  };

  // 保存（mockのため実永続化はせず、view へ戻る）
  const handleSave = () => {
    router.push(backHref);
  };

  // STEPごとにフィールドをグルーピング
  const fieldsByStep = useMemo(() => {
    const groups: Record<number, FieldDef[]> = {};
    for (const f of fields) {
      if (!groups[f.step]) groups[f.step] = [];
      groups[f.step].push(f);
    }
    return groups;
  }, []);

  // タブ単位の進捗ステータス
  // - "incomplete": 必須未入力あり → 赤丸
  // - "complete":   全項目（必須も任意も）入力済 → 緑チェック
  // - "neutral":    必須は埋まっているが任意未入力あり → 何も表示しない
  type TabStatus = "incomplete" | "complete" | "neutral";
  const tabStatuses = useMemo<Record<number, TabStatus>>(() => {
    const result: Record<number, TabStatus> = {} as Record<number, TabStatus>;
    for (const stepStr of Object.keys(fieldsByStep)) {
      const step = Number(stepStr);
      const stepFields = fieldsByStep[step];
      const requiredMissing = stepFields.some(
        (f) => f.required && !isFieldFilled(f, data)
      );
      const allFilled = stepFields.every((f) => isFieldFilled(f, data));
      if (requiredMissing) {
        result[step] = "incomplete";
      } else if (allFilled) {
        result[step] = "complete";
      } else {
        result[step] = "neutral";
      }
    }
    return result;
  }, [data, fieldsByStep]);

  // 全フック宣言後の早期リターン（rules-of-hooks 準拠）
  if (!initialMember) return notFound();

  const inputClass =
    "w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all";
  const textareaClass =
    "w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all resize-none";

  // フィールド単体の入力UIをレンダリング
  const renderField = (f: FieldDef) => {
    switch (f.inputType) {
      case "text":
        return (
          <input
            type="text"
            value={(data[f.field as keyof EditableMember] as string | undefined) ?? ""}
            onChange={(e) => update(f.field as keyof EditableMember, e.target.value as never)}
            placeholder={f.placeholder}
            className={inputClass}
          />
        );
      case "textarea":
        return (
          <textarea
            rows={4}
            value={(data[f.field as keyof EditableMember] as string | undefined) ?? ""}
            onChange={(e) => update(f.field as keyof EditableMember, e.target.value as never)}
            placeholder={f.placeholder}
            className={textareaClass}
          />
        );
      case "locations":
        return (
          <textarea
            rows={3}
            value={data.location}
            onChange={(e) => update("location", e.target.value)}
            placeholder={f.placeholder}
            className={textareaClass}
          />
        );
      case "select":
        return (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-64 overflow-y-auto pr-1">
            {genreOptions.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => update("genre", g)}
                className={`px-3 py-2 text-xs rounded-lg border transition-all text-left ${
                  data.genre === g
                    ? "border-gray-900 bg-gray-900 text-white"
                    : "border-gray-200 bg-white text-gray-700 hover:border-gray-400"
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        );
      case "photo":
        return (
          <div className="flex items-center gap-4">
            {data.photoUrl ? (
              <img
                src={data.photoUrl}
                alt=""
                className="w-24 h-24 rounded-xl object-cover border border-gray-200"
              />
            ) : (
              <div className="w-24 h-24 rounded-xl bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center">
                <Upload className="w-8 h-8 text-gray-400" />
              </div>
            )}
            <label className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-medium cursor-pointer hover:bg-gray-800 transition-colors">
              <Camera className="w-4 h-4" />
              {data.photoUrl ? "写真を変更" : "写真を選ぶ"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      update("photoUrl", (ev.target?.result as string) ?? "");
                    };
                    reader.readAsDataURL(file);
                  }
                }}
              />
            </label>
          </div>
        );
      case "contactLine":
      case "contactSns":
      case "contactSite": {
        const key: "line" | "sns" | "site" =
          f.inputType === "contactLine" ? "line" : f.inputType === "contactSns" ? "sns" : "site";
        const value = data.contactLinks[key] ?? "";
        const isPublic = data.contactLinksVisibility?.[key] ?? false;
        return (
          <div className="space-y-2">
            <input
              type="url"
              value={value}
              onChange={(e) => updateContact(key, e.target.value)}
              placeholder={f.placeholder}
              className={inputClass}
            />
            <label className="flex items-center gap-3 px-3 py-2 bg-white rounded-lg border border-gray-200 cursor-pointer">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => updateContactVisibility(key, e.target.checked)}
                className="w-4 h-4 accent-gray-900"
              />
              <span className="text-xs text-gray-700">参加者一覧で公開する</span>
              <span className="ml-auto text-[10px] text-gray-400">
                {isPublic ? "公開" : "非公開"}
              </span>
            </label>
          </div>
        );
      }
      case "allowDirectContactSwitch":
        return (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => update("allowDirectContact", true)}
              className={`px-4 py-3 rounded-xl border text-left transition-all ${
                data.allowDirectContact
                  ? "border-gray-900 bg-gray-900 text-white"
                  : "border-gray-200 bg-white text-gray-700 hover:border-gray-400"
              }`}
            >
              <div className="font-bold text-sm mb-0.5">許可する</div>
              <div className={`text-[10px] leading-snug ${data.allowDirectContact ? "text-white/80" : "text-gray-500"}`}>
                公開した連絡先からの直接連絡を受け付ける
              </div>
            </button>
            <button
              type="button"
              onClick={() => update("allowDirectContact", false)}
              className={`px-4 py-3 rounded-xl border text-left transition-all ${
                !data.allowDirectContact
                  ? "border-gray-900 bg-gray-900 text-white"
                  : "border-gray-200 bg-white text-gray-700 hover:border-gray-400"
              }`}
            >
              <div className="font-bold text-sm mb-0.5">許可しない</div>
              <div className={`text-[10px] leading-snug ${!data.allowDirectContact ? "text-white/80" : "text-gray-500"}`}>
                紹介依頼は主催者経由（LINE）でのみ
              </div>
            </button>
          </div>
        );
      default:
        return null;
    }
  };

  // 表示中タブのフィールド
  const activeFields = fieldsByStep[activeTab] ?? [];
  const activeStepInfo = stepTitles[activeTab];

  // タブ右側の進捗マーカー
  const renderTabMarker = (status: TabStatus) => {
    if (status === "incomplete") {
      // 必須未入力あり → 赤丸
      return (
        <span
          className="inline-block w-2 h-2 rounded-full bg-red-500 shrink-0"
          aria-label="必須未入力あり"
        />
      );
    }
    if (status === "complete") {
      // 全項目入力済 → 緑チェック
      return (
        <span
          className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-emerald-500 shrink-0"
          aria-label="入力完了"
        >
          <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
        </span>
      );
    }
    return null;
  };

  // ===== タブ切替型・編集フォーム =====
  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー（sticky） */}
      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Link
                href={backHref}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors shrink-0"
                aria-label="戻る"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </Link>
              <h1 className="text-base sm:text-lg font-bold text-gray-900 truncate">
                プロフィール編集
              </h1>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* キャンセル */}
              <Link
                href={backHref}
                className="inline-flex items-center px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:border-gray-300 transition-colors"
              >
                キャンセル
              </Link>

              {/* 保存（mock：viewへ戻るのみ） */}
              <button
                onClick={handleSave}
                className="inline-flex items-center px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-gray-800 transition-colors"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* タブバー（ヘッダー直下に sticky） */}
      <div className="sticky top-[57px] sm:top-[60px] z-10 bg-gray-50/95 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-2 sm:px-6 lg:px-8">
          {/* SP は横スクロール、PC は均等割（flex-1） */}
          <div
            className="flex overflow-x-auto sm:overflow-x-visible"
            role="tablist"
            aria-label="プロフィール編集セクション"
          >
            {[1, 2, 3, 4, 5, 6].map((step) => {
              const isActive = step === activeTab;
              const status = tabStatuses[step] ?? "neutral";
              return (
                <button
                  key={step}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveTab(step)}
                  className={`
                    flex items-center justify-center gap-1.5
                    px-3 sm:px-2 py-3
                    text-xs sm:text-sm font-medium whitespace-nowrap
                    border-b-2 transition-colors
                    flex-1 min-w-[72px]
                    ${
                      isActive
                        ? "border-gray-900 text-gray-900"
                        : "border-transparent text-gray-500 hover:text-gray-700"
                    }
                  `}
                >
                  <span>{tabLabels[step]}</span>
                  {renderTabMarker(status)}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 本体: アクティブタブ（= STEP）のみ表示 */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <section
          key={activeTab}
          className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6"
          role="tabpanel"
        >
          {/* セクション見出し（STEP の title / subtitle は残す） */}
          <div className="mb-5 pb-3 border-b border-gray-100">
            <p className="text-xs font-bold tracking-widest text-gray-400">
              {activeStepInfo.title}
            </p>
            <h2 className="text-lg font-bold text-gray-900 mt-0.5">
              {activeStepInfo.subtitle}
            </h2>
          </div>

          {/* フィールド群 */}
          <div className="space-y-5">
            {activeFields.map((f) => (
              <div key={f.no}>
                <div className="flex items-center gap-2 mb-1.5">
                  <label className="text-sm font-bold text-gray-800">
                    {f.label}
                  </label>
                  {f.required && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-900 text-white">
                      必須
                    </span>
                  )}
                </div>
                {f.hint && (
                  <p className="text-xs text-gray-500 mb-2 leading-relaxed">
                    {f.hint}
                  </p>
                )}
                {renderField(f)}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
