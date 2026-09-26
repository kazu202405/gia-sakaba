"use client";

// 集まりの日程調整（調整さん方式）。会員の集まりの画面と、ゲストの招待URLの画面の両方で使う。
// 日程の回答は申し込みではない：決まったあとも ○△× に関係なく、いつもの申し込みから申し込む。

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { uiConfirm, uiToast } from "@/lib/ui-dialog";
import {
  ANSWER_LABEL,
  ANSWER_MARK,
  SCHEDULE_COMMENT_LIMIT,
  SCHEDULE_OPTION_LIMIT,
  formatScheduleLong,
  formatScheduleShort,
  fromJstInputValue,
  toJstInputValue,
  type GatheringSchedule as Schedule,
  type ScheduleAnswer,
} from "@/lib/guild/gathering-schedule";
import { Window } from "./cards";

type Props =
  | { mode: "member"; questId: string; initial: Schedule; open: boolean }
  | { mode: "guest"; token: string; initial: Schedule; open: boolean; signedIn: boolean; isMember: boolean };

const ANSWERS: ScheduleAnswer[] = ["yes", "maybe", "no"];

export function GatheringSchedule(props: Props) {
  const [schedule, setSchedule] = useState(props.initial);
  const [answers, setAnswers] = useState<Record<string, ScheduleAnswer>>(props.initial.my_answers);
  const [comment, setComment] = useState(props.initial.my_comment ?? "");
  const [guestName, setGuestName] = useState(props.mode === "guest" ? props.initial.my_name ?? "" : "");
  const [editingOptions, setEditingOptions] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const isHost = props.mode === "member" && Boolean(schedule.is_host);
  const decided = schedule.options.find((option) => option.id === schedule.decided_option_id) ?? null;
  const canAnswer = props.open && !decided && schedule.options.length > 0 && (props.mode === "member" || props.signedIn);
  const answeredBefore = Object.keys(schedule.my_answers).length > 0 || Boolean(schedule.my_comment);

  async function reload() {
    const supabase = createClient();
    const { data, error: rpcError } = props.mode === "member"
      ? await supabase.rpc("sakaba_get_gathering_schedule", { p_quest_id: props.questId })
      : await supabase.rpc("sakaba_get_guest_gathering_schedule", { p_token: props.token });
    if (rpcError || !data) throw rpcError ?? new Error("schedule not found");
    const next = data as Schedule;
    setSchedule(next);
    setAnswers(next.my_answers);
    setComment(next.my_comment ?? "");
  }

  async function run(action: () => PromiseLike<{ error: unknown }>, done: string, failed: string) {
    if (busy) return false;
    setBusy(true); setError("");
    try {
      const { error: rpcError } = await action();
      if (rpcError) throw rpcError;
      await reload();
      uiToast(done);
      return true;
    } catch {
      setError(failed);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function saveAnswers(event: React.FormEvent) {
    event.preventDefault();
    if (props.mode === "guest" && !props.isMember && !guestName.trim()) {
      setError("お名前を入力してください。");
      return;
    }
    const supabase = createClient();
    await run(
      () => props.mode === "member"
        ? supabase.rpc("sakaba_answer_gathering_schedule", { p_quest_id: props.questId, p_answers: answers, p_comment: comment.trim() })
        : supabase.rpc("sakaba_answer_guest_gathering_schedule", { p_token: props.token, p_display_name: guestName.trim(), p_answers: answers, p_comment: comment.trim() }),
      "日程の回答を保存しました",
      "回答を保存できませんでした。画面を読み直して、もう一度お試しください。",
    );
  }

  async function saveOptions() {
    if (props.mode !== "member" || !editingOptions) return;
    const filled = editingOptions.filter((value) => value.trim());
    const iso = filled.map(fromJstInputValue);
    if (iso.some((value) => value === null)) { setError("日時の形が正しくない候補があります。"); return; }
    const removed = schedule.options.filter((option) => !iso.includes(toIsoKey(option.starts_at)));
    const removedWithAnswers = removed.filter((option) => option.yes + option.maybe + option.no > 0);
    if (removedWithAnswers.length > 0) {
      const confirmed = await uiConfirm({
        title: "候補日を消します",
        message: `${removedWithAnswers.map((option) => formatScheduleShort(option.starts_at)).join("、")} には回答があります。消すと、その日の回答も消えます。`,
        okLabel: "消して保存する",
        danger: true,
      });
      if (!confirmed) return;
    }
    const questId = props.questId;
    const ok = await run(
      () => createClient().rpc("sakaba_set_gathering_schedule", { p_quest_id: questId, p_starts: iso }),
      "候補日を保存しました",
      "候補日を保存できませんでした。画面を読み直して、もう一度お試しください。",
    );
    if (ok) setEditingOptions(null);
  }

  async function decide(optionId: string | null) {
    if (props.mode !== "member") return;
    const option = schedule.options.find((item) => item.id === optionId);
    const confirmed = await uiConfirm(optionId && option
      ? { title: "日にちを決めます", message: `${formatScheduleLong(option.starts_at)} に決めます。日程に答えた会員に、おしらせが届きます。`, okLabel: "この日に決める" }
      : { title: "決定を取り消します", message: "日程の回答を、また受け付ける状態に戻します。", okLabel: "取り消す", danger: true });
    if (!confirmed) return;
    const questId = props.questId;
    await run(
      () => createClient().rpc("sakaba_decide_gathering_schedule", { p_quest_id: questId, p_option_id: optionId }),
      optionId ? "日にちを決めました" : "決定を取り消しました",
      "日にちを更新できませんでした。画面を読み直して、もう一度お試しください。",
    );
  }

  // 候補日がまだ無く、主催者でもない人には何も出さない（ゲストの画面・参加者の画面が空の窓で埋まらないように）
  if (schedule.options.length === 0 && !isHost) return null;

  return <Window title="日程調整">
    {decided ? (
      <div className="c-card px-4 py-3">
        <p className="c-label text-xs">かいさい日が 決まりました</p>
        <p className="mt-1 text-lg tracking-wider">{formatScheduleLong(decided.starts_at)}</p>
        <p className="c-muted mt-2 text-xs leading-relaxed">
          {props.mode === "guest" ? "参加するときは、下の申し込みから申し込んでください。" : "参加するときは、この画面の申し込みから申し込んでください。"}
          日程の回答（○△×）に関係なく申し込めます。
        </p>
        {isHost && props.open && <button type="button" disabled={busy} onClick={() => void decide(null)} className="c-button-sub mt-3 h-9 px-3 text-xs disabled:opacity-50">決定を取り消す</button>}
      </div>
    ) : (
      <p className="c-muted text-sm leading-relaxed">
        {schedule.options.length === 0
          ? "候補日を出すと、参加したい人が候補日ごとに ○△× で答えられます。"
          : "都合のよい日を ○△× で教えてください。あとから何度でも直せます。答えても参加の申し込みにはならず、決まったあとに○△×に関係なく申し込めます。"}
      </p>
    )}

    {isHost && props.open && !decided && (
      editingOptions ? (
        <div className="c-dashed-top mt-5 pt-4">
          <p className="c-label text-xs">候補日（{SCHEDULE_OPTION_LIMIT}個まで・日本時間）</p>
          <ul className="mt-2 space-y-2">
            {editingOptions.map((value, index) => (
              <li key={index} className="flex items-center gap-2">
                <input
                  type="datetime-local"
                  value={value}
                  onChange={(event) => setEditingOptions((current) => current && current.map((item, i) => (i === index ? event.target.value : item)))}
                  aria-label={`候補日 ${index + 1}`}
                  className="c-input c-date h-11 min-w-0 flex-1"
                />
                <button type="button" onClick={() => setEditingOptions((current) => current && current.filter((_, i) => i !== index))} aria-label={`候補日 ${index + 1} を消す`} title="消す" className="c-button-danger h-11 w-11 shrink-0 text-sm">×</button>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap gap-2">
            {editingOptions.length < SCHEDULE_OPTION_LIMIT && <button type="button" onClick={() => setEditingOptions((current) => current && [...current, current.at(-1) ?? ""])} className="c-button-sub h-10 px-4 text-sm">＋ 候補日を足す</button>}
            <span className="grow" />
            <button type="button" onClick={() => { setEditingOptions(null); setError(""); }} className="c-button-sub h-10 px-4 text-sm">やめる</button>
            <button type="button" disabled={busy} onClick={() => void saveOptions()} className="rpg-button h-10 px-5 text-sm disabled:opacity-50">▶ 候補日を保存する</button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setEditingOptions(schedule.options.length > 0 ? schedule.options.map((option) => toJstInputValue(option.starts_at)) : [""])} className="c-button-sub mt-4 h-10 px-4 text-sm">
          {schedule.options.length > 0 ? "候補日をなおす" : "▶ 候補日を出す"}
        </button>
      )
    )}

    {schedule.options.length > 0 && <ScheduleTable schedule={schedule} guest={props.mode === "guest"} canDecide={isHost && props.open && !decided} busy={busy} onDecide={(id) => void decide(id)} />}

    {canAnswer && (
      <form onSubmit={saveAnswers} className="c-dashed-top mt-6 space-y-4 pt-5">
        <p className="c-label text-sm">{answeredBefore ? "あなたの回答（なおせます）" : "あなたの回答"}</p>
        {props.mode === "guest" && !props.isMember && (
          <label className="block">
            <span className="mb-1 block text-sm">お名前（主催者に表示されます）</span>
            <input value={guestName} onChange={(event) => { setGuestName(event.target.value); setError(""); }} maxLength={30} className="c-input h-11" />
          </label>
        )}
        <ul className="space-y-2">
          {schedule.options.map((option) => (
            <li key={option.id} className="c-card flex flex-wrap items-center justify-between gap-2 px-3 py-2">
              <span className="text-sm tabular-nums">{formatScheduleShort(option.starts_at)}</span>
              <span className="flex gap-1.5" role="group" aria-label={`${formatScheduleShort(option.starts_at)} の都合`}>
                {ANSWERS.map((answer) => (
                  <button
                    key={answer}
                    type="button"
                    aria-pressed={answers[option.id] === answer}
                    onClick={() => setAnswers((current) => {
                      // 同じものをもう一度押したら「未回答」に戻す
                      const next = { ...current };
                      if (next[option.id] === answer) delete next[option.id];
                      else next[option.id] = answer;
                      return next;
                    })}
                    title={ANSWER_LABEL[answer]}
                    className="c-choice h-10 w-11 text-lg"
                  >
                    {ANSWER_MARK[answer]}
                  </button>
                ))}
              </span>
            </li>
          ))}
        </ul>
        <label className="block">
          <span className="mb-1 block text-sm">ひとこと（任意）</span>
          <input value={comment} onChange={(event) => setComment(event.target.value)} maxLength={SCHEDULE_COMMENT_LIMIT} placeholder="例：19時半ごろ着きます" className="c-input h-11" />
        </label>
        <div className="flex justify-end">
          <button type="submit" disabled={busy} className="rpg-button h-11 px-5 text-sm disabled:opacity-50">{busy ? "保存中…" : "▶ 回答を保存する"}</button>
        </div>
      </form>
    )}

    {props.mode === "guest" && !props.signedIn && props.open && !decided && schedule.options.length > 0 && (
      <p className="c-dashed-top c-muted mt-6 pt-5 text-sm leading-relaxed">
        日程に答えるには、下の申し込み欄でメールアドレスの確認をしてください。確認だけで、申し込みはしなくても答えられます。
      </p>
    )}

    {error && <p role="alert" className="mt-4 text-sm text-[#c62828]">{error}</p>}
  </Window>;
}

/** 保存済みの日時を、入力欄から作る日時と同じ形にそろえる（比べるため） */
function toIsoKey(iso: string): string {
  return fromJstInputValue(toJstInputValue(iso)) ?? iso;
}

function ScheduleTable({ schedule, guest, canDecide, busy, onDecide }: {
  schedule: Schedule;
  guest: boolean;
  canDecide: boolean;
  busy: boolean;
  onDecide: (optionId: string) => void;
}) {
  // ゲストには名前の一覧を見せず、候補日ごとの人数だけ
  if (guest) {
    return <ul className="mt-5 space-y-2">
      {schedule.options.map((option) => (
        <li key={option.id} className={`c-card flex flex-wrap items-center justify-between gap-2 px-3 py-2 ${option.id === schedule.decided_option_id ? "border-[#c8a55a]" : ""}`}>
          <span className="text-sm tabular-nums">{formatScheduleShort(option.starts_at)}{option.id === schedule.decided_option_id && " ★"}</span>
          <span className="c-muted text-sm tabular-nums">○{option.yes}　△{option.maybe}　×{option.no}</span>
        </li>
      ))}
    </ul>;
  }

  return <div className="mt-5 overflow-x-auto">
    <table className="w-max min-w-full border-collapse text-sm">
      <thead>
        <tr>
          <th scope="col" className="c-muted px-2 py-2 text-left text-xs font-normal">名前</th>
          {schedule.options.map((option) => (
            <th key={option.id} scope="col" className="px-2 py-2 text-center text-xs font-normal whitespace-nowrap tabular-nums">
              {formatScheduleShort(option.starts_at)}{option.id === schedule.decided_option_id && <span className="c-label"> ★</span>}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-dashed divide-[#1b2a41]/15">
        {schedule.respondents.length === 0 && (
          <tr><td colSpan={schedule.options.length + 1} className="c-muted px-2 py-3 text-xs">まだ回答はありません。</td></tr>
        )}
        {schedule.respondents.map((person, index) => (
          <tr key={index}>
            <th scope="row" className="max-w-40 px-2 py-2 text-left font-normal">
              <span className="block truncate">{person.name}{person.is_me && <span className="c-label text-xs">（あなた）</span>}</span>
              {person.comment && <span className="c-muted block truncate text-xs" title={person.comment}>{person.comment}</span>}
            </th>
            {schedule.options.map((option) => (
              <td key={option.id} className="px-2 py-2 text-center text-base">{person.answers[option.id] ? ANSWER_MARK[person.answers[option.id]] : <span className="c-muted">－</span>}</td>
            ))}
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr className="c-dashed-top">
          <th scope="row" className="c-muted px-2 py-2 text-left text-xs font-normal">合計</th>
          {schedule.options.map((option) => (
            <td key={option.id} className="px-2 py-2 text-center text-xs whitespace-nowrap tabular-nums">○{option.yes} △{option.maybe} ×{option.no}</td>
          ))}
        </tr>
        {canDecide && (
          <tr>
            <td />
            {schedule.options.map((option) => (
              <td key={option.id} className="px-1 py-2 text-center">
                <button type="button" disabled={busy} onClick={() => onDecide(option.id)} className="c-button-sub h-9 px-2 text-[11px] whitespace-nowrap disabled:opacity-50">この日に決める</button>
              </td>
            ))}
          </tr>
        )}
      </tfoot>
    </table>
  </div>;
}
