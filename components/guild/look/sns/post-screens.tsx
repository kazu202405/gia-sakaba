"use client";

// 見本の案件の画面（設計書6-6）：一覧（カテゴリーで絞る）・1件（うちで受けたい／知り合いを紹介する）・依頼する（何を探していますか？）。
// 10-31：「相談」より「依頼」「案件」の言葉。一覧の見出しは「探しています」。

import { useRef, useState } from "react";
import { ChevronRight, Clock, MapPin, Package, Plus, Send, SlidersHorizontal } from "lucide-react";
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
  POST_VISIBILITY_HINT,
  answersFor,
  areaText,
  categoryLabel,
  companyOf,
  dueInfo,
  filterWantPosts,
  findPerson,
  findWantPost,
  makeWantPost,
  regionOf,
  shortName,
  sortByCloseness,
  suggestIntroducee,
  todayIso,
  validatePostDraft,
  visibilityLabel,
  wantPosts,
  type AnswerKind,
  type PostCategory,
  type PostDraft,
  type PostDraftErrors,
} from "@/lib/guild/look/sns-mock";
import { DeadlineChoice, PostAreaDialog, PostChoiceDialog, PostSelectRow } from "./post-picker";
import { ComposeFlow, SEND_MS } from "./flow";
import { Avatar, IndustryPill, MeetPicture, Modal, PlainPill, RouteLine, WantRow } from "./parts";
import { SnLink, useRelation, useSn, useSnState } from "./store";

// ---------- 一覧 ----------

export function PostsScreen() {
  const { myPosts, net } = useSnState();
  const [category, setCategory] = useState<PostCategory | null>(null);
  const [filtering, setFiltering] = useState(false);
  const all = wantPosts(myPosts);
  const posts = sortByCloseness(filterWantPosts(all, category), ME_ID, net);

  return (
    <div className="sn-page sn-page--filters">
      <aside className="sn-page-side">
        <div className="sn-band sn-sec">
          <div className="sn-sec-h"><h2>探しています</h2></div>
          <SnLink to="/posts/new" className="sn-btn sn-btn--main sn-btn--wide"><Plus aria-hidden />依頼する</SnLink>
          <button type="button" className="sn-post-select-row sn-post-list-filter" aria-haspopup="dialog" onClick={() => setFiltering(true)}>
            <span className="sn-post-select-label"><SlidersHorizontal aria-hidden />絞り込み</span>
            <span className="sn-post-select-value" data-picked={category !== null}>
              {category === null ? "すべて" : categoryLabel(category)}・{posts.length}件・近い順
            </span>
            <ChevronRight aria-hidden />
          </button>
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
      {filtering && (
        <PostChoiceDialog
          title="案件の絞り込み"
          choices={[
            { key: "all" as const, label: "すべて", count: all.length },
            ...POST_CATEGORIES.map((choice) => ({ ...choice, count: filterWantPosts(all, choice.key).length })),
          ]}
          initial={category ?? "all"}
          applyLabel="絞り込む"
          onApply={(choice) => setCategory(choice === "all" ? null : choice)}
          onClose={() => setFiltering(false)}
        />
      )}
    </div>
  );
}

// ---------- 1件 ----------

export function PostScreen({ id }: { id: string }) {
  const { myPosts, myAnswers, addAnswer, net } = useSnState();
  const [answering, setAnswering] = useState<AnswerKind | null>(null);
  const post = findWantPost(id, myPosts);
  const authorRelation = useRelation(post?.authorId ?? "");
  if (!post) return <p className="sn-empty">この案件は見つかりませんでした</p>;
  const author = findPerson(post.authorId);
  if (!author) return <p className="sn-empty">この案件は見つかりませんでした</p>;
  const isMine = post.authorId === ME_ID;
  const company = companyOf(author);
  const answers = answersFor(post.id, myAnswers);
  const answered = (kind: AnswerKind) => myAnswers.some((a) => a.postId === post.id && a.kind === kind);
  const due = dueInfo(post.deadline);
  const introducee = suggestIntroducee(post, ME_ID, net);
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
            <PlainPill icon={<MapPin aria-hidden />}>{areaText(post.areas, 2)}</PlainPill>
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
            <RouteLine person={author} relation={authorRelation} />
          </>
        )}
      </aside>
      <div className="sn-page-main">
        <div className="sn-facts">
          <div><MapPin aria-hidden /><span>依頼した人</span><b>{regionOf(author.prefecture) ?? author.prefecture}</b></div>
          <div><Package aria-hidden /><span>探している場所</span><b>{areaText(post.areas)}</b></div>
          <div className={due?.soon ? "sn-facts-soon" : undefined}><Clock aria-hidden /><span>返事の期限</span><b>{due ? due.label : "決めていません"}</b></div>
        </div>
        <div className="sn-story sn-story--plain">
          <div><p className="sn-k">内容</p><p className="sn-v">{post.detail}</p></div>
        </div>
        <dl className="sn-dl">
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
type PostPickerField = "category" | "industry" | "regions";

