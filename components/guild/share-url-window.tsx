"use client";

// マイページの「共有URL」の窓。会員以外にも見せるステータスのURLを、コピーして紹介に使う。
// 仕様：contexts/projects/gia/sakaba_share_url.md
// スイッチは押した瞬間に見た目を変え、保存に失敗したら元に戻して理由を出す（押したら、その瞬間に反応を見せる）。

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { applyShareChange, shareUrl, type ShareSettings, type ShareSwitch } from "@/lib/guild/shared-profile";
import { uiConfirm, uiToast } from "@/lib/ui-dialog";
import { Window } from "./cards";
import { CheckBox } from "./form-parts";

const SWITCHES: { key: ShareSwitch; label: string; note?: string }[] = [
  { key: "show_profile", label: "プロフィール", note: "仕事内容・おもい・さがしているもの・キーワード" },
  { key: "show_personal", label: "しゅみ・すきなこと／これまでの あゆみ" },
  { key: "show_card", label: "名刺", note: "ステータスの画面で登録した名刺が出ます" },
  { key: "show_intros", label: "紹介状", note: "ほかの会員が書いてくれた文章です" },
];

export function ShareUrlWindow({ initial }: { initial: ShareSettings }) {
  const [settings, setSettings] = useState(initial);
  const [origin, setOrigin] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  // 二重に押されないよう、押した瞬間にかける（stateは反映が遅れるので ref）
  const lock = useRef(false);

  useEffect(() => { setOrigin(window.location.origin); }, []);

  // 使いはじめた印（ホームの「共有URLを作りましょう」を消す）。失敗しても本体の操作は止めない
  function acknowledge() {
    void createClient().rpc("sakaba_ack_my_share", { p_guild_slug: "gia" });
  }
  const url = origin ? shareUrl(origin, settings.token) : "";

  async function change(patch: Partial<Omit<ShareSettings, "token">>) {
    if (lock.current) return;
    lock.current = true;
    const before = settings;
    const next = applyShareChange(settings, patch);
    setSettings(next);
    setSaving(true);
    setError("");
    try {
      const { error: rpcError } = await createClient().rpc("sakaba_update_my_share", {
        p_guild_slug: "gia", p_enabled: next.enabled, p_show_profile: next.show_profile, p_show_personal: next.show_personal,
        p_show_card: next.show_card, p_show_intros: next.show_intros, p_show_intro_authors: next.show_intro_authors,
      });
      if (rpcError) throw rpcError;
      uiToast("設定を保存しました");
      acknowledge();
    } catch {
      setSettings(before);
      setError("保存できませんでした。通信を確認して、もう一度お試しください。");
    } finally {
      setSaving(false);
      lock.current = false;
    }
  }

  async function rotate() {
    if (lock.current) return;
    const confirmed = await uiConfirm({
      title: "URLを作り直す",
      message: "今のURLは、その場で見られなくなります。すでに渡したURLも開けなくなります。",
      okLabel: "作り直す",
      danger: true,
    });
    if (!confirmed || lock.current) return;
    lock.current = true;
    setSaving(true);
    setError("");
    try {
      const { data, error: rpcError } = await createClient().rpc("sakaba_rotate_my_share", { p_guild_slug: "gia" });
      if (rpcError || typeof data !== "string") throw rpcError ?? new Error("token missing");
      setSettings((current) => ({ ...current, token: data }));
      uiToast("URLを作り直しました");
    } catch {
      setError("URLを作り直せませんでした。もう一度お試しください。");
    } finally {
      setSaving(false);
      lock.current = false;
    }
  }

  async function copy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      uiToast("URLをコピーしました");
      acknowledge();
    } catch {
      setError("コピーできませんでした。URLを長押しして、コピーしてください。");
    }
  }

  return <Window title="紹介してもらうための共有URL">
    <p className="text-[15px] leading-relaxed">あなたを紹介してもらうときに、LINEなどで貼ってもらうURLです。会員でない方にも、ステータスが見えます。</p>
    <p className="c-muted mt-1 text-xs leading-relaxed">連絡先と、出身地・誕生日は、どの設定でも出ません。</p>

    <div className="mt-5">
      <CheckBox checked={settings.enabled} disabled={saving} onChange={(value) => void change({ enabled: value })}>
        <span className="block text-[15px]">このURLで、ステータスを見せる</span>
        <span className="c-muted block text-xs">{settings.enabled ? "URLを知っている人が見られます。オフにすると、すぐに見られなくなります。" : "いまは誰も見られません。"}</span>
      </CheckBox>
    </div>

    <div className={`mt-5 ${settings.enabled ? "" : "opacity-50"}`} aria-disabled={!settings.enabled}>
      <label className="c-label block text-base" htmlFor="share-url">URL</label>
      <input id="share-url" readOnly value={url} onFocus={(event) => event.currentTarget.select()} className="c-input mt-1 w-full text-xs" aria-label="共有URL" />
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button type="button" disabled={!url || !settings.enabled} onClick={() => void copy()} className="rpg-button h-11 px-5 text-sm disabled:opacity-50">▶ URLをコピー</button>
        {url && settings.enabled && <a href={url} onClick={acknowledge} target="_blank" rel="noopener noreferrer" className="c-button-sub inline-flex h-11 items-center px-4 text-sm">見え方を確認する ↗</a>}
      </div>
    </div>

    <div className="c-dashed-top mt-6 pt-5">
      <p className="c-label text-base">見せるもの</p>
      <p className="c-muted mt-1 text-xs">名前・写真・ひとこと・しょくぎょう・ぎょうしゅ・ちいきは、いつも出ます。会社名は「名鑑に出す」の設定に従います。</p>
      <div className="mt-4 space-y-4">
        {SWITCHES.map((item) => <div key={item.key}>
          <CheckBox checked={settings[item.key]} disabled={saving || !settings.enabled} onChange={(value) => void change({ [item.key]: value })}>
            <span className="block text-[15px]">{item.label}</span>
            {item.note && <span className="c-muted block text-xs">{item.note}</span>}
          </CheckBox>
          {item.key === "show_intros" && <div className="mt-3 ml-9">
            <CheckBox checked={settings.show_intro_authors} disabled={saving || !settings.enabled || !settings.show_intros} onChange={(value) => void change({ show_intro_authors: value })}>
              <span className="block text-[15px]">書いた人の名前も出す</span>
              <span className="c-muted block text-xs">オンにすると、書いた人の名前が会員以外にも見えます。オフのときは、名前なしで出ます。</span>
            </CheckBox>
          </div>}
        </div>)}
      </div>
    </div>

    <div className="c-dashed-top mt-6 flex flex-wrap items-center gap-3 pt-5">
      <button type="button" disabled={saving} onClick={() => void rotate()} className="c-button-sub h-11 px-4 text-sm disabled:opacity-50">URLを作り直す</button>
      <p className="c-muted min-w-0 flex-1 text-xs leading-relaxed">URLを渡した相手に見せたくなくなったときに使います。</p>
    </div>
    <p role="status" aria-live="polite" className="c-muted mt-3 min-h-4 text-xs">{saving ? "保存中…" : ""}</p>
    {error && <p role="alert" className="mt-1 text-sm text-[#c62828]">{error}</p>}
  </Window>;
}
