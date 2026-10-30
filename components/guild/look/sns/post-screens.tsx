"use client";

// 見本の案件の画面（設計書6-6）：一覧（カテゴリーで絞る）・1件（知ってる人いるよ／自分がやれる）・投稿。

import { useRef, useState } from "react";
import { uiToast } from "@/lib/ui-dialog";
import {
  ANSWER_LABEL,
  EMPTY_POST_DRAFT,
  INDUSTRIES,
  ME_ID,
  POST_CATEGORIES,
  POST_DETAIL_MAX,
  POST_TITLE_MAX,
  POST_VISIBILITIES,
  REGION_NAMES,
  answerCount,
  answersFor,
  categoryLabel,
  filterWantPosts,
  findPerson,
  findWantPost,
  makeWantPost,
  shortName,
  validatePostDraft,
  visibilityLabel,
  wantPosts,
  type AnswerKind,
  type PostCategory,
  type PostDraft,
  type PostDraftErrors,
  type WantPost,
} from "@/lib/guild/look/sns-mock";
import { ComposeFlow, SEND_MS } from "./flow";
import { Avatar, Modal } from "./parts";
import { SnLink, useSn, useSnState } from "./store";
import { DateInput } from "@/components/guild/form-parts";

function toggle<T>(list: readonly T[], v: T): T[] {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

function postMeta(post: WantPost): string {
  return `${post.industry}／${post.areas.join("・")}`;
}

// ---------- 一覧 ----------

export function PostsScreen() {
  const { myPosts, myAnswers } = useSnState();
  const [category, setCategory] = useState<PostCategory | null>(null);
  const all = wantPosts(myPosts);
  const posts = filterWantPosts(all, category);

  return (
    <div className="sn-page sn-page--filters">
      <aside className="sn-page-side">
        <div className="sn-band sn-sec">
          <div className="sn-sec-h"><h2>探しています</h2><span>{posts.length}件</span></div>
          <SnLink to="/posts/new" className="sn-btn sn-btn--main sn-btn--wide">案件を投稿する</SnLink>
          <div className="sn-chips" role="group" aria-label="カテゴリー">
            <button type="button" className="sn-chip" aria-pressed={category === null} onClick={() => setCategory(null)}>すべて {all.length}</button>
            {POST_CATEGORIES.map((c) => (
              <button key={c.key} type="button" className="sn-chip" aria-pressed={category === c.key} onClick={() => setCategory(c.key)}>
                {c.label} {filterWantPosts(all, c.key).length}
              </button>
            ))}
          </div>
        </div>
      </aside>
      <div className="sn-page-main">
        {posts.length === 0 ? (
          <p className="sn-empty">このカテゴリーの案件は、まだありません。<br />「すべて」に戻すか、投稿してみてください</p>
        ) : (
          <div className="sn-list">
            {posts.map((post) => {
              const author = findPerson(post.authorId);
              if (!author) return null;
              return (
                <SnLink key={post.id} to={`/posts/${post.id}`} className="sn-row">
                  <Avatar person={author} />
                  <div className="sn-row-body">
                    <p className="sn-row-title">{post.text}</p>
                    <p className="sn-meta"><span className="sn-tag">{categoryLabel(post.category)}</span> {postMeta(post)}</p>
                    <p className="sn-meta">
                      {post.authorId === ME_ID ? "あなた" : `${author.name}さん`}・{post.ago}
                      知ってる人 {answerCount(post.id, "know", myAnswers)}・やれる {answerCount(post.id, "can", myAnswers)}
                    </p>
                  </div>
                </SnLink>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- 1件 ----------

export function PostScreen({ id }: { id: string }) {
  const { myPosts, myAnswers, addAnswer } = useSnState();
  const [answering, setAnswering] = useState<AnswerKind | null>(null);
  const post = findWantPost(id, myPosts);
  if (!post) return <p className="sn-empty">この案件は見つかりませんでした</p>;
  const author = findPerson(post.authorId);
  if (!author) return <p className="sn-empty">この案件は見つかりませんでした</p>;
  const isMine = post.authorId === ME_ID;
  const answers = answersFor(post.id, myAnswers);
  const answered = (kind: AnswerKind) => myAnswers.some((a) => a.postId === post.id && a.kind === kind);

  return (
    <div className="sn-page sn-page--detail">
      <aside className="sn-page-side">
        <div className="sn-hero">
          <SnLink to={`/people/${author.id}`} aria-label={`${author.name}さんのページ`}><Avatar person={author} /></SnLink>
          <p className="sn-meta">{isMine ? "あなたの投稿" : `${author.name}さん`}・{post.ago}</p>
          <h1>{post.text}</h1>
          <p className="sn-meta"><span className="sn-tag">{categoryLabel(post.category)}</span></p>
        </div>
      </aside>
      <div className="sn-page-main">
        <dl className="sn-dl">
          <div><dt>対象</dt><dd>{postMeta(post)}</dd></div>
          <div><dt>募集期限</dt><dd>{post.deadline ?? "決めていません"}</dd></div>
          <div><dt>問い合わせ先</dt><dd>{post.contact}</dd></div>
          <div><dt>公開範囲</dt><dd>{visibilityLabel(post.visibility)}</dd></div>
        </dl>
        <div className="sn-story">
          <div><p className="sn-k">内容</p><p className="sn-v">{post.detail}</p></div>
        </div>
        <section>
          <div className="sn-sec"><div className="sn-sec-h"><h2>みんなの答え</h2><span>{answers.length}件</span></div></div>
          {answers.length === 0 ? (
            <p className="sn-empty">まだ答えはありません</p>
          ) : (
            <div className="sn-list">
              {answers.map((a, i) => {
                const p = findPerson(a.personId);
                if (!p) return null;
                return (
                  <div key={`${a.personId}-${a.kind}-${i}`} className="sn-row">
                    <Avatar person={p} />
                    <div className="sn-row-body">
                      <p className="sn-meta"><b>{a.personId === ME_ID ? "あなた" : `${p.name}さん`}</b>　<span className="sn-tag">{ANSWER_LABEL[a.kind]}</span></p>
                      <p>{a.note}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
      <div className="sn-sticky">
        {isMine ? (
          <p className="sn-meta">あなたの投稿です。答えが届くと、ここに並びます</p>
        ) : (
          <div className="sn-modal-acts">
            <button type="button" className="sn-btn sn-btn--main" disabled={answered("know")} onClick={() => setAnswering("know")}>
              {answered("know") ? "答えました" : ANSWER_LABEL.know}
            </button>
            <button type="button" className="sn-btn sn-btn--main" disabled={answered("can")} onClick={() => setAnswering("can")}>
              {answered("can") ? "答えました" : ANSWER_LABEL.can}
            </button>
          </div>
        )}
      </div>
      {answering && (
        <ComposeFlow
          title={answering === "know" ? `${shortName(author)}さんに「知ってる人いるよ」と答える` : `${shortName(author)}さんに「自分がやれる」と答える`}
          lead={answering === "know" ? "誰のことか、どんな人かをひとこと書いてください。" : "どんなことができるかを、ひとこと書いてください。"}
          placeholder={answering === "know" ? "例：横浜で外壁に強い会社の社長を知っています" : "例：外壁の改修なら、協力会社と請けられます"}
          required
          emptyMessage="ひとこと書いてください。受け取る人が判断しやすくなります"
          reviewRows={(note) => [
            { label: "届く人", value: `${author.name}さん` },
            { label: "案件", value: post.text },
            { label: "答え", value: ANSWER_LABEL[answering] },
            { label: "ひとこと", value: note },
          ]}
          onClose={() => setAnswering(null)}
          onSent={(note) => {
            // 答えの一覧に自分の行が出るのと、トーストを同じ瞬間に
            addAnswer({ postId: post.id, kind: answering, personId: ME_ID, note });
            setAnswering(null);
            uiToast(`${shortName(author)}さんに答えました`);
          }}
        />
      )}
    </div>
  );
}

// ---------- 投稿 ----------

export function NewPostScreen() {
  const { myPosts, addPost } = useSnState();
  const { go } = useSn();
  const [draft, setDraft] = useState<PostDraft>(EMPTY_POST_DRAFT);
  const [errors, setErrors] = useState<PostDraftErrors>({});
  const [reviewing, setReviewing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const lock = useRef(false);
  const set = (patch: Partial<PostDraft>) => setDraft((d) => ({ ...d, ...patch }));

  const toReview = (e: React.FormEvent) => {
    e.preventDefault();
    const found = validatePostDraft(draft);
    setErrors(found);
    if (Object.keys(found).length === 0) setReviewing(true);
  };

  const send = () => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    window.setTimeout(() => {
      const post = makeWantPost(draft, `my-${myPosts.length + 1}`);
      // 一覧に出る投稿とトーストを同じ瞬間に。錠は外さない（画面が変わるまで押せない）
      addPost(post);
      setReviewing(false);
      setBusy(false);
      setDone(true);
      uiToast("案件を投稿しました");
      go(`/posts/${post.id}`);
    }, SEND_MS);
  };

  const err = (key: keyof PostDraftErrors) => errors[key] && <p className="sn-error" role="alert">{errors[key]}</p>;

  return (
    <div className="sn-form">
      <form onSubmit={toReview} noValidate>
        <div className="sn-sec"><div className="sn-sec-h"><h2>案件を投稿する</h2></div></div>
        <div className="sn-fields">
          <label className="sn-field">
            <span>タイトル</span>
            <input type="text" value={draft.title} maxLength={POST_TITLE_MAX} placeholder="例：関東で外壁塗装をたのめる会社を探しています" onChange={(e) => set({ title: e.target.value })} aria-invalid={!!errors.title} />
            {err("title")}
          </label>

          <fieldset className="sn-field">
            <legend>カテゴリー</legend>
            <div className="sn-chips">
              {POST_CATEGORIES.map((c) => (
                <button key={c.key} type="button" className="sn-chip" aria-pressed={draft.category === c.key} onClick={() => set({ category: c.key })}>{c.label}</button>
              ))}
            </div>
            {err("category")}
          </fieldset>

          <fieldset className="sn-field">
            <legend>対象の業種</legend>
            <div className="sn-chips">
              {INDUSTRIES.map((i) => (
                <button key={i} type="button" className="sn-chip" aria-pressed={draft.industry === i} onClick={() => set({ industry: i })}>{i}</button>
              ))}
            </div>
            {err("industry")}
          </fieldset>

          <fieldset className="sn-field">
            <legend>対象の地域（いくつでも）</legend>
            <div className="sn-chips">
              {REGION_NAMES.map((r) => (
                <button key={r} type="button" className="sn-chip" aria-pressed={draft.regions.includes(r)} onClick={() => set({ regions: toggle(draft.regions, r) })}>{r}</button>
              ))}
            </div>
            {err("regions")}
          </fieldset>

          <label className="sn-field">
            <span>内容</span>
            <textarea value={draft.detail} maxLength={POST_DETAIL_MAX} rows={6} placeholder="例：木造2階建て・12戸です。足場はこちらで手配します。" onChange={(e) => set({ detail: e.target.value })} aria-invalid={!!errors.detail} />
            {err("detail")}
          </label>

          <label className="sn-field">
            <span>募集期限（なくても大丈夫です）</span>
            {/* 日付の欄は酒場の共通部品（iOS Safari で枠からはみ出さないように） */}
            <DateInput value={draft.deadline} onChange={(v) => set({ deadline: v })} label="募集期限" />
            {err("deadline")}
          </label>

          <label className="sn-field">
            <span>問い合わせ先</span>
            <input type="text" value={draft.contact} placeholder="例：中村まで 045-000-0000" onChange={(e) => set({ contact: e.target.value })} aria-invalid={!!errors.contact} />
            {err("contact")}
          </label>

          <fieldset className="sn-field">
            <legend>公開範囲</legend>
            <div className="sn-chips">
              {POST_VISIBILITIES.map((v) => (
                <button key={v.key} type="button" className="sn-chip" aria-pressed={draft.visibility === v.key} onClick={() => set({ visibility: v.key })}>{v.label}</button>
              ))}
            </div>
          </fieldset>
        </div>
        <div className="sn-sticky">
          <button type="submit" className="sn-btn sn-btn--main sn-btn--wide" disabled={done}>{done ? "投稿しました" : "内容を確かめる"}</button>
        </div>
      </form>
      {reviewing && (
        <Modal title="この内容で投稿しますか？" onClose={() => !busy && setReviewing(false)} busy={busy}>
          <dl className="sn-review">
            <dt>タイトル</dt><dd>{draft.title.trim()}</dd>
            <dt>カテゴリー</dt><dd>{draft.category === "" ? "" : categoryLabel(draft.category)}</dd>
            <dt>対象</dt><dd>{draft.industry}／{draft.regions.join("・")}</dd>
            <dt>内容</dt><dd>{draft.detail.trim()}</dd>
            <dt>募集期限</dt><dd>{draft.deadline === "" ? "決めていません" : draft.deadline}</dd>
            <dt>問い合わせ先</dt><dd>{draft.contact.trim()}</dd>
            <dt>見える人</dt><dd>{visibilityLabel(draft.visibility)}</dd>
          </dl>
          <div className="sn-modal-acts">
            <button type="button" className="sn-btn" disabled={busy} onClick={() => setReviewing(false)}>もどって なおす</button>
            <button type="button" className="sn-btn sn-btn--main" disabled={busy} onClick={send}>{busy ? "投稿しています…" : "投稿する"}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
