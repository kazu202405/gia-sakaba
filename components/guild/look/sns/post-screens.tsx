"use client";

// 見本の案件の画面（設計書6-6）：一覧（カテゴリーで絞る）・1件（うちで受けたい／知り合いを紹介する）・依頼する（何を探していますか？）。
// 10-31：「相談」より「依頼」「案件」の言葉。一覧の見出しは「探しています」。

import { useRef, useState } from "react";
import { Clock, MapPin, Package, Plus, Send } from "lucide-react";
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
  answersFor,
  categoryLabel,
  companyOf,
  dueInfo,
  filterWantPosts,
  findPerson,
  findWantPost,
  makeWantPost,
  postRegions,
  regionOf,
  relationTo,
  shortName,
  sortByCloseness,
  suggestIntroducee,
  validatePostDraft,
  visibilityLabel,
  wantPosts,
  type AnswerKind,
  type PostCategory,
  type PostDraft,
  type PostDraftErrors,
} from "@/lib/guild/look/sns-mock";
import { ComposeFlow, SEND_MS } from "./flow";
import { Avatar, IndustryPill, MeetPicture, Modal, PlainPill, RouteLine, WantRow } from "./parts";
import { SnLink, useSn, useSnState } from "./store";
import { DateInput } from "@/components/guild/form-parts";

