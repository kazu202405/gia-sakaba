"use client";

// 会員の画面：届いた相談(6)・自分(7)・自分を編集(8)・名簿(9)・お知らせ(10)。

import { Camera, ChevronRight } from "lucide-react";
import { useRef, useState } from "react";
import { uiToast } from "@/lib/ui-dialog";
import {
  INDUSTRIES,
  MASKED_REQUESTER,
  PHOTO_MAX,
  PROFILE_TEXT_MAX,
  PREFECTURES,
  REGIONS,
  WORK_TYPES,
  formatJst,
  industryLabel,
  kindLabel,
  matchesMember,
  placeOf,
  timingLabel,
  type Member,
  type Photo,
} from "@/lib/guild/look/kensetsu-mock";
import { Marks, PhotoTiles } from "./parts";
import { KLink, useK, useMock } from "./store";

// ---------- 6. 届いた相談 ----------

export function IncomingScreen() {
  const { state, dispatch } = useMock();
  const { persona } = useK();
  const locked = useRef(new Set<string>());
  const list = state.referrals
    .filter((r) => matchesMember(r, persona) || (r.interestedIds.includes(persona.id) && r.requesterId !== persona.id && (r.status === "received" || r.status === "reviewed")))
    .sort((a, b) => b.createdAt - a.createdAt);

  const raise = (id: string) => {
    // 押した瞬間に錠（同じ相談を続けて押されても1回だけ）
    if (locked.current.has(id)) return;
    locked.current.add(id);
    dispatch({ type: "raiseHand", id, memberId: persona.id });
    uiToast("手を挙げました。管理者の返事をお待ちください");
  };

  return (
    <div>
      <h1>届いた相談</h1>
      <p className="kz-lead">
        {persona.industry
          ? `あなたの業種（${industryLabel(persona.industry)}）とエリア（${persona.areas.join("・")}）に合う相談です。`
          : "業種とエリアを入れると、合う相談が届きます。"}
        {MASKED_REQUESTER}。
      </p>
      <KLink to="/members" className="kz-row kz-row-link kz-link-row">
        <span>名簿を見る</span>
        <ChevronRight size={20} className="kz-pick-go" aria-hidden />
      </KLink>
      {list.length === 0 ? (
        <p className="kz-empty">いま届いている相談はありません。新しい相談が入ると、お知らせします。</p>
      ) : (
        <div className="kz-list">
          {list.map((r) => {
            const raised = r.interestedIds.includes(persona.id);
            return (
              <div key={r.id} className="kz-row">
                <p>{r.body}</p>
                <p className="kz-meta">{kindLabel(r.kind)}・{placeOf(r)}・{timingLabel(r.timing)}・{formatJst(r.createdAt)}</p>
                <PhotoTiles photos={r.photos} />
                {raised ? (
                  <>
                    <button type="button" className="kz-btn kz-btn--small" disabled>手を挙げました</button>
                    <p className="kz-meta">管理者の返事待ちです</p>
                  </>
                ) : (
                  <button type="button" className="kz-btn kz-btn--small" onClick={() => raise(r.id)}>話を聞きたい</button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------- 7. 自分 ----------

export function ProfileScreen() {
  const { persona } = useK();
  const [card, setCard] = useState<{ url: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const filled = [persona.industry, persona.areas.length > 0, persona.works.length > 0, persona.message?.trim()].filter(Boolean).length;

  const onCard = (files: FileList | null) => {
    const file = files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    setCard({ url: URL.createObjectURL(file) });
    uiToast("名刺を受け取りました。管理者が下書きを作ります");
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div>
      <h1>{persona.name}</h1>
      <p className="kz-lead">{persona.company}　／　入力状況 {filled}/4</p>
      {persona.headline?.trim() && <p>{persona.headline}</p>}
      <dl className="kz-list">
        <ProfileRow term="業種" value={persona.industry ? industryLabel(persona.industry) : "未入力"} />
        <ProfileRow term="対応エリア" value={persona.areas.length > 0 ? persona.areas.join("・") : "未入力"} />
        <div className="kz-row">
          <dt className="kz-label">許可・免許</dt>
          <dd><Marks receiver={persona} /></dd>
        </div>
        <div className="kz-row">
          <dt className="kz-label">得意な工事・できること</dt>
          <dd>
            {persona.works.length > 0 ? <span className="kz-tags">{persona.works.map((w) => <span key={w} className="kz-tag">{w}</span>)}</span> : "未入力"}
          </dd>
        </div>
        <ProfileText term="伝えたいこと（実績・強みなど）" value={persona.message} required />
        {persona.photos && persona.photos.length > 0 && (
          <div className="kz-row">
            <dt className="kz-label">写真</dt>
            <dd><PhotoTiles photos={persona.photos} /></dd>
          </div>
        )}
        <ProfileText term="探しているもの" value={persona.lookingFor} />
        <ProfileRow term="連絡先" value={persona.contact} />
      </dl>
      {[persona.hometown, persona.hobbies, persona.lifeStory].some((v) => v?.trim()) && (
        <>
          <h2>雑談のきっかけ</h2>
          <dl className="kz-list">
            <ProfileText term="出身" value={persona.hometown} />
            <ProfileText term="趣味" value={persona.hobbies} />
            <ProfileText term="これまで" value={persona.lifeStory} />
          </dl>
        </>
      )}
      <div className="kz-btn-row">
        <KLink to="/me/edit" className="kz-btn">プロフィールを編集する</KLink>
        <KLink to="/members" className="kz-btn kz-btn--sub">名簿を見る</KLink>
      </div>
      <hr className="kz-rule" />
      <h2>名刺から作る</h2>
      <p className="kz-meta">名刺を撮ると、管理者がプロフィールの下書きを作ります。載せるまで、ほかのメンバーには見えません。</p>
      {card ? (
        <>
          <PhotoTiles photos={[{ id: "card", name: "名刺", url: card.url }]} />
          <p className="kz-meta kz-meta--accent">名刺を送りました。管理者が下書きを作っています。</p>
        </>
      ) : (
        <button type="button" className="kz-btn kz-btn--sub" onClick={() => fileRef.current?.click()}>
          <Camera size={22} aria-hidden />名刺を撮る
        </button>
      )}
      <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => onCard(e.target.files)} />
    </div>
  );
}

function ProfileRow({ term, value }: { term: string; value: string }) {
  return (
    <div className="kz-row">
      <dt className="kz-label">{term}</dt>
      <dd>{value}</dd>
    </div>
  );
}

// 自由に書く欄。空なら行ごと出さない（required の欄だけ「未入力」と出して書いてもらう）
function ProfileText({ term, value, required = false }: { term: string; value?: string; required?: boolean }) {
  const text = value?.trim() ?? "";
  if (!text && !required) return null;
  return (
    <div className="kz-row">
      <dt className="kz-label">{term}</dt>
      <dd className="kz-pre">{text || "未入力"}</dd>
    </div>
  );
}

// ---------- 8. 自分を編集 ----------

export function ProfileEditScreen() {
  const { persona } = useK();
  return <ProfileEditForm key={persona.id} persona={persona} />;
}

type TextKey = keyof typeof PROFILE_TEXT_MAX;

function toggle(list: readonly string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function ProfileEditForm({ persona }: { persona: Member }) {
  const { dispatch } = useMock();
  const { go } = useK();
  const [industry, setIndustry] = useState(persona.industry);
  const [areas, setAreas] = useState<string[]>([...persona.areas]);
  const [works, setWorks] = useState<string[]>([...persona.works]);
  const [construction, setConstruction] = useState(persona.hasConstructionLicense);
  const [realEstate, setRealEstate] = useState(persona.hasRealEstateLicense);
  const [texts, setTexts] = useState<Record<TextKey, string>>(() => ({
    headline: persona.headline ?? "",
    message: persona.message ?? "",
    lookingFor: persona.lookingFor ?? "",
    hometown: persona.hometown ?? "",
    hobbies: persona.hobbies ?? "",
    lifeStory: persona.lifeStory ?? "",
  }));
  const [photos, setPhotos] = useState<Photo[]>([...(persona.photos ?? [])]);
  const [errors, setErrors] = useState<{ industry?: string; areas?: string }>({});
  const [saving, setSaving] = useState(false);
  const lock = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const addPhotos = (files: FileList | null) => {
    if (!files) return;
    const room = PHOTO_MAX - photos.length;
    const picked = Array.from(files).filter((f) => f.type.startsWith("image/")).slice(0, Math.max(room, 0));
    if (files.length > picked.length) uiToast(`写真は${PHOTO_MAX}枚までです`, "info");
    setPhotos([...photos, ...picked.map((f, i) => ({ id: `pp-${Date.now()}-${i}`, name: f.name, url: URL.createObjectURL(f) }))]);
    if (fileRef.current) fileRef.current.value = "";
  };

  const textField = (key: TextKey, label: string, opts: { multiline?: boolean; placeholder?: string } = {}) => {
    const max = PROFILE_TEXT_MAX[key];
    const props = {
      className: "kz-input",
      value: texts[key],
      maxLength: max,
      placeholder: opts.placeholder,
      onChange: (e: { target: { value: string } }) => setTexts((t) => ({ ...t, [key]: e.target.value })),
    };
    return (
      <label className="kz-field">
        <span className="kz-label">{label}</span>
        {opts.multiline ? <textarea rows={4} {...props} /> : <input type="text" {...props} />}
        {opts.multiline && <p className="kz-count">{texts[key].length}/{max}</p>}
      </label>
    );
  };

  const save = () => {
    if (lock.current) return;
    const next: typeof errors = {};
    if (!industry) next.industry = "業種を1つ選んでください";
    if (areas.length === 0) next.areas = "対応エリアを1つ以上選んでください";
    setErrors(next);
    if (next.industry || next.areas) return;
    lock.current = true;
    setSaving(true);
    const trimmed = Object.fromEntries(Object.entries(texts).map(([k, v]) => [k, v.trim()])) as Record<TextKey, string>;
    dispatch({ type: "saveProfile", memberId: persona.id, patch: { industry, areas, works, hasConstructionLicense: construction, hasRealEstateLicense: realEstate, ...trimmed, photos } });
    uiToast("プロフィールを保存しました");
    // 錠は外さない。自分の画面が出るまで押せないまま
    go("/me");
  };

  return (
    <div>
      <h1>プロフィールを編集</h1>
      <p className="kz-lead">30秒で入ります。ここで入れた業種とエリアに合う相談が、届きます。</p>

      {textField("headline", "ひとこと", { placeholder: "例：屋根と雨漏りなら、まず相談ください" })}

      <div className="kz-field">
        <span className="kz-label">業種</span>
        <div className="kz-chips">
          {INDUSTRIES.map((i) => (
            <button key={i.key} type="button" className="kz-chip" aria-pressed={industry === i.key} onClick={() => { setIndustry(i.key); setErrors((e) => ({ ...e, industry: undefined })); }}>{i.label}</button>
          ))}
        </div>
        {errors.industry && <p className="kz-error" role="alert">{errors.industry}</p>}
      </div>

      <div className="kz-field">
        <span className="kz-label">対応エリア（タップで選びます・{areas.length}か所）</span>
        {REGIONS.map((region) => (
          <div key={region.label}>
            <p className="kz-region">{region.label}</p>
            <div className="kz-chips">
              {region.prefectures.map((p) => (
                <button key={p} type="button" className="kz-chip" aria-pressed={areas.includes(p)} onClick={() => { setAreas(toggle(areas, p)); setErrors((e) => ({ ...e, areas: undefined })); }}>{p}</button>
              ))}
            </div>
          </div>
        ))}
        {errors.areas && <p className="kz-error" role="alert">{errors.areas}</p>}
      </div>

      <div className="kz-field">
        <span className="kz-label">許可・免許</span>
        <label className="kz-check"><input type="checkbox" checked={construction} onChange={(e) => setConstruction(e.target.checked)} /><span>建設業許可を持っている</span></label>
        <label className="kz-check"><input type="checkbox" checked={realEstate} onChange={(e) => setRealEstate(e.target.checked)} /><span>宅建免許を持っている</span></label>
        <p className="kz-meta">印は、管理者が渡し先を選ぶときの目安として表示されます。</p>
      </div>

      <div className="kz-field">
        <span className="kz-label">得意な工事・できること</span>
        <div className="kz-chips">
          {WORK_TYPES.map((w) => (
            <button key={w} type="button" className="kz-chip" aria-pressed={works.includes(w)} onClick={() => setWorks(toggle(works, w))}>{w}</button>
          ))}
        </div>
      </div>

      {textField("message", "伝えたいこと（実績・強みなど）", { multiline: true, placeholder: "例：大阪・兵庫で屋根工事を25年。雨漏りは原因を見つけるところから入ります。小さな修理でも伺います。" })}

      <div className="kz-field">
        <span className="kz-label">写真（無くても大丈夫です・{PHOTO_MAX}枚まで）</span>
        <PhotoTiles photos={photos} onRemove={(id) => setPhotos(photos.filter((p) => p.id !== id))} />
        <button
          type="button"
          className="kz-btn kz-btn--sub kz-btn--small"
          aria-disabled={photos.length >= PHOTO_MAX}
          onClick={() => {
            if (photos.length >= PHOTO_MAX) { uiToast(`写真は${PHOTO_MAX}枚までです`, "info"); return; }
            fileRef.current?.click();
          }}
        >
          <Camera size={20} aria-hidden />写真を付ける
        </button>
        <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => addPhotos(e.target.files)} />
      </div>
      {textField("lookingFor", "探しているもの", { multiline: true, placeholder: "例：外壁塗装の職人さん・空き家の持ち主とつながっている方" })}

      <h2>雑談のきっかけ（書かなくても大丈夫です）</h2>
      {textField("hometown", "出身", { placeholder: "例：堺市" })}
      {textField("hobbies", "趣味", { placeholder: "例：釣り・草野球" })}
      {textField("lifeStory", "これまで", { multiline: true, placeholder: "例：父の工務店を継いで2代目です。" })}

      <div className="kz-btn-row">
        <button type="button" className="kz-btn" disabled={saving} onClick={save}>{saving ? "保存しています…" : "保存する"}</button>
        <KLink to="/me" className="kz-btn kz-btn--sub" aria-disabled={saving} onClick={(e) => { if (saving) e.preventDefault(); }}>保存せずにもどる</KLink>
      </div>
    </div>
  );
}

// ---------- 9. 名簿 ----------

export function RosterScreen() {
  const { state } = useMock();
  const [industry, setIndustry] = useState("");
  const [area, setArea] = useState("");
  const people = state.members
    .filter((m) => m.id !== "m-admin")
    .filter((m) => (industry ? m.industry === industry : true) && (area ? m.areas.includes(area) : true));
  return (
    <div>
      <h1>名簿</h1>
      <p className="kz-lead">だれがどんな仕事をしている人かを知る場所です。</p>
      <div className="kz-filters">
        <label className="kz-field">
          <span>業種</span>
          <select className="kz-input" value={industry} onChange={(e) => setIndustry(e.target.value)}>
            <option value="">すべて</option>
            {INDUSTRIES.map((i) => <option key={i.key} value={i.key}>{i.label}</option>)}
          </select>
        </label>
        <label className="kz-field">
          <span>エリア</span>
          <select className="kz-input" value={area} onChange={(e) => setArea(e.target.value)}>
            <option value="">すべて</option>
            {PREFECTURES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </label>
      </div>
      <p className="kz-meta" aria-live="polite">{people.length}人</p>
      {people.length === 0 ? (
        <p className="kz-empty">条件に合う人がいません。条件をゆるめてみてください。</p>
      ) : (
        <div className="kz-list">
          {people.map((m) => (
            <div key={m.id} className="kz-row">
              <p><strong>{m.company}</strong></p>
              <p className="kz-meta">{m.name}・{industryLabel(m.industry)}・{m.areas.join("・")}</p>
              {m.headline?.trim() && <p>{m.headline}</p>}
              <Marks receiver={m} />
              {m.works.length > 0 && <span className="kz-tags">{m.works.map((w) => <span key={w} className="kz-tag">{w}</span>)}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- 10. お知らせ ----------

export function NoticesScreen() {
  const { state, dispatch } = useMock();
  const { persona, role } = useK();
  const list = state.notices.filter((n) => n.forMemberId === persona.id).sort((a, b) => b.at - a.at);
  const target = (referralId: string) => (role === "admin" ? `/master/${referralId}` : role === "member" ? "/incoming" : `/referrals/${referralId}`);
  return (
    <div>
      <h1>お知らせ</h1>
      <p className="kz-lead">相談が進んだときと、手を挙げた相談の返事が届きます。</p>
      {list.length === 0 ? (
        <p className="kz-empty">お知らせはまだありません。</p>
      ) : (
        <div className="kz-list">
          {list.map((n) => (
            <KLink key={n.id} to={target(n.referralId)} className="kz-row kz-row-link" onClick={() => dispatch({ type: "readNotice", id: n.id })}>
              <p className={n.read ? undefined : "kz-unread"}>{!n.read && <span className="kz-dot" aria-label="未読" />}{n.text}</p>
              <p className="kz-meta">{formatJst(n.at)}</p>
            </KLink>
          ))}
        </div>
      )}
    </div>
  );
}
