"use client";

// 会の管理（seminars CRUD）。
// /admin 配下。認証ガードは middleware.ts で行う。
//
// 機能:
//   - 一覧表示（全 is_active）+ 各回の参加者数（event_attendees の count）
//   - 新規作成（モーダル）
//   - 編集（モーダル / 既存値プリフィル）
//   - 募集停止（is_active=false に UPDATE。削除はしない）
//
// is_admin() の RLS が効くため、anon key でも管理者ログイン中なら全件取得・更新が可能。

import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Calendar,
  MapPin,
  Users,
  Pencil,
  Power,
  X,
  Loader2,
  AlertCircle,
  CheckCircle,
  Video,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { MaterialsModal } from "./_components/MaterialsModal";

type EventType = "seminar" | "social" | "workshop" | "other";

interface SeminarRow {
  id: string;
  slug: string;
  title: string;
  date: string;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  description: string | null;
  capacity: number | null;
  line_group_url: string | null;
  recording_url: string | null;
  event_type: EventType;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface SeminarRowWithCount extends SeminarRow {
  attendees_count: number;
  materials_count: number;
}

interface FormState {
  slug: string;
  title: string;
  date: string;
  start_time: string;
  end_time: string;
  location: string;
  description: string;
  capacity: string; // 入力中は文字列で保持し、submit 時に number へ
  line_group_url: string;
  recording_url: string; // アーカイブ用 YouTube URL（過去回の録画）
  event_type: EventType;
  is_active: boolean;
  /**
   * slug を「種別 + 日付」から自動生成するかどうか。
   * - true: date / event_type 変更時に slug を上書き
   * - false: ユーザーが手動入力した（または編集モードで既存値が入った）ので自動更新しない
   */
  slugAutoMode: boolean;
}

const emptyForm: FormState = {
  slug: "",
  title: "",
  date: "",
  start_time: "",
  end_time: "",
  location: "",
  description: "",
  capacity: "",
  line_group_url: "",
  recording_url: "",
  event_type: "seminar",
  is_active: true,
  slugAutoMode: true,
};

const eventTypeLabel: Record<EventType, string> = {
  seminar: "セミナー",
  social: "懇親会",
  workshop: "ワークショップ",
  other: "その他",
};

// slug バリデーション：英数とハイフンのみ
const slugRegex = /^[a-z0-9-]+$/;

// slug 自動生成ルール：<event_type>-YYYYMMDD（例: seminar-20260526）
function generateSlug(eventType: EventType, date: string): string {
  if (!date) return "";
  const ymd = date.replace(/-/g, "");
  return `${eventType}-${ymd}`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function AdminSeminarsPage() {
  const supabase = useMemo(() => createClient(), []);

  const [rows, setRows] = useState<SeminarRowWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // 開催予定 / 過去の回 タブ
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  // 録画・資料 編集モーダル対象
  const [materialsTarget, setMaterialsTarget] =
    useState<SeminarRowWithCount | null>(null);

  // 今日（YYYY-MM-DD）で開催予定/過去を分ける
  const todayStr = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  })();
  const visibleRows = rows.filter((r) =>
    tab === "upcoming" ? r.date >= todayStr : r.date < todayStr,
  );

  // 一覧取得
  const fetchRows = async () => {
    setLoading(true);
    setLoadError(null);
    const { data, error } = await supabase
      .from("seminars")
      .select("*")
      .order("date", { ascending: false });

    if (error) {
      setLoadError(error.message);
      setRows([]);
      setLoading(false);
      return;
    }

    // 各 seminar の参加者数を head:true / count: 'exact' で取得（並列）
    const seminarRows = (data ?? []) as SeminarRow[];
    const counts = await Promise.all(
      seminarRows.map(async (s) => {
        const { count } = await supabase
          .from("event_attendees")
          .select("id", { count: "exact", head: true })
          .eq("seminar_id", s.id);
        return count ?? 0;
      })
    );
    // 資料件数をまとめて取得し seminar_id ごとに集計
    const materialsCount = new Map<string, number>();
    const { data: matData } = await supabase
      .from("seminar_materials")
      .select("seminar_id");
    for (const row of (matData ?? []) as { seminar_id: string }[]) {
      materialsCount.set(
        row.seminar_id,
        (materialsCount.get(row.seminar_id) ?? 0) + 1,
      );
    }
    const merged: SeminarRowWithCount[] = seminarRows.map((s, i) => ({
      ...s,
      attendees_count: counts[i],
      materials_count: materialsCount.get(s.id) ?? 0,
    }));
    setRows(merged);
    setLoading(false);
  };

