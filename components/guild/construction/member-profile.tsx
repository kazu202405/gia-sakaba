// 建設・不動産の店：メンバーのプロフィール（/guild/kensetsu-fudosan/members/<id>・マイページ「人からの見え方」）。
// 見た目は見本 PersonScreen（components/guild/look/sns/screens.tsx）の名刺型ヒーローに合わせる。
// 出す内容・見せる相手の決まりは酒場のページ（app/guild/[store]/members/[id]/page.tsx）と同じ。ここは見た目だけ。
// 名刺・入会のつながり・紹介状など酒場と共用の部品は、page から more に入れて受け取る（見た目は member-profile.css で寄せる）。

import type { ReactNode } from "react";
import { StoreLink } from "@/components/guild/store-link";
import { ConstructionShareUrl } from "@/components/guild/construction/member-share-url";
import { birthdayLabel } from "@/lib/guild/birthday";
import { contactItemLabel, safeContactHref, type ViewContactItem } from "@/lib/guild/contact-items";
import { groupLabelFor, positionLabel } from "@/lib/guild/labels";
import { industryText, storeHasField, type ProfileField } from "@/lib/guild/store-profile";
import type { Wording } from "@/lib/guild/store-words";
import type { Profile } from "@/lib/guild/types";
import "@/components/guild/construction/member-profile.css";

export type ConstructionMemberProfileProps = {
  profile: Profile;
  isMe: boolean;
  config: { profileFields: readonly ProfileField[] };
  w: Wording;
  contactItems: ViewContactItem[];
  contactError: boolean;
  /** 入会のつながりで直接つながっている相手か（ほかの人を見ているときだけ） */
  inviteConnected: boolean;
  /** 紹介のためのURLを出すか・その中身 */
  showShareUrl: boolean;
  shareToken: string | null;
  /** 伝えたいことの写真（署名URL） */
  workPhotos: string[];
  /** つながり申請のボタン（ほかの人を見ているときだけ） */
  action?: ReactNode;
  /** 名刺・入会のつながり・紹介状など、酒場と共用の窓 */
  more?: ReactNode;
};

/** 頭文字（顔写真がないとき） */
function initialOf(name: string): string {
  return Array.from(name.trim())[0] ?? "";
}