function toggle<T>(list: readonly T[], v: T): T[] {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

// ---------- 一覧 ----------

export function PostsScreen() {
  const { myPosts } = useSnState();
  const [category, setCategory] = useState<PostCategory | null>(null);
  const all = wantPosts(myPosts);
  const posts = sortByCloseness(filterWantPosts(all, category));

  return (
    <div className="sn-page sn-page--filters">
      <aside className="sn-page-side">
        <div className="sn-band sn-sec">
          <div className="sn-sec-h"><h2>探しています</h2><span>{posts.length}件・近い順</span></div>
          <SnLink to="/posts/new" className="sn-btn sn-btn--main sn-btn--wide"><Plus aria-hidden />依頼する</SnLink>
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
          <p className="sn-empty">このカテゴリーの案件は、まだありません。<br />「すべて」に戻すか、依頼してみてください</p>
        ) : (
          <div>
            {posts.map((post) => (
              <WantRow key={post.id} post={post} />
            ))}
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
  const company = companyOf(author);
  const answers = answersFor(post.id, myAnswers);
  const answered = (kind: AnswerKind) => myAnswers.some((a) => a.postId === post.id && a.kind === kind);
  const due = dueInfo(post.deadline);
  const introducee = suggestIntroducee(post);
  const knowLabel = introducee ? `${shortName(introducee)}さんを紹介する` : ANSWER_LABEL.know;

  return (
    <div className="sn-page sn-page--detail">
      <aside className="sn-page-side">
        <div className="sn-hero">
          <div className="sn-who">
            <SnLink to={`/people/${author.id}`} aria-label={`${author.name}さんのページ`}>
              <Avatar person={author} size="lg" />
              <span>
                <b>{isMine ? "あなた" : author.name}</b>
                {company ? `${company.name}・${author.prefecture}` : author.prefecture}　{post.ago}
              </span>
            </SnLink>
          </div>
          <h1 className="sn-want-title">{post.text}</h1>
          <div className="sn-pills">
            <IndustryPill industry={post.industry} />
            <PlainPill icon={<MapPin aria-hidden />}>{postRegions(post).join("・")}</PlainPill>
            <PlainPill>{categoryLabel(post.category)}</PlainPill>
          </div>
        </div>
        {isMine ? (
          <p className="sn-meta sn-note">あなたの依頼です。返事が届くと、ここに並びます</p>
        ) : (
          <>
            <div className="sn-sec">
              <div className="sn-sec-h"><h2>{shortName(author)}さんに届く道</h2></div>
            </div>
            <RouteLine person={author} relation={relationTo(author.id)} />
          </>
        )}
      </aside>
      <div className="sn-page-main">
        <div className="sn-facts">
          <div><MapPin aria-hidden /><span>依頼した人</span><b>{regionOf(author.prefecture) ?? author.prefecture}</b></div>
          <div><Package aria-hidden /><span>探している場所</span><b>{postRegions(post).join("・")}</b></div>
          <div className={due?.soon ? "sn-facts-soon" : undefined}><Clock aria-hidden /><span>返事の期限</span><b>{due ? due.label : "決めていません"}</b></div>
        </div>
        <div className="sn-story sn-story--plain">
          <div><p className="sn-k">内容</p><p className="sn-v">{post.detail}</p></div>
        </div>
        <dl className="sn-dl">
          <div><dt>問い合わせ先</dt><dd>{post.contact}</dd></div>
          <div><dt>公開範囲</dt><dd>{visibilityLabel(post.visibility)}</dd></div>
        </dl>
        <section>
          <div className="sn-sec"><div className="sn-sec-h"><h2>みんなの返事</h2><span>{answers.length}件</span></div></div>
          {answers.length === 0 ? (
            <p className="sn-empty">まだ返事はありません</p>
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
          <p className="sn-meta">あなたの依頼です。返事が届くと、ここに並びます</p>
        ) : (
          <div className="sn-sticky-pair">
            <button type="button" className="sn-btn" disabled={answered("can")} onClick={() => setAnswering("can")}>
              {answered("can") ? "返事しました" : ANSWER_LABEL.can}
            </button>
            <button type="button" className="sn-btn sn-btn--main" disabled={answered("know")} onClick={() => setAnswering("know")}>
              <Send aria-hidden />{answered("know") ? "返事しました" : knowLabel}
            </button>
          </div>
        )}
      </div>
      {answering && (
        <ComposeFlow
          title={answering === "know" ? `${shortName(author)}さんに「${ANSWER_LABEL.know}」と返事する` : `${shortName(author)}さんに「${ANSWER_LABEL.can}」と返事する`}
          lead={answering === "know" ? "誰のことか、どんな人かをひとこと書いてください。" : "どんなことができるかを、ひとこと書いてください。"}
          placeholder={answering === "know" ? "例：横浜で外壁に強い会社の社長を知っています" : "例：外壁の改修なら、協力会社と請けられます"}
          required
          emptyMessage="ひとこと書いてください。受け取る人が判断しやすくなります"
          picture={answering === "know" && introducee ? <MeetPicture people={[introducee, null, author]} /> : undefined}
          reviewRows={(note) => [
            { label: "届く人", value: `${author.name}さん` },
            { label: "案件", value: post.text },
            { label: "返事", value: ANSWER_LABEL[answering] },
            ...(answering === "know" && introducee ? [{ label: "紹介する人", value: `${introducee.name}さん` }] : []),
            { label: "ひとこと", value: note },
          ]}
          onClose={() => setAnswering(null)}
          onSent={(note) => {
            // 返事の一覧に自分の行が出るのと、トーストを同じ瞬間に
            addAnswer({ postId: post.id, kind: answering, personId: ME_ID, note });
            setAnswering(null);
            uiToast(`${shortName(author)}さんに返事しました`);
          }}
        />
      )}
    </div>
  );
}

// ---------- 依頼する ----------

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
      // 一覧に出る依頼とトーストを同じ瞬間に。錠は外さない（画面が変わるまで押せない）
      addPost(post);
      setReviewing(false);
      setBusy(false);
      setDone(true);
      uiToast("依頼を出しました");
      go(`/posts/${post.id}`);
    }, SEND_MS);
  };

  const err = (key: keyof PostDraftErrors) => errors[key] && <p className="sn-error" role="alert">{errors[key]}</p>;

  return (
    <div className="sn-form">
      <form onSubmit={toReview} noValidate>
        <div className="sn-sec"><div className="sn-sec-h"><h2>何を探していますか？</h2></div></div>
        <div className="sn-fields">
          <label className="sn-field">
            <span>ひとことで（タイトル）</span>
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
            <legend>探している業種</legend>
            <div className="sn-chips">
              {INDUSTRIES.map((i) => (
                <button key={i} type="button" className="sn-chip" aria-pressed={draft.industry === i} onClick={() => set({ industry: i })}>{i}</button>
              ))}
            </div>
            {err("industry")}
          </fieldset>

          <fieldset className="sn-field">
            <legend>探している地域（いくつでも）</legend>
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
            <span>返事の期限（なくても大丈夫です）</span>
            {/* 日付の欄は酒場の共通部品（iOS Safari で枠からはみ出さないように） */}
            <DateInput value={draft.deadline} onChange={(v) => set({ deadline: v })} label="返事の期限" />
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
          <button type="submit" className="sn-btn sn-btn--main sn-btn--wide" disabled={done}>{done ? "依頼を出しました" : "内容を確かめる"}</button>
        </div>
      </form>
      {reviewing && (
        <Modal title="この内容で依頼を出しますか？" onClose={() => !busy && setReviewing(false)} busy={busy}>
          <dl className="sn-review">
            <dt>タイトル</dt><dd>{draft.title.trim()}</dd>
            <dt>カテゴリー</dt><dd>{draft.category === "" ? "" : categoryLabel(draft.category)}</dd>
            <dt>探している人</dt><dd>{draft.industry}／{draft.regions.join("・")}</dd>
            <dt>内容</dt><dd>{draft.detail.trim()}</dd>
            <dt>返事の期限</dt><dd>{draft.deadline === "" ? "決めていません" : draft.deadline}</dd>
            <dt>問い合わせ先</dt><dd>{draft.contact.trim()}</dd>
            <dt>見える人</dt><dd>{visibilityLabel(draft.visibility)}</dd>
          </dl>
          <div className="sn-modal-acts">
            <button type="button" className="sn-btn" disabled={busy} onClick={() => setReviewing(false)}>もどって なおす</button>
            <button type="button" className="sn-btn sn-btn--main" disabled={busy} onClick={send}>{busy ? "出しています…" : "依頼を出す"}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