  useEffect(() => {
    fetchRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  // モーダル open
  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormError(null);
    setModalMode("create");
  };

  const openEdit = (row: SeminarRow) => {
    setEditingId(row.id);
    setForm({
      slug: row.slug,
      title: row.title,
      date: row.date,
      start_time: row.start_time ?? "",
      end_time: row.end_time ?? "",
      location: row.location ?? "",
      description: row.description ?? "",
      capacity: row.capacity != null ? String(row.capacity) : "",
      line_group_url: row.line_group_url ?? "",
      recording_url: row.recording_url ?? "",
      event_type: row.event_type,
      is_active: row.is_active,
      // 編集時は既存 slug を尊重するため自動モードOFF
      slugAutoMode: false,
    });
    setFormError(null);
    setModalMode("edit");
  };

  const closeModal = () => {
    if (submitting) return;
    setModalMode(null);
    setEditingId(null);
    setForm(emptyForm);
    setFormError(null);
  };

  // submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // クライアントサイドのバリデーション
    if (!form.slug.trim()) {
      setFormError("slug は必須です");
      return;
    }
    if (!slugRegex.test(form.slug.trim())) {
      setFormError("slug は英数小文字とハイフンのみ使用できます");
      return;
    }
    if (!form.title.trim()) {
      setFormError("タイトルは必須です");
      return;
    }
    if (!form.date) {
      setFormError("開催日は必須です");
      return;
    }

    const capacityNum =
      form.capacity.trim() === "" ? null : Number(form.capacity);
    if (capacityNum !== null && (Number.isNaN(capacityNum) || capacityNum < 0)) {
      setFormError("定員は 0 以上の整数で入力してください");
      return;
    }

    setSubmitting(true);

    const payload = {
      slug: form.slug.trim(),
      title: form.title.trim(),
      date: form.date,
      start_time: form.start_time || null,
      end_time: form.end_time || null,
      location: form.location.trim() || null,
      description: form.description.trim() || null,
      capacity: capacityNum,
      line_group_url: form.line_group_url.trim() || null,
      recording_url: form.recording_url.trim() || null,
      event_type: form.event_type,
      is_active: form.is_active,
    };

    if (modalMode === "create") {
      const { error } = await supabase.from("seminars").insert(payload);
      if (error) {
        // 23505 = unique_violation（slug 重複）
        if (
          error.code === "23505" ||
          error.message.toLowerCase().includes("duplicate") ||
          error.message.toLowerCase().includes("unique")
        ) {
          setFormError("この slug は既に使われています");
        } else {
          setFormError(`作成に失敗しました：${error.message}`);
        }
        setSubmitting(false);
        return;
      }
      setToast("会を作成しました");
    } else if (modalMode === "edit" && editingId) {
      const { error } = await supabase
        .from("seminars")
        .update(payload)
        .eq("id", editingId);
      if (error) {
        if (
          error.code === "23505" ||
          error.message.toLowerCase().includes("duplicate") ||
          error.message.toLowerCase().includes("unique")
        ) {
          setFormError("この slug は既に使われています");
        } else {
          setFormError(`更新に失敗しました：${error.message}`);
        }
        setSubmitting(false);
        return;
      }
      setToast("会を更新しました");
    }

    setSubmitting(false);
    setModalMode(null);
    setEditingId(null);
    setForm(emptyForm);
    await fetchRows();
    // 軽いトースト：3秒後に消す
    setTimeout(() => setToast(null), 3000);
  };

