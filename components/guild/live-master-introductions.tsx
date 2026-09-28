"use client";

import { useState, type FormEvent } from "react";
import { useGuildRouter } from "@/components/guild/use-guild-router";
import type { Profile } from "@/lib/guild/types";
import {
  MASTER_INTRO_COMPANY_MAX,
  MASTER_INTRO_NAME_MAX,
  MASTER_INTRO_TEXT_MAX,
  masterIntroductionOutcomeLabel,
  masterIntroductionStatusLabel,
  validateMasterIntroduction,
  type MasterIntroduction,
  type MasterIntroductionDraft,
  type MasterIntroductionOutcome,
  type MasterIntroductionPersonDraft,
} from "@/lib/guild/master-introductions";
import { formatDate, formatJstDate } from "@/lib/guild/labels";
import { createClient } from "@/lib/supabase/client";
import { uiConfirm, uiToast } from "@/lib/ui-dialog";
import { Window } from "./cards";

const emptyPerson: MasterIntroductionPersonDraft = { member_id: "", name: "", company: "", preview: "" };
const emptyDraft: MasterIntroductionDraft = { reason: "", a: { ...emptyPerson }, b: { ...emptyPerson } };

type CreatedLinks = {
  a: { participant_id: string; token: string };
  b: { participant_id: string; token: string };
  names: { a: string; b: string };
};

function introUrl(token: string) {
  return `${window.location.origin}/i/${token}`;
}

function PersonFields({ label, value, members, onChange }: {
  label: string;
  value: MasterIntroductionPersonDraft;
  members: Profile[];
  onChange: (next: MasterIntroductionPersonDraft) => void;
}) {
  function selectMember(memberId: string) {
    const member = members.find((item) => item.id === memberId);
    onChange(member
      ? { ...value, member_id: member.id, name: member.display_name, company: member.company_name ?? "" }
      : { ...value, member_id: "", name: "", company: "" });
  }

  return <fieldset className="c-card min-w-0 p-4 sm:p-5">
    <legend className="c-chip px-2 text-xs">{label}</legend>
    <label className="block text-sm">酒場との関係
      <select className="c-input mt-1 h-11" value={value.member_id} onChange={(event) => selectMember(event.target.value)}>
        <option value="">会員外の方</option>
        {members.map((member) => <option key={member.id} value={member.id}>{member.display_name}{member.company_name ? `・${member.company_name}` : ""}</option>)}
      </select>
    </label>
    <div className="mt-4 grid gap-4 sm:grid-cols-2">
      <label className="block text-sm">お名前 <span className="text-[#b52a2a]">必須</span>
        <input className="c-input mt-1 h-11" value={value.name} onChange={(event) => onChange({ ...value, name: event.target.value })} maxLength={MASTER_INTRO_NAME_MAX} required />
      </label>
      <label className="block text-sm">会社名・屋号 <span className="c-muted text-xs">任意</span>
        <input className="c-input mt-1 h-11" value={value.company} onChange={(event) => onChange({ ...value, company: event.target.value })} maxLength={MASTER_INTRO_COMPANY_MAX} />
      </label>
    </div>
    <label className="mt-4 block text-sm">もう一人へ先に見せる紹介 <span className="text-[#b52a2a]">必須</span>
      <textarea className="c-input mt-1 min-h-28 resize-y p-3" value={value.preview} onChange={(event) => onChange({ ...value, preview: event.target.value })} maxLength={MASTER_INTRO_TEXT_MAX} placeholder="氏名を出さず、仕事や関心、つなぎたい理由が伝わる説明" required />
      <span className="c-muted mt-1 block text-xs">双方が承諾するまでは、この文章だけが相手に見えます。{value.preview.length}/{MASTER_INTRO_TEXT_MAX}字</span>
    </label>
  </fieldset>;
}

