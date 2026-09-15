"use client";

// 過去の勉強会の「録画・資料」を編集するモーダル（admin/seminars の過去タブから開く）。
//   - 録画メイン動画 = seminars.recording_url（YouTube）を編集・保存
//   - 資料 = seminar_materials（ファイル or URL）を追加・公開切替・削除
// ファイルは private バケット 'seminar-materials' にアップロード。会員側は署名URLで配信。

import { useEffect, useState } from "react";
import {
  X,
  Loader2,
  Trash2,
  FileText,
  LinkIcon,
  Plus,
  Eye,
  EyeOff,
  Save,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { uiConfirm } from "@/lib/ui-dialog";

const BUCKET = "seminar-materials";
const MAX_FILE_MB = 50;

interface MaterialRow {
  id: string;
  kind: "file" | "url";
  title: string;
  description: string | null;
  file_path: string | null;
  file_name: string | null;
  url: string | null;
  is_published: boolean;
}

interface Props {
  seminar: { id: string; title: string; recording_url: string | null };
  onClose: () => void;
  onSaved: () => void; // 親の一覧を再取得させる
}

export function MaterialsModal({ seminar, onClose, onSaved }: Props) {
  const supabase = createClient();

  const [recordingUrl, setRecordingUrl] = useState(seminar.recording_url ?? "");
  const [savingRec, setSavingRec] = useState(false);

  const [materials, setMaterials] = useState<MaterialRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 追加フォーム
  const [addKind, setAddKind] = useState<"file" | "url">("file");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [adding, setAdding] = useState(false);

  const fetchMaterials = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("seminar_materials")
      .select("id, kind, title, description, file_path, file_name, url, is_published")
      .eq("seminar_id", seminar.id)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) setError(error.message);
    else setMaterials((data ?? []) as MaterialRow[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchMaterials();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seminar.id]);

  // 録画URL保存
  const saveRecording = async () => {
    setSavingRec(true);
    setError(null);
    const { error } = await supabase
      .from("seminars")
      .update({ recording_url: recordingUrl.trim() || null })
      .eq("id", seminar.id);
    setSavingRec(false);
    if (error) {
      setError(`録画URLの保存に失敗：${error.message}`);
      return;
    }
    onSaved();
  };

  // 資料を追加
  const addMaterial = async () => {
    setError(null);
    if (!title.trim()) {
      setError("資料のタイトルを入力してください。");
      return;
    }
    if (addKind === "url" && !url.trim()) {
      setError("URLを入力してください。");
      return;
    }
    if (addKind === "file" && !file) {
      setError("ファイルを選択してください。");
      return;
    }
    if (addKind === "file" && file && file.size > MAX_FILE_MB * 1024 * 1024) {
      setError(`ファイルが大きすぎます（${MAX_FILE_MB}MB まで）。`);
      return;
    }

    setAdding(true);
    let filePath: string | null = null;
    let fileName: string | null = null;

    if (addKind === "file" && file) {
      const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
      const path = `${seminar.id}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { upsert: false, contentType: file.type });
      if (upErr) {
        setError(`アップロードに失敗：${upErr.message}`);
        setAdding(false);
        return;
      }
      filePath = path;
      fileName = file.name;
    }

    const { error: insErr } = await supabase.from("seminar_materials").insert({
      seminar_id: seminar.id,
      kind: addKind,
      title: title.trim(),
      description: description.trim() || null,
      file_path: filePath,
      file_name: fileName,
      url: addKind === "url" ? url.trim() : null,
      sort_order: materials.length,
    });
    setAdding(false);
    if (insErr) {
      setError(`資料の登録に失敗：${insErr.message}`);
      return;
    }
    // フォームリセット＋再取得
    setTitle("");
    setDescription("");
    setUrl("");
    setFile(null);
    await fetchMaterials();
    onSaved();
  };

  // 公開トグル
  const togglePublished = async (m: MaterialRow) => {
    const { error } = await supabase
      .from("seminar_materials")
      .update({ is_published: !m.is_published })
      .eq("id", m.id);
    if (error) {
      setError(error.message);
      return;
    }
    setMaterials((cur) =>
      cur.map((x) => (x.id === m.id ? { ...x, is_published: !x.is_published } : x)),
    );
    onSaved();
  };

  // 削除（ファイルなら Storage も消す）
  const removeMaterial = async (m: MaterialRow) => {
    const ok = await uiConfirm({
      title: "資料を削除します",
      message: `「${m.title}」を削除します。元には戻せません。`,
      okLabel: "削除する",
      danger: true,
    });
    if (!ok) return;
    if (m.kind === "file" && m.file_path) {
      await supabase.storage.from(BUCKET).remove([m.file_path]);
    }
    const { error } = await supabase
      .from("seminar_materials")
      .delete()
      .eq("id", m.id);
    if (error) {
      setError(error.message);
      return;
    }
    await fetchMaterials();
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl my-8">
        <header className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="min-w-0">
            <p className="text-[11px] text-gray-400">録画・資料の編集</p>
            <h2 className="text-sm font-bold text-gray-900 truncate">
              {seminar.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center w-9 h-9 rounded-md text-gray-500 hover:bg-gray-100"
            aria-label="閉じる"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="px-6 py-5 space-y-6">
          {error && (
            <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
              {error}
            </div>
          )}

          {/* 録画メイン動画 */}
          <section>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              録画動画URL（YouTube）
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={recordingUrl}
                onChange={(e) => setRecordingUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
              <button
                type="button"
                onClick={saveRecording}
                disabled={savingRec}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
              >
                {savingRec ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                保存
              </button>
            </div>
            <p className="text-[11px] text-gray-400 mt-1">
              限定公開URL推奨。会員の「過去の勉強会」で埋め込み再生されます。
            </p>
          </section>

          {/* 資料リスト */}
          <section>
            <h3 className="text-sm font-bold text-gray-900 mb-3">資料</h3>
            {loading ? (
              <div className="flex items-center gap-2 text-gray-400 text-sm py-4">
                <Loader2 className="w-4 h-4 animate-spin" /> 読み込み中...
              </div>
            ) : materials.length === 0 ? (
              <p className="text-xs text-gray-400 py-2">
                まだ資料はありません。下から追加できます。
              </p>
            ) : (
              <ul className="space-y-2">
                {materials.map((m) => (
                  <li
                    key={m.id}
                    className="flex items-start gap-3 px-3 py-2.5 rounded-lg border border-gray-200 bg-gray-50"
                  >
                    <span className="mt-0.5 text-gray-400 flex-shrink-0">
                      {m.kind === "file" ? (
                        <FileText className="w-4 h-4" />
                      ) : (
                        <LinkIcon className="w-4 h-4" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {m.title}
                        {!m.is_published && (
                          <span className="ml-2 text-[10px] text-amber-600">
                            非公開
                          </span>
                        )}
                      </p>
                      {m.description && (
                        <p className="text-xs text-gray-500 truncate">
                          {m.description}
                        </p>
                      )}
                      <p className="text-[11px] text-gray-400 truncate">
                        {m.kind === "file" ? m.file_name : m.url}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => togglePublished(m)}
                        title={m.is_published ? "非公開にする" : "公開する"}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-md text-gray-500 hover:bg-gray-200"
                      >
                        {m.is_published ? (
                          <Eye className="w-4 h-4" />
                        ) : (
                          <EyeOff className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeMaterial(m)}
                        title="削除"
                        className="inline-flex items-center justify-center w-8 h-8 rounded-md text-red-500 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* 資料を追加 */}
          <section className="border-t border-gray-100 pt-5">
            <h3 className="text-sm font-bold text-gray-900 mb-3">資料を追加</h3>
            <div className="flex gap-2 mb-3">
              <button
                type="button"
                onClick={() => setAddKind("file")}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                  addKind === "file"
                    ? "bg-gray-900 text-white"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                ファイル
              </button>
              <button
                type="button"
                onClick={() => setAddKind("url")}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                  addKind === "url"
                    ? "bg-gray-900 text-white"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                URL
              </button>
            </div>

            <div className="space-y-3">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="タイトル（例：当日スライド）"
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="説明（任意）"
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
              />
              {addKind === "file" ? (
                <input
                  type="file"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="block w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-gray-100 file:text-gray-700 file:text-sm file:font-medium hover:file:bg-gray-200"
                />
              ) : (
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://..."
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              )}
              <button
                type="button"
                onClick={addMaterial}
                disabled={adding}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--gia-teal,#2b7a78)] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
              >
                {adding ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                追加する
              </button>
            </div>
          </section>
        </div>

        <footer className="flex items-center justify-end px-6 py-4 border-t border-gray-100 bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100"
          >
            閉じる
          </button>
        </footer>
      </div>
    </div>
  );
}