  // 募集停止 / 再開
  const handleToggleActive = async (row: SeminarRowWithCount) => {
    setBusyId(row.id);
    const next = !row.is_active;
    const { error } = await supabase
      .from("seminars")
      .update({ is_active: next })
      .eq("id", row.id);
    if (error) {
      setToast(`更新に失敗しました：${error.message}`);
      setTimeout(() => setToast(null), 3000);
    } else {
      // 楽観的に local state も更新
      setRows((cur) =>
        cur.map((r) => (r.id === row.id ? { ...r, is_active: next } : r))
      );
      setToast(next ? "募集を再開しました" : "募集を停止しました");
      setTimeout(() => setToast(null), 3000);
    }
    setBusyId(null);
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)]">
      {/* セクションヘッダー */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">会の管理</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                セミナー・懇親会の作成と募集状況の管理
              </p>
            </div>
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-gray-800 transition-colors"
            >
              <Plus className="w-4 h-4" />
              新規作成
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* トースト（簡易） */}
        {toast && (
          <div className="mb-6 flex items-start gap-2 px-4 py-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 text-sm">
            <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{toast}</span>
          </div>
        )}

        {loadError && (
          <div className="mb-6 flex items-start gap-2 px-4 py-3 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-bold">データ取得エラー</p>
              <p className="mt-0.5 text-xs">{loadError}</p>
            </div>
          </div>
        )}

        {loading && (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
            <Loader2 className="w-6 h-6 text-gray-400 animate-spin mx-auto mb-2" />
            <p className="text-sm text-gray-400">読み込み中...</p>
          </div>
        )}

        {!loading && rows.length === 0 && !loadError && (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
            <Calendar className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400">
              まだ会が登録されていません
            </p>
            <button
              type="button"
              onClick={openCreate}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-gray-800 transition-colors"
            >
              <Plus className="w-4 h-4" />
              最初の会を作成
            </button>
          </div>
        )}

        {!loading && rows.length > 0 && (
          <div>
            {/* タブ：開催予定 / 過去の回 */}
            <div className="flex gap-1 mb-5 bg-gray-100 rounded-xl p-1 w-fit">
              <button
                type="button"
                onClick={() => setTab("upcoming")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  tab === "upcoming"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                開催予定
              </button>
              <button
                type="button"
                onClick={() => setTab("past")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  tab === "past"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                過去の回
              </button>
            </div>

            {visibleRows.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-gray-100 text-sm text-gray-400">
                {tab === "upcoming"
                  ? "開催予定の会はありません"
                  : "過去の会はありません"}
              </div>
            ) : (
              <div className="space-y-3">
                {visibleRows.map((r) => (
              <div
                key={r.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5"
              >
                <div className="flex items-start gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-base font-bold text-gray-900">
                        {r.title}
                      </span>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border ${
                          r.is_active
                            ? "bg-green-50 text-green-700 border-green-200"
                            : "bg-gray-50 text-gray-500 border-gray-200"
                        }`}
                      >
                        {r.is_active ? "募集中" : "停止"}
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                        {eventTypeLabel[r.event_type]}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDate(r.date)}
                        {r.start_time && (
                          <span>　{r.start_time.slice(0, 5)}</span>
                        )}
                        {r.end_time && (
                          <span>〜{r.end_time.slice(0, 5)}</span>
                        )}
                      </span>
                      {r.location && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {r.location}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        参加 {r.attendees_count}
                        {r.capacity != null && ` / ${r.capacity}`}
                      </span>
                      <span className="font-mono text-[10px] text-gray-400">
                        slug: {r.slug}
                      </span>
                      {tab === "past" && (
                        <span className="inline-flex items-center gap-1">
                          <Video className="w-3.5 h-3.5" />
                          録画 {r.recording_url ? "✓" : "—"} ／ 資料{" "}
                          {r.materials_count}件
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {tab === "past" && (
                      <button
                        type="button"
                        onClick={() => setMaterialsTarget(r)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-[var(--gia-teal,#2b7a78)] hover:opacity-90 transition-opacity"
                      >
                        <Video className="w-3.5 h-3.5" />
                        録画・資料
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => openEdit(r)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:border-gray-300 hover:bg-gray-50 transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      編集
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleActive(r)}
                      disabled={busyId === r.id}
                      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ${
                        r.is_active
                          ? "bg-white border border-red-200 text-red-600 hover:bg-red-50"
                          : "bg-white border border-green-200 text-green-700 hover:bg-green-50"
                      }`}
                    >
                      {busyId === r.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Power className="w-3.5 h-3.5" />
                      )}
                      {r.is_active ? "募集停止" : "募集再開"}
                    </button>
                  </div>
                </div>
              </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 会の作成・編集モーダル */}
      {modalMode && (
        <SeminarFormModal
          mode={modalMode}
          form={form}
          setForm={setForm}
          formError={formError}
          submitting={submitting}
          onClose={closeModal}
          onSubmit={handleSubmit}
        />
      )}

      {/* 録画・資料の編集モーダル（過去の回） */}
      {materialsTarget && (
        <MaterialsModal
          seminar={{
            id: materialsTarget.id,
            title: materialsTarget.title,
            recording_url: materialsTarget.recording_url,
          }}
          onClose={() => setMaterialsTarget(null)}
          onSaved={fetchRows}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// モーダル本体
// ─────────────────────────────────────────────────────────
interface ModalProps {
  mode: "create" | "edit";
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  formError: string | null;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void | Promise<void>;
}

function SeminarFormModal({
  mode,
  form,
  setForm,
  formError,
  submitting,
  onClose,
  onSubmit,
}: ModalProps) {
  const change = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[92vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-900">
            {mode === "create" ? "新しい会を作成" : "会を編集"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            aria-label="閉じる"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        <form
          onSubmit={onSubmit}
          className="flex-1 overflow-y-auto px-6 py-5 space-y-5"
        >
          {formError && (
            <div className="flex items-start gap-2 px-3.5 py-3 rounded-lg border border-red-200 bg-red-50 text-red-700 text-xs leading-[1.7]">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* slug — date / event_type から自動生成。手動編集も可 */}
          <Field
            label="slug（URL識別子）"
            required
            hint={
              form.slugAutoMode
                ? "種別 + 日付から自動生成中（例：seminar-20260526）。日付か種別を入れると自動入力されます。"
                : "手動入力中。英数小文字とハイフンのみ。「自動生成に戻す」で再計算できます。"
            }
          >
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={form.slug}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    slug: e.target.value,
                    slugAutoMode: false, // ユーザーが触ったら手動モードへ
                  }))
                }
                placeholder="(日付と種別を入れると自動生成されます)"
                className={inputClass}
                required
              />
              {!form.slugAutoMode && (
                <button
                  type="button"
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      slug: generateSlug(prev.event_type, prev.date),
                      slugAutoMode: true,
                    }))
                  }
                  className="flex-shrink-0 inline-flex items-center px-3 py-2 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors whitespace-nowrap"
                >
                  自動生成に戻す
                </button>
              )}
            </div>
          </Field>

          {/* title */}
          <Field label="タイトル" required>
            <input
              type="text"
              value={form.title}
              onChange={(e) => change("title", e.target.value)}
              placeholder="紹介獲得セミナー Vol.1"
              className={inputClass}
              required
            />
          </Field>

          {/* date / time */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="開催日" required>
              <input
                type="date"
                value={form.date}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    date: e.target.value,
                    // 自動モード時は slug も更新
                    slug: prev.slugAutoMode
                      ? generateSlug(prev.event_type, e.target.value)
                      : prev.slug,
                  }))
                }
                className={inputClass}
                required
              />
            </Field>
            <Field label="開始時刻">
              <input
                type="time"
                value={form.start_time}
                onChange={(e) => change("start_time", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="終了時刻">
              <input
                type="time"
                value={form.end_time}
                onChange={(e) => change("end_time", e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>

          {/* location */}
          <Field label="開催場所">
            <input
              type="text"
              value={form.location}
              onChange={(e) => change("location", e.target.value)}
              placeholder="オンライン / 東京・◯◯"
              className={inputClass}
            />
          </Field>

          {/* description */}
          <Field label="詳細説明">
            <textarea
              value={form.description}
              onChange={(e) => change("description", e.target.value)}
              rows={3}
              placeholder="この会の概要・対象者など"
              className={`${inputClass} resize-y`}
            />
          </Field>

          {/* capacity / event_type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="定員">
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={form.capacity}
                onChange={(e) => change("capacity", e.target.value)}
                placeholder="例：20"
                className={inputClass}
              />
            </Field>
            <Field label="種別">
              <select
                value={form.event_type}
                onChange={(e) => {
                  const newType = e.target.value as EventType;
                  setForm((prev) => ({
                    ...prev,
                    event_type: newType,
                    // 自動モード時は slug も更新
                    slug: prev.slugAutoMode
                      ? generateSlug(newType, prev.date)
                      : prev.slug,
                  }));
                }}
                className={inputClass}
              >
                {(Object.keys(eventTypeLabel) as EventType[]).map((t) => (
                  <option key={t} value={t}>
                    {eventTypeLabel[t]}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {/* line_group_url */}
          <Field label="LINEグループ招待URL" hint="承認後に参加者へ案内する想定">
            <input
              type="url"
              value={form.line_group_url}
              onChange={(e) => change("line_group_url", e.target.value)}
              placeholder="https://line.me/..."
              className={inputClass}
            />
          </Field>

          {/* recording_url（過去の勉強会＝アーカイブ） */}
          <Field
            label="録画動画URL（YouTube）"
            hint="開催後に設定。会員の「過去の勉強会」ページで埋め込み表示（限定公開URL推奨）"
          >
            <input
              type="url"
              value={form.recording_url}
              onChange={(e) => change("recording_url", e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className={inputClass}
            />
          </Field>

          {/* is_active */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => change("is_active", e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
            />
            <span className="text-sm text-gray-700">
              募集中（公開・申込受付）にする
            </span>
          </label>
        </form>

        <footer className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            キャンセル
          </button>
          <button
            type="submit"
            onClick={onSubmit}
            disabled={submitting}
            className="inline-flex items-center gap-1.5 px-5 py-2 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {mode === "create" ? "作成する" : "更新する"}
          </button>
        </footer>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// 入力スタイル定数
// ─────────────────────────────────────────────────────────
const inputClass =
  "block w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900/10";

interface FieldProps {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}

function Field({ label, required, hint, children }: FieldProps) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
        <span>{label}</span>
        {required && <span className="text-red-500 text-xs">*</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-[11px] text-gray-400">{hint}</p>}
    </div>
  );
}
