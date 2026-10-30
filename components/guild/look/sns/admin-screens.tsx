"use client";

// 見本の管理者の画面（設計書4章・6-8）：名刺の仮登録の一覧・手で入れる・招待URL・重複の候補。
// 本人が承認するまで、名刺の情報は運営者以外には見せない（画面の言葉でも伝える）。

import { useRef, useState } from "react";
import { uiToast } from "@/lib/ui-dialog";
import {
  CARD_STATUSES,
  cardInviteUrl,
  cardStatusLabel,
  cardStatusRank,
  duplicatePairs,
  hasSameCard,
  makeCard,
  markInvited,
  mergeCards,
  mergeOrder,
  todayIso,
  validateCardInput,
  type BusinessCard,
  type CardInputErrors,
  type DuplicatePair,
} from "@/lib/guild/look/sns-mock";
import { CopyUrlButton, SEND_MS } from "./flow";
import { Modal } from "./parts";
import { SortTable, type SortColumn } from "./sort-table";
import { useSnState } from "./store";

// 見本の「保存」と「一覧の読み直し」にかける時間（本番では通信の待ち時間）
const RELOAD_MS = 700;

type Pending = { name: string; company: string };

export function AdminScreen() {
  const { cards, updateCards, distinctPairs, markDistinct } = useSnState();
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [errors, setErrors] = useState<CardInputErrors>({});
  const [failure, setFailure] = useState("");
  const [pending, setPending] = useState<Pending | null>(null);
  const [merging, setMerging] = useState<DuplicatePair | null>(null);
  const lock = useRef(false);

  const pairs = duplicatePairs(cards, distinctPairs);
  const count = (key: BusinessCard["status"]) => cards.filter((c) => c.status === key).length;

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (lock.current) return;
    const input = { name, company };
    const found = validateCardInput(input);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    // 錠は押した瞬間に。仮の行を先に出し、入力欄はすぐ空にする
    lock.current = true;
    const snapshot = cards;
    setFailure("");
    setPending({ name: name.trim(), company: company.trim() });
    setName("");
    setCompany("");
    window.setTimeout(() => {
      if (hasSameCard(snapshot, input)) {
        // 失敗：仮の行を消し、入力を元に戻し、理由を出す
        setPending(null);
        setName(input.name);
        setCompany(input.company);
        setFailure("同じ名前・同じ会社の名刺がすでにあります。上の一覧を確かめてください");
        lock.current = false;
        return;
      }
      uiToast("名刺を追加しました（非公開・未招待）");
      window.setTimeout(() => {
        // 一覧が読み直された瞬間：仮の行を本物の行に替え、錠を外す
        updateCards((prev) => [...prev, makeCard(prev, input, todayIso())]);
        setPending(null);
        lock.current = false;
      }, RELOAD_MS);
    }, SEND_MS);
  };

  const columns: SortColumn<BusinessCard>[] = [
    { key: "name", label: "名前", value: (c) => c.name, render: (c) => <b>{c.name}</b> },
    { key: "company", label: "会社", value: (c) => c.company, render: (c) => c.company },
    { key: "registeredOn", label: "登録日", value: (c) => c.registeredOn, render: (c) => c.registeredOn },
    {
      key: "status",
      label: "状態",
      value: (c) => cardStatusRank(c.status),
      render: (c) => (
        <>
          <span className={c.status === "approved" ? "sn-tag sn-tag--ok" : "sn-tag"}>{cardStatusLabel(c.status)}</span>
          {c.status !== "approved" && <span className="sn-sub"> 非公開</span>}
        </>
      ),
    },
    {
      key: "invite",
      label: "招待",
      render: (c) =>
        c.status === "approved" ? (
          <span className="sn-sub">承認ずみ</span>
        ) : (
          <CopyUrlButton
            url={cardInviteUrl(c.id)}
            label="招待URLをコピー"
            className="sn-btn sn-btn--small"
            onCopied={() => updateCards((prev) => markInvited(prev, c.id))}
          />
        ),
    },
  ];

  return (
    <div className="sn-page">
      <div className="sn-page-main">
        <div className="sn-sec"><div className="sn-sec-h"><h2>名刺の仮登録</h2><span>{cards.length + (pending ? 1 : 0)}件</span></div></div>
        <SortTable
          caption="名刺の仮登録の一覧"
          columns={columns}
          rows={cards}
          rowKey={(c) => c.id}
          pendingRows={pending && (
            <tr className="sn-pending-row" aria-busy="true">
              <td>{pending.name}</td>
              <td>{pending.company}</td>
              <td>追加中…</td>
              <td>追加中…</td>
              <td />
            </tr>
          )}
        />

        <form className="sn-fields sn-sec" onSubmit={add} noValidate>
          <div className="sn-sec-h"><h2>名刺を手で入れる</h2></div>
          <label className="sn-field">
            <span>名前</span>
            <input type="text" value={name} placeholder="例：木村 俊" onChange={(e) => setName(e.target.value)} aria-invalid={!!errors.name} />
            {errors.name && <p className="sn-error" role="alert">{errors.name}</p>}
          </label>
          <label className="sn-field">
            <span>会社名</span>
            <input type="text" value={company} placeholder="例：木村建装" onChange={(e) => setCompany(e.target.value)} aria-invalid={!!errors.company} />
            {errors.company && <p className="sn-error" role="alert">{errors.company}</p>}
          </label>
          {failure && <p className="sn-error" role="alert">{failure}</p>}
          <button type="submit" className="sn-btn sn-btn--main" disabled={pending !== null}>{pending ? "追加中…" : "追加する"}</button>
        </form>

        <section>
          <div className="sn-sec"><div className="sn-sec-h"><h2>重複の候補</h2><span>{pairs.length}件</span></div></div>
          {pairs.length === 0 ? (
            <p className="sn-empty">重複の候補はありません</p>
          ) : (
            <div className="sn-list">
              {pairs.map((pair) => (
                <div key={pair.key} className="sn-row">
                  <div className="sn-row-body">
                    <p>{pair.reasons.map((r) => <span key={r} className="sn-tag">{r}</span>)}</p>
                    {[pair.a, pair.b].map((c) => (
                      <p key={c.id} className="sn-meta"><b>{c.name}</b>・{c.company}・{c.registeredOn}登録・{cardStatusLabel(c.status)}</p>
                    ))}
                    <div className="sn-row-acts">
                      <button type="button" className="sn-btn" onClick={() => setMerging(pair)}>同じ人としてまとめる</button>
                      <button
                        type="button"
                        className="sn-btn"
                        onClick={() => {
                          markDistinct(pair.key);
                          uiToast("別の人として扱います。候補から外しました");
                        }}
                      >
                        別の人
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <aside className="sn-page-side">
        <div className="sn-sec">
          <div className="sn-sec-h"><h2>登録から公開までの流れ</h2></div>
          <ol className="sn-steps">
            <li><b>名刺を入れる</b>（未招待 {count("uninvited")}件）<br /><span className="sn-sub">非公開。あなた（運営者）だけに見えます</span></li>
            <li><b>招待URLをLINEで送る</b>（招待中 {count("invited")}件）<br /><span className="sn-sub">本人がアカウントを作ります</span></li>
            <li><b>本人が確認・修正して承認する</b>（承認 {count("approved")}件）<br /><span className="sn-sub">公開範囲も本人が決めます</span></li>
            <li><b>承認された情報だけが、探す・人脈に出る</b></li>
          </ol>
          <p className="sn-meta sn-note">本人が承認するまで、名刺の情報はほかの人には見えません。</p>
          <p className="sn-sub">
            {CARD_STATUSES.map((s) => `${s.label} ${count(s.key)}`).join("・")}
          </p>
        </div>
      </aside>

      {merging && <MergeDialog pair={merging} onClose={() => setMerging(null)} onMerge={(keepId, dropId) => {
        updateCards((prev) => mergeCards(prev, keepId, dropId));
        setMerging(null);
        uiToast("同じ人としてまとめました");
      }} />}
    </div>
  );
}

/** 「同じ人としてまとめる」の確かめ。元には戻せないので、赤いボタンに「まとめる」と書く */
function MergeDialog({ pair, onClose, onMerge }: { pair: DuplicatePair; onClose: () => void; onMerge: (keepId: string, dropId: string) => void }) {
  const { keep, drop } = mergeOrder(pair.a, pair.b);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const run = () => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    window.setTimeout(() => onMerge(keep.id, drop.id), SEND_MS);
  };
  return (
    <Modal title="この2件を同じ人としてまとめますか？" onClose={onClose} busy={busy}>
      <dl className="sn-review">
        <dt>残す名刺</dt>
        <dd>{keep.name}・{keep.company}（{keep.registeredOn}登録）</dd>
        <dt>なくなる名刺</dt>
        <dd>{drop.name}・{drop.company}（{drop.registeredOn}登録）</dd>
      </dl>
      <p className="sn-meta sn-modal-lead">
        先に登録した方を残し、状態は進んでいる方に合わせます。まとめたあとは、元の2件に戻せません。
      </p>
      <div className="sn-modal-acts">
        <button type="button" className="sn-btn" disabled={busy} onClick={onClose}>やめる</button>
        <button type="button" className="sn-btn sn-btn--danger" disabled={busy} onClick={run}>{busy ? "まとめています…" : "まとめる"}</button>
      </div>
    </Modal>
  );
}