export function NewPostScreen() {
  const { myPosts, addPost } = useSnState();
  const { go } = useSn();
  const [draft, setDraft] = useState<PostDraft>(EMPTY_POST_DRAFT);
  const [picking, setPicking] = useState<PostPickerField | null>(null);
  const [errors, setErrors] = useState<PostDraftErrors>({});
  const [hasDeadline, setHasDeadline] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const lock = useRef(false);
  const set = (patch: Partial<PostDraft>) => setDraft((d) => ({ ...d, ...patch }));
  const regionSummary = areaText(draft.regions, 2);

  const toReview = (e: React.FormEvent) => {
    e.preventDefault();
    const found = validatePostDraft(draft);
    if (hasDeadline && draft.deadline === "") found.deadline = "日付を選んでください（期限を決めないときは「なし」）";
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
        <div className="sn-fields sn-fields--post">
          <label className="sn-field">
            <span>ひとことで（タイトル）</span>
            <input type="text" value={draft.title} maxLength={POST_TITLE_MAX} placeholder="例：関東で外壁塗装をたのめる会社を探しています" onChange={(e) => set({ title: e.target.value })} aria-invalid={!!errors.title} />
            {err("title")}
          </label>

          <div className="sn-post-select-fields">
            <PostSelectRow label="カテゴリー" value={draft.category && categoryLabel(draft.category)} error={errors.category} onClick={() => setPicking("category")} />
            <PostSelectRow label="探している業種" value={draft.industry} error={errors.industry} onClick={() => setPicking("industry")} />
            <PostSelectRow label="探している地域" value={regionSummary} error={errors.regions} onClick={() => setPicking("regions")} />
          </div>

          <label className="sn-field">
            <span>内容</span>
            <textarea value={draft.detail} maxLength={POST_DETAIL_MAX} rows={6} placeholder="例：木造2階建て・12戸です。足場はこちらで手配します。" onChange={(e) => set({ detail: e.target.value })} aria-invalid={!!errors.detail} />
            {err("detail")}
          </label>

          <DeadlineChoice on={hasDeadline} onToggle={setHasDeadline} value={draft.deadline} onChange={(deadline) => set({ deadline })} min={todayIso()} error={errors.deadline} />

          <div>
            <label className="sn-field">
              <span>公開範囲</span>
              <select value={draft.visibility} aria-describedby="post-visibility-hint" onChange={(event) => {
                const selected = POST_VISIBILITIES.find(({ key }) => key === event.target.value);
                if (selected) set({ visibility: selected.key });
              }}>
                {POST_VISIBILITIES.map(({ key, label }) => <option key={key} value={key}>{label}</option>)}
              </select>
            </label>
            <p className="sn-field-note sn-post-visibility-hint" id="post-visibility-hint">{POST_VISIBILITY_HINT}</p>
          </div>
        </div>
        <div className="sn-sticky">
          <button type="submit" className="sn-btn sn-btn--main sn-btn--wide" disabled={done}>{done ? "依頼を出しました" : "内容を確かめる"}</button>
        </div>
      </form>
      {picking === "category" && (
        <PostChoiceDialog
          title="カテゴリー"
          choices={POST_CATEGORIES}
          initial={draft.category || undefined}
          applyLabel="決定する"
          onApply={(category) => { set({ category }); setErrors((previous) => ({ ...previous, category: undefined })); }}
          onClose={() => setPicking(null)}
        />
      )}
      {picking === "industry" && (
        <PostChoiceDialog
          title="探している業種"
          choices={INDUSTRIES.map((industry) => ({ key: industry, label: industry }))}
          initial={draft.industry || undefined}
          applyLabel="決定する"
          onApply={(industry) => { set({ industry }); setErrors((previous) => ({ ...previous, industry: undefined })); }}
          onClose={() => setPicking(null)}
        />
      )}
      {picking === "regions" && (
        <PostAreaDialog
          initial={draft.regions}
          onApply={(regions) => {
            set({ regions });
            if (regions.length) setErrors((previous) => ({ ...previous, regions: undefined }));
          }}
          onClose={() => setPicking(null)}
        />
      )}
      {reviewing && (
        <Modal title="この内容で依頼を出しますか？" onClose={() => !busy && setReviewing(false)} busy={busy}>
          <dl className="sn-review">
            <dt>タイトル</dt><dd>{draft.title.trim()}</dd>
            <dt>カテゴリー</dt><dd>{draft.category === "" ? "" : categoryLabel(draft.category)}</dd>
            <dt>探している人</dt><dd>{draft.industry}／{areaText(draft.regions)}</dd>
            <dt>内容</dt><dd>{draft.detail.trim()}</dd>
            <dt>返事の期限</dt><dd>{draft.deadline === "" ? "決めていません" : draft.deadline}</dd>
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
