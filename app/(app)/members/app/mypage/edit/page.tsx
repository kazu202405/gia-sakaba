"use client";

// マイページ プロフィール編集画面（Phase 2）。
// applicants の全プロフィールフィールドを1画面で編集可能。
//
// 認証：未ログインなら /login へリダイレクト。
// 保存：autosave（debounce 2秒）＋手動「保存」ボタン（押すと即保存＋「保存しました」トースト）。
// レイアウト：編集フォームの1カラム。
// ストーリー入力：各設問に「例で書く」ボタンを置き、テンプレで書き出しの抵抗を下げる。

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Save,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  User,
  Briefcase,
  Sparkles,
  Users as UsersIcon,
  Heart,
  AtSign,
  WandSparkles,
  Camera,
  Upload,
  X,
  MapPin,
  Tag,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { genreOptions } from "@/lib/genres";
import { ImageCropDialog } from "@/components/profile/ImageCropDialog";
import { AiIntakeDialog, type IntakeDraft } from "./_components/AiIntakeDialog";
import { uiConfirm } from "@/lib/ui-dialog";

interface ProfileForm {
  // 基本
  name: string;
  name_furigana: string;
  nickname: string;
  photo_url: string;
  // 仕事
  role_title: string;
  job_title: string;
  headline: string;
  services_summary: string;
  genre: string;
  location: string;
  // ストーリー
  story_origin: string;
  story_turning_point: string;
  story_now: string;
  story_future: string;
  // つながり
  want_to_connect_with: string;
  // 人柄
  status_message: string;
  favorites: string;
  current_hobby: string;
  school_days_self: string;
  personal_values: string;
  // 連絡先
  contact_line: string;
  contact_instagram: string;
  contact_website: string;
}

const emptyForm: ProfileForm = {
  name: "",
  name_furigana: "",
  nickname: "",
  photo_url: "",
  role_title: "",
  job_title: "",
  headline: "",
  services_summary: "",
  genre: "",
  location: "",
  story_origin: "",
  story_turning_point: "",
  story_now: "",
  story_future: "",
  want_to_connect_with: "",
  status_message: "",
  favorites: "",
  current_hobby: "",
  school_days_self: "",
  personal_values: "",
  contact_line: "",
  contact_instagram: "",
  contact_website: "",
};

const PROFILE_SELECT =
  "name, name_furigana, nickname, photo_url, email, " +
  "role_title, job_title, headline, services_summary, genre, location, " +
  "story_origin, story_turning_point, story_now, story_future, " +
  "want_to_connect_with, " +
  "status_message, favorites, current_hobby, school_days_self, personal_values, " +
  "contact_line, contact_instagram, contact_website";

type TabKey = "profile" | "story" | "other";
type SaveStatus = "idle" | "saving" | "saved" | "unsaved";

// ストーリー設問のテンプレ。〇〇 を残して「埋め方」を示すドラフト
const STORY_EXAMPLES: Record<
  "story_origin" | "story_turning_point" | "story_now" | "story_future",
  string
> = {
  story_origin:
    "前職で〇〇な状況に直面したとき、自分なら違うやり方ができると思った。〇〇な人を支えるなら自分が一番役に立てる、と確信したのがきっかけ。",
  story_turning_point:
    "〇〇の出来事をきっかけに、それまで信じていた〇〇という前提が揺らいだ。代わりに「〇〇」を大事にするようになり、いまの仕事の核ができた。",
  story_now:
    "いま向き合っているのは〇〇な人。〇〇を提供することで、〇〇な状態に届ける役を担っている。一度に多くは扱わず、深く伴走することを大切にしている。",
  story_future:
    "これから先は〇〇という仕組みを残したい。一人ではなく〇〇な人と一緒に、〇〇な状態を当たり前にする。それが次に積みたい一段。",
};

export default function MypageEditPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      }
    >
      <MypageEditPageInner />
    </Suspense>
  );
}

function MypageEditPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);

  const [form, setForm] = useState<ProfileForm>(emptyForm);
  const [intakeOpen, setIntakeOpen] = useState(false);
  const [email, setEmail] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  // 初期タブは ?tab=story / other / profile で指定可（プロフ詳細のロックから誘導）
  const [tab, setTab] = useState<TabKey>(() => {
    const t = searchParams.get("tab");
    return t === "story" || t === "other" || t === "profile" ? t : "profile";
  });
  // 写真アップロードの状態
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // 「保存しました」トースト（手動「保存」ボタン押下時の明示フィードバック）
  const [savedToast, setSavedToast] = useState(false);
  // 写真クロップ用：選択した画像の object URL（モーダルを開くトリガー）
  const [cropSrc, setCropSrc] = useState<string | null>(null);

  const lastSavedFormRef = useRef<ProfileForm | null>(null);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 初回ロード：自分の applicants データを取得
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      const { data, error } = await supabase
        .from("applicants")
        .select(PROFILE_SELECT)
        .eq("id", user.id)
        .single();
      if (cancelled) return;
      if (error) {
        setLoadError(error.message);
        setLoading(false);
        return;
      }
      const row = data as unknown as Record<string, unknown>;
      const next: ProfileForm = { ...emptyForm };
      (Object.keys(emptyForm) as (keyof ProfileForm)[]).forEach((key) => {
        const v = row[key];
        if (typeof v === "string") next[key] = v;
      });
      setForm(next);
      setEmail((row.email as string | null) ?? user.email ?? "");
      setUserId(user.id);
      lastSavedFormRef.current = next;
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase, router]);

  // autosave: form 変更を検知して 2秒 debounce で保存
  useEffect(() => {
    if (loading || !lastSavedFormRef.current) return;

    const baseline = lastSavedFormRef.current;
    const changed = (Object.keys(form) as (keyof ProfileForm)[]).some(
      (k) => form[k] !== baseline[k],
    );
    if (!changed) return;

    if (form.name.trim().length === 0) {
      setSaveStatus("unsaved");
      return;
    }

    setSaveStatus("unsaved");
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      void autoSave();
    }, 2000);

    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
    // autoSave は form を closure で読むため依存に form が必要
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, loading]);

  // 写真アップロード（Supabase Storage `profile-photos/<user_id>/avatar.<ext>`）。
  // 成功すると form.photo_url を public URL に更新 → autosave が走る。
  const handlePhotoUpload = async (file: File) => {
    if (!userId) {
      setPhotoError("ログイン情報を取得できていません。再読み込みしてください。");
      return;
    }
    // バリデーション：画像 / 5MB 以下
    if (!file.type.startsWith("image/")) {
      setPhotoError("画像ファイルを選択してください。");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setPhotoError("ファイルサイズが大きすぎます（5MB まで）。");
      return;
    }

    setPhotoUploading(true);
    setPhotoError(null);

    // 拡張子を保ったままパス決定。常に同じ名前にして上書きする（upsert: true）。
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${userId}/avatar.${ext}`;

    const { error: upErr } = await supabase.storage
      .from("profile-photos")
      .upload(path, file, {
        upsert: true,
        cacheControl: "3600",
        contentType: file.type,
      });

    if (upErr) {
      setPhotoError(`アップロードに失敗しました：${upErr.message}`);
      setPhotoUploading(false);
      return;
    }

    const { data: pub } = supabase.storage
      .from("profile-photos")
      .getPublicUrl(path);

    // public URL に cache-buster を付けて、上書き後も最新が出るようにする
    const url = `${pub.publicUrl}?v=${Date.now()}`;
    change("photo_url", url);
    setPhotoUploading(false);
  };

  const handlePhotoRemove = () => {
    change("photo_url", "");
    setPhotoError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // 画像を選んだら直アップロードせず、まずクロップモーダルを開く（〇に収めてから保存）
  const openCropper = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setPhotoError("画像ファイルを選択してください。");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setPhotoError("ファイルサイズが大きすぎます（20MB まで）。");
      return;
    }
    setPhotoError(null);
    setCropSrc(URL.createObjectURL(file));
  };

  const closeCropper = () => {
    setCropSrc((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  };

  // クロップ確定 → 512x512 JPEG を avatar.jpg として既存アップロード処理に渡す
  const handleCropConfirm = (blob: Blob) => {
    const file = new File([blob], "avatar.jpg", { type: "image/jpeg" });
    closeCropper();
    void handlePhotoUpload(file);
  };

  const autoSave = async () => {
    setSaveStatus("saving");
    setSaveError(null);

    // /api/profile/save に丸投げ。サーバ側で auth / whitelist UPDATE / 完成度判定 /
    // 自動昇格 (tier='tentative' && 23項目全埋め → 'registered') / activity_log 記録 を一括実行。
    let res: Response;
    try {
      res = await fetch("/api/profile/save", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
    } catch (e) {
      setSaveError(
        `保存に失敗しました：${e instanceof Error ? e.message : "通信エラー"}`,
      );
      setSaveStatus("unsaved");
      return;
    }

    if (res.status === 401) {
      router.push("/login");
      return;
    }

    const data = (await res.json().catch(() => null)) as
      | { ok?: boolean; completeness?: number; error?: string }
      | null;

    if (!res.ok || !data?.ok) {
      setSaveError(`保存に失敗しました：${data?.error ?? "unknown error"}`);
      setSaveStatus("unsaved");
      return;
    }

    lastSavedFormRef.current = form;
    setSaveStatus("saved");
    // 自動保存・手動「保存」ボタンのどちらでも「保存しました」トーストを出す（安心優先）
    setSavedToast(true);
  };

  // 手動「保存」ボタン：保留中の autosave をフラッシュして即保存＋トースト
  const handleManualSave = () => {
    if (form.name.trim().length === 0) {
      setSaveError("お名前を入力してください。");
      return;
    }
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    void autoSave();
  };

  const change = <K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (saveError) setSaveError(null);
  };

  // AI下書きの反映：空欄の項目だけに入れる（本人が既に書いた内容は壊さない）。
  // setForm で form が変わると既存の autosave が走って保存される。
  const applyIntakeDraft = (draft: IntakeDraft) => {
    setForm((prev) => {
      const next = { ...prev };
      for (const [k, v] of Object.entries(draft)) {
        const key = k as keyof ProfileForm;
        if (
          key in next &&
          typeof v === "string" &&
          v.trim().length > 0 &&
          next[key].trim().length === 0
        ) {
          next[key] = v.trim();
        }
      }
      return next;
    });
    if (saveError) setSaveError(null);
  };

  // 「保存しました」トーストの自動消去（2.5秒）
  useEffect(() => {
    if (!savedToast) return;
    const t = setTimeout(() => setSavedToast(false), 2500);
    return () => clearTimeout(t);
  }, [savedToast]);

  // ストーリーの「例で書く」ボタンが押された時のハンドラ。既存値があれば確認してから上書き
  const applyStoryExample = async (
    key: "story_origin" | "story_turning_point" | "story_now" | "story_future",
  ) => {
    const current = form[key].trim();
    if (current.length > 0) {
      const ok = await uiConfirm({
        title: "例文で上書きします",
        message: "今書かれている内容は消えます。よろしいですか？",
        okLabel: "上書きする",
        danger: true,
      });
      if (!ok) return;
    }
    change(key, STORY_EXAMPLES[key]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full flex items-start gap-2 px-4 py-3 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>プロフィールの取得に失敗しました：{loadError}</span>
        </div>
      </div>
    );
  }

  const tabsMeta = [
    { key: "profile" as const, label: "プロフィール" },
    { key: "story" as const, label: "ストーリー" },
    { key: "other" as const, label: "その他" },
  ];

  return (
    <div className="min-h-screen">
      {/* スティッキーヘッダー */}
      <div className="sticky top-14 lg:top-0 z-20 bg-gray-50/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/members/app/mypage"
              className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors flex-shrink-0"
              aria-label="マイページに戻る"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">
              プロフィール編集
            </h1>
          </div>

          {/* 保存ステータス表示（autosave 連動）＋ 手動保存ボタン */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <SaveStatusIndicator status={saveStatus} />
            <button
              type="button"
              onClick={handleManualSave}
              disabled={saveStatus === "saving"}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--gia-navy)] text-white text-xs sm:text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              保存
            </button>
          </div>
        </div>

        {/* タブナビ（Linear風アンダーラインタブ + 進捗 N/Total） */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav
            role="tablist"
            aria-label="プロフィール編集セクション"
            className="flex gap-6 -mb-px"
          >
            {tabsMeta.map((t) => {
              const active = tab === t.key;
              // 進捗数（N/Total）はプレッシャーになるため表示しない（ラベルのみ）。
              return (
                <button
                  key={t.key}
                  type="button"
                  role="tab"
                  id={`tab-${t.key}`}
                  aria-selected={active}
                  aria-controls={`tabpanel-${t.key}`}
                  onClick={() => setTab(t.key)}
                  className={`py-3 text-sm border-b-2 transition-colors ${
                    active
                      ? "border-gray-900 text-gray-900 font-semibold"
                      : "border-transparent text-gray-500 font-medium hover:text-gray-700"
                  }`}
                >
                  <span>{t.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* 編集フォーム */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* AIと話して埋める（入力の最初のハードルを下げる導線） */}
        {/* 「注釈」ではなく「押せる主役」に見せる：立ったカード＋右端に実体ボタン＋矢印。 */}
        <button
          type="button"
          onClick={() => setIntakeOpen(true)}
          className="group w-full mb-6 flex items-center gap-4 px-5 py-4 rounded-2xl border border-[#1c3550]/25 bg-white shadow-sm hover:shadow-md hover:border-[#1c3550]/40 hover:-translate-y-0.5 transition-all text-left"
        >
          <span className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-gradient-to-br from-[#1c3550]/[0.06] to-[#c08a3e]/[0.14] flex-shrink-0">
            <Sparkles className="w-5 h-5 text-[#c08a3e]" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold text-[#1c3550]">
              AIと4問で、まとめて下書き
            </span>
            <span className="block text-[12px] text-gray-500">
              空欄だけに反映・あとで自由に修正できます
            </span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1c3550] text-white text-xs font-bold flex-shrink-0 group-hover:bg-[#0f2238] transition-colors">
            始める
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        </button>

        <form
          id="profile-form"
          onSubmit={handleSubmit}
          className="min-w-0"
        >
            {/* タブ: プロフィール（アカウント / 基本 / 仕事） */}
            <div
              role="tabpanel"
              id="tabpanel-profile"
              aria-labelledby="tab-profile"
              className={`space-y-8 ${tab === "profile" ? "" : "hidden"}`}
            >
              <Section icon={<User className="w-4 h-4" />} title="アカウント">
                <Field label="メールアドレス" hint="変更できません">
                  <input
                    type="text"
                    value={email}
                    readOnly
                    className="block w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-500"
                  />
                </Field>
              </Section>

              <Section icon={<User className="w-4 h-4" />} title="基本情報">
                {/* 写真：紹介で最初に見られる要素。基本情報のトップに置く */}
                <Field
                  label="プロフィール写真"
                  hint="紹介時の第一印象。明るい場所で撮った顔がはっきり分かるものが好まれます。5MB まで。"
                >
                  <PhotoUploader
                    photoUrl={form.photo_url}
                    displayName={form.nickname?.trim() || form.name?.trim() || ""}
                    uploading={photoUploading}
                    error={photoError}
                    onPick={() => fileInputRef.current?.click()}
                    onRemove={handlePhotoRemove}
                  />
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) openCropper(file);
                      e.target.value = "";
                    }}
                  />
                </Field>

                {/* お名前は最重要なので大きめに */}
                <Field label="お名前" required>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => change("name", e.target.value)}
                    placeholder="山田 太郎"
                    className={`${inputClass} text-base py-3 font-medium`}
                  />
                </Field>
                {/* ふりがな + ニックネームは補助情報。2列に並べて視覚的に格下げ */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="ふりがな">
                    <input
                      type="text"
                      value={form.name_furigana}
                      onChange={(e) => change("name_furigana", e.target.value)}
                      placeholder="やまだ たろう"
                      className={inputClass}
                    />
                  </Field>
                  <Field label="ニックネーム" hint="呼ばれ方として表示されます">
                    <input
                      type="text"
                      value={form.nickname}
                      onChange={(e) => change("nickname", e.target.value)}
                      placeholder="たろちゃん"
                      className={inputClass}
                    />
                  </Field>
                </div>
                <Field
                  label="ステータスメッセージ"
                  hint="LINEのプロフ一言と同じ感覚で。気軽に書き換えてOK。"
                >
                  <input
                    type="text"
                    value={form.status_message}
                    onChange={(e) => change("status_message", e.target.value)}
                    placeholder="今月は人材育成に集中中"
                    maxLength={60}
                    className={inputClass}
                  />
                </Field>
              </Section>

              <Section icon={<Briefcase className="w-4 h-4" />} title="仕事">
                <Field label="役職" hint="例：代表取締役 / マネージャー">
                  <input
                    type="text"
                    value={form.role_title}
                    onChange={(e) => change("role_title", e.target.value)}
                    placeholder="代表取締役"
                    className={inputClass}
                  />
                </Field>
                <Field label="職種・専門">
                  <input
                    type="text"
                    value={form.job_title}
                    onChange={(e) => change("job_title", e.target.value)}
                    placeholder="経営コンサルタント"
                    className={inputClass}
                  />
                </Field>
                <Field
                  label="一言で「何をしている人」？"
                  hint="紹介されるときの一言を意識して"
                >
                  <input
                    type="text"
                    value={form.headline}
                    onChange={(e) => change("headline", e.target.value)}
                    placeholder="人の可能性を信じ、組織を変える"
                    className={inputClass}
                  />
                </Field>
                <Field label="サービス内容" hint="提供しているサービスを簡潔に">
                  <textarea
                    value={form.services_summary}
                    onChange={(e) => change("services_summary", e.target.value)}
                    rows={3}
                    placeholder="例：中小企業向けの組織開発コンサルティング、研修設計、AIツール導入支援"
                    className={`${inputClass} resize-y`}
                  />
                </Field>

                {/* ジャンル + 拠点：2列に並べる（モバイルは1列） */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field
                    label="ジャンル"
                    hint="一番近いものを1つ。紹介する側がカテゴリで思い出せるように。"
                  >
                    <div className="relative">
                      <Tag className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <select
                        value={form.genre}
                        onChange={(e) => change("genre", e.target.value)}
                        className={`${inputClass} pl-9 pr-8 appearance-none bg-white cursor-pointer`}
                      >
                        <option value="">選択してください</option>
                        {genreOptions.map((g) => (
                          <option key={g} value={g}>
                            {g}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </Field>
                  <Field label="拠点" hint="活動の中心エリア。例：東京 / 大阪・神戸 / 福岡">
                    <div className="relative">
                      <MapPin className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={form.location}
                        onChange={(e) => change("location", e.target.value)}
                        placeholder="東京"
                        className={`${inputClass} pl-9`}
                      />
                    </div>
                  </Field>
                </div>
              </Section>
            </div>

            {/* タブ: ストーリー（4問 / つながり） */}
            <div
              role="tabpanel"
              id="tabpanel-story"
              aria-labelledby="tab-story"
              className={`space-y-8 ${tab === "story" ? "" : "hidden"}`}
            >
              <Section
                icon={<Sparkles className="w-4 h-4" />}
                title="ストーリー"
                description="あなたを知ってもらうための4つの問い。書き出しに迷ったら「例で書く」を押すとテンプレが入ります。"
              >
                <Field
                  label="この仕事を始めたきっかけは？"
                  exampleLabel="例で書く"
                  onApplyExample={() => applyStoryExample("story_origin")}
                >
                  <textarea
                    value={form.story_origin}
                    onChange={(e) => change("story_origin", e.target.value)}
                    rows={3}
                    placeholder="何があって、いまの道に進んだか"
                    className={`${inputClass} resize-y`}
                  />
                </Field>
                <Field
                  label="転機になった出来事は？"
                  exampleLabel="例で書く"
                  onApplyExample={() => applyStoryExample("story_turning_point")}
                >
                  <textarea
                    value={form.story_turning_point}
                    onChange={(e) =>
                      change("story_turning_point", e.target.value)
                    }
                    rows={3}
                    placeholder="あなたの考え方が変わった瞬間"
                    className={`${inputClass} resize-y`}
                  />
                </Field>
                <Field
                  label="今どんな想いで活動していますか？"
                  exampleLabel="例で書く"
                  onApplyExample={() => applyStoryExample("story_now")}
                >
                  <textarea
                    value={form.story_now}
                    onChange={(e) => change("story_now", e.target.value)}
                    rows={3}
                    placeholder="いま大切にしていること"
                    className={`${inputClass} resize-y`}
                  />
                </Field>
                <Field
                  label="これからやりたいことは？"
                  exampleLabel="例で書く"
                  onApplyExample={() => applyStoryExample("story_future")}
                >
                  <textarea
                    value={form.story_future}
                    onChange={(e) => change("story_future", e.target.value)}
                    rows={3}
                    placeholder="これから挑戦したいこと"
                    className={`${inputClass} resize-y`}
                  />
                </Field>
              </Section>

              <Section
                icon={<UsersIcon className="w-4 h-4" />}
                title="つながり"
                description="紹介してほしい相手像。具体的だと届きやすくなります。"
              >
                <Field label="どんな人とつながりたいですか？">
                  <textarea
                    value={form.want_to_connect_with}
                    onChange={(e) =>
                      change("want_to_connect_with", e.target.value)
                    }
                    rows={4}
                    placeholder="例：地方で人材育成に取り組む経営者の方、組織開発に悩んでる方"
                    className={`${inputClass} resize-y`}
                  />
                </Field>
              </Section>
            </div>

            {/* タブ: その他（人柄 / 連絡先 = 任意） */}
            <div
              role="tabpanel"
              id="tabpanel-other"
              aria-labelledby="tab-other"
              className={`space-y-8 ${tab === "other" ? "" : "hidden"}`}
            >
              <Section
                icon={<Heart className="w-4 h-4" />}
                title="人柄(任意)"
                description="あなたの人となりが伝わる質問。書けるところだけでOK。"
              >
                <Field label="好きなものは?">
                  <input
                    type="text"
                    value={form.favorites}
                    onChange={(e) => change("favorites", e.target.value)}
                    placeholder="例：コーヒー、サウナ、村上春樹"
                    className={inputClass}
                  />
                </Field>
                <Field label="最近ハマっていることは?">
                  <input
                    type="text"
                    value={form.current_hobby}
                    onChange={(e) => change("current_hobby", e.target.value)}
                    placeholder="例：盆栽、Pickleball、生成AI触り倒し"
                    className={inputClass}
                  />
                </Field>
                <Field label="学生時代どんな子でしたか?">
                  <textarea
                    value={form.school_days_self}
                    onChange={(e) => change("school_days_self", e.target.value)}
                    rows={2}
                    placeholder="例：体育会系で部活漬け、文化祭が一番盛り上がる派"
                    className={`${inputClass} resize-y`}
                  />
                </Field>
                <Field label="大切にしていることは?">
                  <textarea
                    value={form.personal_values}
                    onChange={(e) => change("personal_values", e.target.value)}
                    rows={2}
                    placeholder="例：相手の立場で考える、約束を守る、誠実であること"
                    className={`${inputClass} resize-y`}
                  />
                </Field>
              </Section>

              <Section
                icon={<AtSign className="w-4 h-4" />}
                title="連絡先(任意)"
                description="他のメンバーや主催者からの連絡導線。空欄でも構いません。"
              >
                <Field label="LINE" hint="LINE ID または LINE 表示名">
                  <input
                    type="text"
                    value={form.contact_line}
                    onChange={(e) => change("contact_line", e.target.value)}
                    placeholder="@line_id"
                    className={inputClass}
                  />
                </Field>
                <Field label="Instagram" hint="ユーザー名（@ なしでも可）">
                  <input
                    type="text"
                    value={form.contact_instagram}
                    onChange={(e) =>
                      change("contact_instagram", e.target.value)
                    }
                    placeholder="@username"
                    className={inputClass}
                  />
                </Field>
                <Field label="Webサイト">
                  <input
                    type="url"
                    value={form.contact_website}
                    onChange={(e) => change("contact_website", e.target.value)}
                    placeholder="https://example.com"
                    className={inputClass}
                  />
                </Field>
              </Section>
            </div>
        </form>
      </div>

      {/* エラー時のみ画面下部固定スナックバー */}
      {saveError && (
        <div
          role="alert"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-start gap-2 px-4 py-3 rounded-xl shadow-lg border text-sm max-w-[calc(100vw-2rem)] animate-in fade-in slide-in-from-bottom-2 duration-200 border-red-200 bg-red-50 text-red-700"
        >
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      {/* 「保存しました」トースト（手動保存時の明示フィードバック） */}
      {savedToast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-5 py-3 rounded-xl shadow-lg border text-sm border-emerald-200 bg-emerald-50 text-emerald-800 animate-in fade-in slide-in-from-bottom-2 duration-200"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span className="font-semibold">保存しました</span>
        </div>
      )}

      {/* 写真クロップ（FB/LINE風：〇に収めて確定） */}
      <ImageCropDialog
        open={!!cropSrc}
        src={cropSrc}
        onCancel={closeCropper}
        onConfirm={handleCropConfirm}
      />

      {/* AIと話して埋める（4問→下書きを空欄に反映） */}
      <AiIntakeDialog
        open={intakeOpen}
        onClose={() => setIntakeOpen(false)}
        onApply={applyIntakeDraft}
      />
    </div>
  );
}

// ─── 内部コンポーネント ────────────────────────────────

const inputClass =
  "block w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900/10";

interface SaveStatusIndicatorProps {
  status: SaveStatus;
}

function SaveStatusIndicator({ status }: SaveStatusIndicatorProps) {
  if (status === "idle") {
    return <div className="w-16 flex-shrink-0" aria-hidden="true" />;
  }
  return (
    <div
      role="status"
      aria-live="polite"
      className="inline-flex items-center gap-1.5 text-xs text-gray-500 flex-shrink-0"
    >
      {status === "saving" && (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>保存中…</span>
        </>
      )}
      {status === "saved" && (
        <>
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>保存済み</span>
        </>
      )}
      {status === "unsaved" && (
        <>
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          <span>未保存の変更</span>
        </>
      )}
    </div>
  );
}

interface SectionProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  /** true なら開閉可能（任意項目向け）。<details> でネイティブ実装する */
  collapsible?: boolean;
  /** collapsible 時の初期状態。デフォルトは閉じる */
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function Section({
  icon,
  title,
  description,
  collapsible = false,
  defaultOpen = false,
  children,
}: SectionProps) {
  if (!collapsible) {
    return (
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
        <header className="mb-5">
          <h2 className="flex items-center gap-2 text-base font-bold text-gray-900">
            <span className="text-teal-700">{icon}</span>
            {title}
          </h2>
          {description && (
            <p className="text-xs text-gray-500 leading-relaxed mt-2">
              {description}
            </p>
          )}
        </header>
        <div className="space-y-5">{children}</div>
      </section>
    );
  }

  // 開閉可能なセクション。<details>/<summary> でネイティブ実装
  return (
    <details
      open={defaultOpen}
      className="group bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
    >
      <summary className="cursor-pointer select-none list-none p-6 sm:p-8 flex items-center justify-between gap-2 hover:bg-gray-50/60 transition-colors [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-2 text-base font-bold text-gray-900">
          <span className="text-teal-700">{icon}</span>
          {title}
        </span>
        <ChevronDown className="w-4 h-4 text-gray-400 transition-transform duration-200 group-open:rotate-180" />
      </summary>
      <div className="px-6 sm:px-8 pb-6 sm:pb-8 pt-1 space-y-5">
        {description && (
          <p className="text-xs text-gray-500 leading-relaxed">{description}</p>
        )}
        {children}
      </div>
    </details>
  );
}

interface FieldProps {
  label: string;
  required?: boolean;
  hint?: string;
  /** 「例で書く」など、ラベル右に置く補助アクションのラベル */
  exampleLabel?: string;
  /** exampleLabel ボタンが押された時のハンドラ */
  onApplyExample?: () => void;
  children: React.ReactNode;
}

interface PhotoUploaderProps {
  photoUrl: string;
  displayName: string;
  uploading: boolean;
  error: string | null;
  onPick: () => void;
  onRemove: () => void;
}

// プロフィール写真のサムネ + 「変更」「削除」ボタンを束ねるサブコンポーネント。
// 写真未設定時はイニシャル円を出す（profile/[id] と表現を揃える）。
function PhotoUploader({
  photoUrl,
  displayName,
  uploading,
  error,
  onPick,
  onRemove,
}: PhotoUploaderProps) {
  const initial = displayName.slice(0, 1).toUpperCase() || "?";
  return (
    <div className="flex items-start gap-4">
      <div className="relative flex-shrink-0">
        {photoUrl ? (
          // 既にアップロード済み：実写を表示
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoUrl}
            alt="プロフィール写真"
            className="w-20 h-20 rounded-full object-cover border border-gray-200 bg-gray-50"
          />
        ) : (
          // 未設定：イニシャル円
          <div className="w-20 h-20 rounded-full flex items-center justify-center bg-teal-50 text-teal-700 font-bold text-2xl border border-teal-100">
            {initial}
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-white" />
          </div>
        )}
      </div>
      <div className="flex flex-col gap-2 min-w-0">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onPick}
            disabled={uploading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {photoUrl ? (
              <>
                <Camera className="w-3.5 h-3.5" />
                変更
              </>
            ) : (
              <>
                <Upload className="w-3.5 h-3.5" />
                写真を選択
              </>
            )}
          </button>
          {photoUrl && (
            <button
              type="button"
              onClick={onRemove}
              disabled={uploading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <X className="w-3.5 h-3.5" />
              削除
            </button>
          )}
        </div>
        {error && (
          <p className="text-[11px] text-red-600 leading-relaxed flex items-start gap-1">
            <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </p>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  hint,
  exampleLabel,
  onApplyExample,
  children,
}: FieldProps) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-900">
          <span>{label}</span>
          {required && (
            <span className="text-[10px] font-medium text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded tracking-wider">
              必須
            </span>
          )}
        </label>
        {exampleLabel && onApplyExample && (
          <button
            type="button"
            onClick={onApplyExample}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-500 hover:text-teal-700 transition-colors"
          >
            <WandSparkles className="w-3 h-3" />
            {exampleLabel}
          </button>
        )}
      </div>
      {children}
      {hint && (
        <p className="text-[11px] text-gray-500 mt-1.5 leading-relaxed">
          {hint}
        </p>
      )}
    </div>
  );
}

