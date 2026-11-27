import Link from "next/link";
import { ConstructionField, ConstructionFields, ConstructionPanel } from "@/components/guild/construction/fields";
import { ConstructionAreas, ConstructionDeadline, ConstructionForm } from "@/components/guild/construction/forms";
import { publishConstructionPost } from "@/lib/guild/construction-actions";
import { constructionContext } from "@/lib/guild/construction-server";
import { INDUSTRIES, POST_CATEGORIES, POST_VISIBILITIES } from "@/lib/guild/look/sns-mock";

export default async function NewConstructionPostPage() {
  const { store } = await constructionContext();
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
  return (
    <ConstructionPanel title="何を探していますか？">
      <Link className="text-sm underline" href={store.path("/posts")}>案件一覧へ</Link>
      <ConstructionForm action={publishConstructionPost} submit="依頼を出す" reviewPost>
        <ConstructionFields>
          <ConstructionField label="タイトル"><input name="title" type="text" required maxLength={60} /></ConstructionField>
          <ConstructionField label="カテゴリー"><select name="category" required defaultValue=""><option value="" disabled>選択する</option>{POST_CATEGORIES.map(({ key, label }) => <option value={key} key={key}>{label}</option>)}</select></ConstructionField>
          <ConstructionField label="探している業種"><select name="industry" required defaultValue=""><option value="" disabled>選択する</option>{INDUSTRIES.map((item) => <option key={item}>{item}</option>)}</select></ConstructionField>
          <ConstructionAreas label="探している地域（複数選択可）" />
          <ConstructionField label="内容"><textarea name="body" required maxLength={600} rows={5} /></ConstructionField>
          <ConstructionField label="返事の期限（任意）"><ConstructionDeadline min={today} /></ConstructionField>
          <ConstructionField label="問い合わせ先"><input name="contact" type="text" required maxLength={300} /></ConstructionField>
          <ConstructionField label="公開範囲"><select name="visibility" defaultValue="friends2">{POST_VISIBILITIES.map(({ key, label }) => <option key={key} value={key}>{label}</option>)}</select></ConstructionField>
        </ConstructionFields>
      </ConstructionForm>
    </ConstructionPanel>
  );
}
