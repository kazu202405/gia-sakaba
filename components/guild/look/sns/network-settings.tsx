"use client";

// 見本の「人脈の公開範囲」（/me/network）：人脈全体の初期設定（3段階）と、知り合いごとの個別の設定。
// 自分の設定は「自分の知り合い同士」が見る道を決めるもの。見本では自分以外になれないので、各行の下に効き目を書く。
// 判定は sns-network.ts の levelOf（ここでは設定を集めて保存するだけ）。

import { useRef, useState } from "react";
import { uiToast } from "@/lib/ui-dialog";
import { ME_ID, companyOf, defaultLevelOf, directPeople, maskedLabel, type Person } from "@/lib/guild/look/sns-mock";
import {
  NET_CHOICES,
  NET_LEVEL_LABEL,
  choiceOf,
  levelFromChoice,
  netEffectText,
  type NetChoice,
  type NetLevel,
} from "@/lib/guild/look/sns-network";
import { SEND_MS } from "./flow";
import { Avatar } from "./parts";
import { SnLink, useSn, useSnState } from "./store";

/** 知り合いごとの選び方。「default」＝初期設定にあわせる（個別の設定なし） */
type RowChoice = "default" | NetLevel;
const ROW_LEVELS: readonly NetLevel[] = ["open", "intro", "hidden", "masked"];

export function NetworkSettingsScreen() {
  const { net, me, myCompany, saveNetSettings } = useSnState();
  const { go } = useSn();
  const initial = defaultLevelOf(net, ME_ID);
  const [choice, setChoice] = useState<NetChoice>(choiceOf(initial));
  const [showMasked, setShowMasked] = useState(initial === "masked");
  const [rows, setRows] = useState<Readonly<Record<string, RowChoice>>>(() => ({ ...(net.settings.overrides[ME_ID] ?? {}) }));
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);

  const level = levelFromChoice(choice, showMasked);
  const friends = directPeople(ME_ID, net);
  // 伏せたときの札は、自分の編集後の役職・会社の業種で決める
  const myMask = maskedLabel(me, myCompany);

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    window.setTimeout(() => {
      const overrides: Record<string, NetLevel> = {};
      for (const [friendId, value] of Object.entries(rows)) if (value !== "default") overrides[friendId] = value;
      // 見る画面に反映される保存とトーストを同じ瞬間に。錠は外さない（画面が変わるまで押せない）
      saveNetSettings(ME_ID, level, overrides);
      uiToast("人脈の公開範囲を保存しました");
      go("/me");
    }, SEND_MS);
  };

  return (
    <div className="sn-form">
      <form onSubmit={save}>
        <div className="sn-sec"><div className="sn-sec-h"><h2>人脈の公開範囲</h2></div></div>
        <div className="sn-fields">
          <p className="sn-meta">あなたの知り合いが、あなたの人脈の人に、どこまで近づけるかを決めます。人脈はあなたの資産です。</p>
          <fieldset className="sn-field">
            <legend>人脈全体の初期設定</legend>
            {NET_CHOICES.map((c) => (
              <div key={c.key}>
                <label className="sn-check">
                  <input type="radio" name="sn-net-default" checked={choice === c.key} onChange={() => setChoice(c.key)} />
                  <span>{c.label}</span>
                </label>
                <p className="sn-field-note sn-net-note">{c.note}</p>
              </div>
            ))}
            {choice === "hidden" && (
              <label className="sn-check">
                <input type="checkbox" checked={showMasked} onChange={(e) => setShowMasked(e.target.checked)} />
                <span>名前を伏せて、業種・役職だけ見せる</span>
              </label>
            )}
          </fieldset>

          <div className="sn-field">
            <span>知り合いごとの設定</span>
            <p className="sn-field-note">初期設定と違う扱いにしたい人だけ選んでください。</p>
            {friends.length === 0 ? (
              <p className="sn-meta">まだ知り合いがいません</p>
            ) : (
              <div className="sn-net-list">
                {friends.map((p) => (
                  <FriendRow
                    key={p.id}
                    person={p}
                    value={rows[p.id] ?? "default"}
                    defaultLevel={level}
                    maskLabel={myMask}
                    onChange={(v) => setRows((prev) => ({ ...prev, [p.id]: v }))}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="sn-sticky">
          <div className="sn-modal-acts">
            <SnLink to="/me" className="sn-btn" aria-disabled={busy}>やめる</SnLink>
            <button type="submit" className="sn-btn sn-btn--main" disabled={busy}>{busy ? "保存しています…" : "保存する"}</button>
          </div>
        </div>
      </form>
    </div>
  );
}

/** 知り合い1人の行：顔・名前・会社、選択、知り合いからの見え方。個別に変えた行には「個別」の印 */
function FriendRow({ person, value, defaultLevel, maskLabel, onChange }: {
  person: Person;
  value: RowChoice;
  defaultLevel: NetLevel;
  maskLabel: string;
  onChange: (v: RowChoice) => void;
}) {
  const company = companyOf(person);
  const effective = value === "default" ? defaultLevel : value;
  const selectId = `sn-net-${person.id}`;
  return (
    <div className="sn-net-row">
      <Avatar person={person} />
      <div className="sn-net-body">
        <p className="sn-net-name">
          <b>{person.name}</b>
          {value !== "default" && <span className="sn-tag">個別</span>}
        </p>
        <p className="sn-meta">{company ? `${company.name}・${person.title}` : person.title}</p>
        <label className="sr-only" htmlFor={selectId}>{person.name}さんの設定</label>
        <select id={selectId} value={value} onChange={(e) => onChange(e.target.value as RowChoice)}>
          <option value="default">初期設定にあわせる（今は{NET_LEVEL_LABEL[defaultLevel]}）</option>
          {ROW_LEVELS.map((l) => <option key={l} value={l}>{NET_LEVEL_LABEL[l]}</option>)}
        </select>
        <p className="sn-field-note">知り合いからは：{netEffectText(effective, maskLabel)}</p>
      </div>
    </div>
  );
}
