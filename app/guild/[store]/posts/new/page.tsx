import { ConstructionField } from "@/components/guild/construction/fields";
import { ConstructionDeadline, ConstructionForm, ConstructionPostSelections } from "@/components/guild/construction/forms";
import { publishConstructionPost } from "@/lib/guild/construction-actions";
import { constructionContext } from "@/lib/guild/construction-server";
import { POST_VISIBILITIES, POST_VISIBILITY_HINT } from "@/lib/guild/look/sns-mock";

export default async function NewConstructionPostPage() {
  await constructionContext();
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
  return <div className="sn-form">
    <div className="sn-sec"><div className="sn-sec-h"><h2>何を探していますか？</h2></div></div>
    <ConstructionForm action={publishConstructionPost} submit="依頼を出す" reviewPost className="sn-fields">
      <ConstructionField label="ひとことで（タイトル）"><input name="title" type="text" required maxLength={60} placeholder="例：関東で外壁塗装をたのめる会社を探しています" /></ConstructionField>
      <ConstructionPostSelections />
      <ConstructionField label="内容"><textarea name="body" required maxLength={600} rows={6} placeholder="例：木造2階建て・12戸です。足場はこちらで手配します。" /></ConstructionField>
      <ConstructionField label="返事の期限（任意）"><ConstructionDeadline min={today} /></ConstructionField>
      <ConstructionField label="問い合わせ先"><input name="contact" type="text" required maxLength={300} /></ConstructionField>
      <div>
        <ConstructionField label="公開範囲"><select name="visibility" defaultValue="friends2" aria-describedby="post-visibility-hint">{POST_VISIBILITIES.map(({ key, label }) => <option key={key} value={key}>{label}</option>)}</select></ConstructionField>
        <p className="sn-field-note sn-post-visibility-hint" id="post-visibility-hint">{POST_VISIBILITY_HINT}</p>
      </div>
    </ConstructionForm>
  </div>;
}
