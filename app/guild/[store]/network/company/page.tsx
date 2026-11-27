import Link from "next/link";
import { ConstructionField, ConstructionFields, ConstructionPanel } from "@/components/guild/construction/fields";
import { ConstructionAreas, ConstructionForm } from "@/components/guild/construction/forms";
import { saveConstructionCompany } from "@/lib/guild/construction-actions";
import type { ConstructionCompany } from "@/lib/guild/construction-forms";
import { constructionContext, constructionRows } from "@/lib/guild/construction-server";
import { INDUSTRIES, PREFECTURES } from "@/lib/guild/look/sns-mock";

export default async function ConstructionCompanyPage() {
  const { store, userId } = await constructionContext();
  const company = (await constructionRows<ConstructionCompany>("sakaba_construction_list_companies"))
    .find(({ members }) => members.some(({ user_id }) => user_id === userId));
  const member = company?.members.find(({ user_id }) => user_id === userId);
  return (
    <ConstructionPanel title="会社情報">
      <Link className="text-sm underline" href={store.path("/network")}>やり取りへ</Link>
      <ConstructionForm action={saveConstructionCompany} submit="会社情報を保存">
        <ConstructionFields>
          <ConstructionField label="会社名"><input name="name" type="text" defaultValue={company?.name} required maxLength={100} /></ConstructionField>
          <ConstructionField label="所在地"><select name="prefecture" defaultValue={company?.prefecture ?? ""} required><option value="" disabled>選択する</option>{PREFECTURES.map((item) => <option key={item}>{item}</option>)}</select></ConstructionField>
          <fieldset className="space-y-1 border-0"><legend>業種（複数選択可）</legend>
            <div className="flex flex-wrap gap-3">{INDUSTRIES.map((item) => <label className="inline-flex items-center gap-1" key={item}><input name="industry" type="checkbox" value={item} defaultChecked={company?.industries.includes(item)} />{item}</label>)}</div>
          </fieldset>
          <ConstructionAreas label="対応エリア（複数選択可）" initial={company?.areas} />
          <ConstructionField label="役職（任意）"><input name="title" type="text" defaultValue={member?.title} maxLength={80} /></ConstructionField>
          <ConstructionField label="事業内容（任意）"><textarea name="business" defaultValue={company?.business} maxLength={600} rows={3} /></ConstructionField>
          <ConstructionField label="ウェブサイト（任意）"><input name="website" type="url" defaultValue={company?.website} maxLength={500} /></ConstructionField>
          {company?.licenses.length ? <ul aria-label="登録済みの許可・免許">{company.licenses.map((license) => <li className="text-sm" key={license.kind + license.issuer + license.number}>{license.kind} · {license.issuer} · {license.number}（{license.verified ? "確認済み" : "本人申告"}）</li>)}</ul> : null}
          <details className="space-y-3"><summary className="cursor-pointer">許可・免許を追加（任意）</summary>
            <ConstructionField label="種類"><input type="text" name="license_kind" maxLength={80} /></ConstructionField>
            <ConstructionField label="発行元"><input type="text" name="license_issuer" maxLength={100} /></ConstructionField>
            <ConstructionField label="番号"><input type="text" name="license_number" maxLength={80} /></ConstructionField>
          </details>
        </ConstructionFields>
      </ConstructionForm>
    </ConstructionPanel>
  );
}
