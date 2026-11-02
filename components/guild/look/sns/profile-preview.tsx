"use client";

import { useState } from "react";
import { ArrowLeft, Eye, LockKeyhole } from "lucide-react";
import { PersonView } from "./screens";
import { SnLink, useSnState } from "./store";

/** 保存中のプロフィールを同じ表示部品で確認する。自己紹介の編集はここでは行わない。 */
export function ProfilePreviewScreen() {
  const { me } = useSnState();
  const [viewer, setViewer] = useState<"new" | "direct">("new");
  return <>
    <section className="sn-profile-preview-bar" aria-label="プロフィールの見え方">
      <div className="sn-preview-heading"><h1><Eye size={18} aria-hidden />他の人から見たプロフィール</h1><SnLink to="/me"><ArrowLeft size={14} aria-hidden />戻る</SnLink></div>
      <div className="sn-segment" role="group" aria-label="見る人とのつながり">
        <button type="button" aria-pressed={viewer === "new"} onClick={() => setViewer("new")}>まだつながっていない人</button>
        <button type="button" aria-pressed={viewer === "direct"} onClick={() => setViewer("direct")}>知り合い</button>
      </div>
      <p className="sn-preview-note"><LockKeyhole size={14} aria-hidden />{viewer === "new" ? "電話・メールは表示されません。" : "知り合いは「連絡先を見る」から電話・メールを確認できます。"}</p>
      <p className="sn-meta">紹介の道は、見る人とあなたのつながりによって変わります。</p>
    </section>
    <PersonView person={me} relation={{ kind: viewer === "direct" ? "direct" : "none" }} preview />
  </>;
}