export function LiveMasterIntroductions({ initial, members }: { initial: MasterIntroduction[]; members: Profile[] }) {
  const router = useGuildRouter();
  const [items, setItems] = useState(initial);
  const [draft, setDraft] = useState<MasterIntroductionDraft>(emptyDraft);
  const [links, setLinks] = useState<CreatedLinks | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function reload() {
    const { data, error: listError } = await createClient().rpc("sakaba_list_master_introductions", { p_guild_slug: "gia" });
    if (listError) throw listError;
    setItems(Array.isArray(data) ? data as MasterIntroduction[] : []);
  }

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const validation = validateMasterIntroduction(draft);
    if (validation) { setError(validation); return; }
    setPending("create"); setError(""); setLinks(null);
    const fields = {
      p_guild_slug: "gia",
      p_reason: draft.reason.trim(),
      p_a_member_id: draft.a.member_id || null,
      p_a_name: draft.a.name.trim(),
      p_a_company: draft.a.company.trim(),
      p_a_preview: draft.a.preview.trim(),
      p_b_member_id: draft.b.member_id || null,
      p_b_name: draft.b.name.trim(),
      p_b_company: draft.b.company.trim(),
      p_b_preview: draft.b.preview.trim(),
    };
    try {
      const { data, error: createError } = await createClient().rpc("sakaba_create_master_introduction", fields);
      if (createError || !data?.a?.token || !data?.b?.token) throw createError ?? new Error("links missing");
      setLinks({ ...(data as Omit<CreatedLinks, "names">), names: { a: draft.a.name.trim(), b: draft.b.name.trim() } });
      setDraft(emptyDraft);
      await reload();
      uiToast("2人分の紹介URLを作成しました");
      router.refresh();
    } catch {
      setError("紹介URLを作成できませんでした。内容を確認して、もう一度お試しください。");
    } finally {
      setPending(null);
    }
  }

  async function copy(token: string, name: string) {
    try {
      await navigator.clipboard.writeText(introUrl(token));
      uiToast(`${name}さん用のURLをコピーしました`);
    } catch {
      setError("URLをコピーできませんでした。表示されたURLを選択してコピーしてください。");
    }
  }

  async function rotate(participantId: string, name: string) {
    if (pending) return;
    const confirmed = await uiConfirm({
      title: `${name}さん用のURLを再発行します`,
      message: "これまでのURLは使えなくなります。新しいURLを本人へ送り直してください。",
      okLabel: "再発行する",
    });
    if (!confirmed) return;
    setPending(participantId); setError("");
    try {
      const { data, error: rotateError } = await createClient().rpc("sakaba_rotate_master_introduction_link", { p_participant_id: participantId });
      if (rotateError || typeof data !== "string") throw rotateError ?? new Error("token missing");
      await navigator.clipboard.writeText(introUrl(data));
      await reload();
      uiToast(`${name}さん用の新しいURLをコピーしました`);
    } catch {
      setError("URLを再発行できませんでした。画面を読み直して再度お試しください。");
    } finally {
      setPending(null);
    }
  }

  async function cancel(item: MasterIntroduction) {
    if (pending) return;
    const confirmed = await uiConfirm({
      title: "この紹介を取り消します",
      message: "2人の専用URLに、紹介が取り消されたことが表示されます。",
      okLabel: "取り消す",
      danger: true,
    });
    if (!confirmed) return;
    setPending(item.id); setError("");
    try {
      const { error: cancelError } = await createClient().rpc("sakaba_cancel_master_introduction", { p_introduction_id: item.id });
      if (cancelError) throw cancelError;
      await reload();
      uiToast("紹介を取り消しました");
    } catch {
      setError("紹介を取り消せませんでした。画面を読み直して再度お試しください。");
    } finally {
      setPending(null);
    }
  }

  async function setOutcome(item: MasterIntroduction, outcome: MasterIntroductionOutcome) {
    if (pending) return;
    setPending(item.id); setError("");
    try {
      const { error: outcomeError } = await createClient().rpc("sakaba_set_master_introduction_outcome", {
        p_introduction_id: item.id, p_outcome: outcome,
      });
      if (outcomeError) throw outcomeError;
      await reload();
      uiToast("紹介後の結果を記録しました");
    } catch {
      setError("結果を記録できませんでした。再度お試しください。");
    } finally {
      setPending(null);
    }
  }

  return <div className="space-y-5">
    <Window title="人をつなぐ">
      <p className="text-sm leading-relaxed">会員同士、または会員と会員外の方をつなぎます。相手ごとに別のURLを渡し、双方が承諾するまで氏名と連絡先は開きません。</p>
      <form onSubmit={(event) => void create(event)} className="mt-6 space-y-5">
        <label className="block text-sm">つなぎたい理由 <span className="text-[#b52a2a]">必須</span>
          <textarea className="c-input mt-1 min-h-24 resize-y p-3" value={draft.reason} onChange={(event) => setDraft({ ...draft, reason: event.target.value })} maxLength={MASTER_INTRO_TEXT_MAX} placeholder="なぜこの2人に話してほしいのか。双方に同じ文章を表示します。" required />
          <span className="c-muted mt-1 block text-xs">双方が承諾する前から表示します。相手の氏名・会社名は書かないでください。{draft.reason.length}/{MASTER_INTRO_TEXT_MAX}字</span>
        </label>
        <div className="grid gap-5 xl:grid-cols-2">
          <PersonFields label="Aさん" value={draft.a} members={members} onChange={(a) => setDraft({ ...draft, a })} />
          <PersonFields label="Bさん" value={draft.b} members={members} onChange={(b) => setDraft({ ...draft, b })} />
        </div>
        <p className="c-muted text-xs">少なくとも一方は酒場の会員を選んでください。会員外の方も、酒場へ入会せずメール確認だけで回答できます。</p>
        {error && <p role="alert" className="text-sm text-[#b52a2a]">{error}</p>}
        <button type="submit" disabled={pending !== null} className="rpg-button min-h-12 px-5 text-sm disabled:opacity-50">{pending === "create" ? "作成中…" : "▶ 2人分の紹介URLを作る"}</button>
      </form>
      {links && <div role="status" className="c-card mt-6 space-y-4 border-dashed p-4 sm:p-5">
        <p className="text-sm leading-relaxed">専用URLを作成しました。それぞれ本人にだけ送ってください。この画面を離れた後は、必要に応じてURLを再発行できます。</p>
        {(["a", "b"] as const).map((side) => {
          const value = introUrl(links[side].token);
          return <div key={side} className="min-w-0"><p className="c-label mb-1 text-xs">{links.names[side]}さん用URL</p><div className="flex min-w-0 flex-col gap-2 sm:flex-row"><input className="c-input min-w-0 flex-1 text-xs" readOnly value={value} onFocus={(event) => event.target.select()} /><button type="button" onClick={() => void copy(links[side].token, links.names[side])} className="c-button-sub min-h-11 px-4 text-sm">コピー</button></div></div>;
        })}
      </div>}
    </Window>

    <Window title="人をつないだ記録" action={<span className="c-muted text-xs">{items.length}件</span>}>
      {error && <p role="alert" className="mb-4 text-sm text-[#b52a2a]">{error}</p>}
      {items.length === 0 ? <p className="c-muted text-sm">まだ紹介はありません。上のコマンドから最初の2人をつないでみましょう。</p> : <ul className="space-y-4">{items.map((item) => {
        const [a, b] = item.participants;
        const accepted = item.participants.filter((person) => person.response_status === "accepted").length;
        return <li key={item.id} className="c-card p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-base break-words">{a?.name ?? "Aさん"} <span className="c-label">⇄</span> {b?.name ?? "Bさん"}</p><p className="c-muted mt-1 text-xs">{formatDate(item.created_at)} 作成 ・ {item.status === "waiting" ? `${accepted}/2人承諾 ・ ${formatJstDate(item.expires_at)}まで` : masterIntroductionStatusLabel[item.status]}</p></div><span className={item.status === "connected" ? "c-chip-strong" : "c-chip"}>{masterIntroductionStatusLabel[item.status]}</span></div>
          <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed">{item.reason}</p>
          <div className="mt-4 grid gap-2 text-xs sm:grid-cols-2">{item.participants.map((person) => <div key={person.id} className="border border-[#1b2a41]/20 px-3 py-2"><p>{person.name}{person.member_user_id ? "（会員）" : "（会員外）"}</p><p className="c-muted mt-1">{person.response_status === "accepted" ? "承諾済み" : person.response_status === "declined" ? "見送り" : person.viewed_at ? "URL確認済み・返事待ち" : "未確認"}</p></div>)}</div>
          {item.status === "waiting" && <div className="mt-4 flex flex-wrap gap-2">{item.participants.map((person) => <button key={person.id} type="button" disabled={pending !== null} onClick={() => void rotate(person.id, person.name)} className="c-button-sub min-h-10 px-3 text-xs disabled:opacity-50">{person.name}さん用URLを再発行</button>)}<button type="button" disabled={pending !== null} onClick={() => void cancel(item)} className="c-button-sub min-h-10 px-3 text-xs disabled:opacity-50">紹介を取り消す</button></div>}
          {item.status === "connected" && <div className="c-dashed-top mt-4 pt-4"><p className="c-muted mb-2 text-xs">紹介後の結果</p><div className="flex flex-wrap gap-2">{(Object.keys(masterIntroductionOutcomeLabel) as MasterIntroductionOutcome[]).map((outcome) => <button key={outcome} type="button" disabled={pending !== null} aria-pressed={item.outcome === outcome} onClick={() => void setOutcome(item, outcome)} className="c-choice min-h-10 px-3 text-xs disabled:opacity-50">{masterIntroductionOutcomeLabel[outcome]}</button>)}</div></div>}
        </li>;
      })}</ul>}
    </Window>
  </div>;
}