export function ConstructionMemberProfile({
  profile: p, isMe, config, w, contactItems, contactError, inviteConnected, showShareUrl, shareToken, workPhotos, action, more,
}: ConstructionMemberProfileProps) {
  const has = (field: ProfileField) => storeHasField(config, field);
  const industry = has("industry") || has("industry_choice") ? industryText(config, p.industry) : "";
  const areas = has("work_areas") ? p.work_areas ?? [] : [];
  const works = has("work_types") ? p.work_types ?? [] : [];
  const licenses = has("licenses")
    ? [p.has_construction_license ? "建設業許可" : "", p.has_real_estate_license ? "宅建免許" : ""].filter(Boolean)
    : [];
  const region = has("region") ? p.region : "";
  const job = has("job") ? p.job : "";
  const company = p.show_company ? p.company_name : "";

  const rows: { label: string; value: ReactNode }[] = [
    ...(company ? [{ label: w("member.company"), value: company }] : []),
    ...(job ? [{ label: w("member.job"), value: job }] : []),
    ...(industry ? [{ label: w("member.industry"), value: industry }] : []),
    ...(areas.length > 0 ? [{ label: "対応エリア", value: areas.join("・") }] : []),
    ...(licenses.length > 0 ? [{ label: "許可・免許", value: <Chips items={licenses} /> }] : []),
    ...(works.length > 0 ? [{ label: "得意な工事", value: <Chips items={works} /> }] : []),
  ];

  const sections = [
    ...(has("bio") ? [{ group: "work" as const, label: w("member.bioLabel"), value: p.bio }] : []),
    ...(has("values_text") ? [{ group: "values" as const, label: w("member.valuesLabel"), value: p.values_text }] : []),
    ...(has("looking_for") ? [{ group: "connect" as const, label: w("member.connectLabel"), value: p.looking_for }] : []),
  ];
  // ほかの人が見るとき：書かれていない項目は出さない。本人が見るとき：空の項目も出して入力へ案内する
  const shown = isMe ? sections : sections.filter((section) => !p.visible_groups.includes(section.group) || section.value.trim());

  const birthday = birthdayLabel(p.birth_month, p.birth_day, p.birth_year);
  const personal = [
    { label: w("personal.hometown"), value: p.hometown?.trim() ?? "" },
    { label: w("personal.birthday"), value: birthday },
    { label: w("personal.hobbies"), value: p.hobbies?.trim() ?? "" },
    { label: w("personal.lifeStory"), value: p.life_story?.trim() ?? "" },
  ].filter((item) => item.value);

  const wantToSolve = has("want_to_solve") ? p.want_to_solve : "";
  const pills = [industry, ...works].filter(Boolean);

  return (
    <div className="sn-page sn-page--detail sn-person-profile">
      <aside className="sn-page-side">
        {isMe && <p className="sn-mp-note">これは、ほかのメンバーから見えるあなたのプロフィールです。</p>}
        <div className="sn-hero sn-mp-hero">
          {/* 名刺と同じ並び：上に会社と役職、まん中に顔とふりがな・名前、下に所在地 */}
          <div className="sn-card sn-person-card">
            <p className="sn-card-top">
              <b>{company}</b>
              <span>{positionLabel[p.position]}</span>
            </p>
            <div className="sn-card-mid">
              {p.photo_url
                // eslint-disable-next-line @next/next/no-img-element -- 会員が上げた顔写真。next/image を通さない（酒場の JobAvatar と同じ）
                ? <span className="sn-fc sn-fc--lg sn-mp-photo"><img src={p.photo_url} alt="" /></span>
                : <span className="sn-fc sn-fc--lg" aria-hidden>{initialOf(p.display_name)}</span>}
              <div>
                {p.name_kana && <p className="sn-kana">{p.name_kana}</p>}
                <h1>{p.display_name}</h1>
              </div>
            </div>
            <div className="sn-card-bottom">
              {region && <p>{region}</p>}
            </div>
          </div>
          <div className="sn-hero-say">
            {p.headline && <p className="sn-say sn-mp-say">{p.headline}</p>}
            {pills.length > 0 && <div className="sn-pills sn-mp-pills" aria-label="業種と得意な工事">
              {pills.map((name) => <span key={name} className="sn-pill sn-pill--plain">{name}</span>)}
            </div>}
          </div>
          {!isMe && inviteConnected && <p className="sn-mp-connected"><span className="sn-pill">入会のつながりで、つながっています</span></p>}
          {!isMe && <p className="sn-mp-note sn-mp-note--foot">連絡先は、本人が選んだ相手にだけ表示しています。🔒 のものは、つながり申請を承諾し合うと見えるようになります。</p>}
        </div>
      </aside>

      <div className="sn-page-main">
        {rows.length > 0 && <section className="sn-sec sn-mp-sec">
          <div className="sn-sec-h"><h2>基本情報</h2></div>
          <dl className="sn-dl">
            {rows.map((row) => <div key={row.label}><dt>{row.label}</dt><dd>{row.value}</dd></div>)}
          </dl>
        </section>}

        <section className="sn-sec sn-mp-sec">
          <div className="sn-sec-h"><h2>連絡先</h2></div>
          {contactError
            ? <p className="sn-mp-muted">連絡先を読み込めませんでした。</p>
            : contactItems.length === 0
              ? <p className="sn-mp-muted">表示できる連絡先はありません。</p>
              : <dl className="sn-dl">
                {contactItems.map((item, index) => {
                  const href = item.locked ? null : safeContactHref(item);
                  return <div key={`${item.kind}-${index}`}>
                    <dt>{contactItemLabel(item)}</dt>
                    <dd>
                      {item.locked
                        ? <span className="sn-mp-locked">🔒 つながった人にだけ表示</span>
                        : href
                          ? <a href={href} target={item.kind === "email" ? undefined : "_blank"} rel="noopener noreferrer">{item.kind === "email" ? item.value : "開く ↗"}</a>
                          : item.value}
                    </dd>
                  </div>;
                })}
              </dl>}
        </section>

        {wantToSolve && <section className="sn-sec sn-mp-sec">
          <div className="sn-sec-h"><h2>{w("member.wantToSolve")}</h2></div>
          <p className="sn-mp-text">{wantToSolve}</p>
        </section>}

        {(shown.length > 0 || isMe || workPhotos.length > 0) && <section className="sn-sec sn-mp-sec">
          <div className="sn-sec-h"><h2>{w("member.profileWindow")}</h2></div>
          {shown.length === 0 ? <p className="sn-mp-muted">まだ書かれていません。</p> : shown.map((section) => {
            const visible = p.visible_groups.includes(section.group);
            return <div key={section.group} className="sn-mp-block">
              <h3>{groupLabelFor(w)[section.group].title}</h3>
              {visible && !section.value.trim()
                ? <p className="sn-mp-muted">まだ入力されていません。<StoreLink to="/me/status">{w("status.editButton")}</StoreLink></p>
                : visible
                  ? <>
                    <p className="sn-mp-muted">{section.label}</p>
                    <p className="sn-mp-text">{section.value}</p>
                    {section.group === "work" && workPhotos.length > 0 && <ul className="sn-mp-photos">
                      {workPhotos.map((url) => <li key={url}>
                        {/* eslint-disable-next-line @next/next/no-img-element -- 期限つきの署名URLの画像なので next/image を通さない */}
                        <a href={url} target="_blank" rel="noopener noreferrer"><img src={url} alt="伝えたいことの写真" /></a>
                      </li>)}
                    </ul>}
                  </>
                  : <p className="sn-mp-muted">{w("member.hidden")}</p>}
            </div>;
          })}
        </section>}

        {personal.length > 0 && <section className="sn-sec sn-mp-sec">
          <div className="sn-sec-h"><h2>人となり</h2></div>
          {personal.map((item) => <div key={item.label} className="sn-mp-block">
            <h3>{item.label}</h3>
            <p className="sn-mp-text">{item.value}</p>
          </div>)}
        </section>}

        {showShareUrl && <ConstructionShareUrl token={shareToken} isMe={isMe} />}

        {more && <div className="sn-live-edit sn-member-more">{more}</div>}
      </div>

      {action && <div className="sn-sticky sn-member-action">{action}</div>}
    </div>
  );
}

function Chips({ items }: { items: string[] }) {
  return <ul className="sn-mp-chips">{items.map((name) => <li key={name} className="sn-mp-chip">{name}</li>)}</ul>;
}
