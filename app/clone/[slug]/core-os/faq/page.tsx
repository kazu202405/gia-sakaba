// /clone/[slug]/core-os/faq ─ FAQ・返答案の一覧 + 追加。

import {
  EditorialHeader,
  EditorialCard,
  MetricChip,
} from "@/app/admin/_components/EditorialChrome";
import { loadTenantOr404 } from "@/lib/ai-clone/tenant";
import { createClient } from "@/lib/supabase/server";
import { CoreOsNav } from "../_components/CoreOsNav";
import { SectionGuide } from "../_components/SectionGuide";
import { CoreOsAssistDialog } from "../_components/CoreOsAssistDialog";
import { FaqAddDialog } from "./_components/FaqAddDialog";
import { FaqEditDialog } from "./_components/FaqEditDialog";
import { FaqDeleteButton } from "./_components/FaqDeleteButton";

export const dynamic = "force-dynamic";

interface FaqRow {
  id: string;
  question: string;
  base_answer: string | null;
  supplement: string | null;
  caveat: string | null;
  requires_final_check: boolean | null;
}

export default async function FaqPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { tenant } = await loadTenantOr404(slug);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_clone_faq")
    .select("id, question, base_answer, supplement, caveat, requires_final_check")
    .eq("tenant_id", tenant.id)
    .order("created_at", { ascending: false });

  const faqs = (data ?? []) as FaqRow[];

  return (
    <div className="px-5 sm:px-6 py-6 space-y-6">
      <EditorialHeader
        title="FAQ・返答案"
        description="よくある質問と「あなたの言葉での」返答案。右腕AI が初期回答を組み立てる素材。"
        right={
          <div className="flex flex-wrap items-center gap-2">
            <MetricChip count={faqs.length} label="Q&A" tone="navy" />
            <CoreOsAssistDialog slug={slug} section="faq" />
            <FaqAddDialog slug={slug} tenantId={tenant.id} />
          </div>
        }
      />

      <CoreOsNav slug={slug} />

      <SectionGuide section="faq" />

      {error && (
        <EditorialCard className="px-5 py-4">
          <p className="text-[13px] text-[#8a4538]">
            一覧の取得に失敗しました：{error.message}
          </p>
        </EditorialCard>
      )}

      {!error && faqs.length === 0 && (
        <EditorialCard className="px-6 py-12 text-center">
          <p className="font-serif text-base text-[#1c3550] mb-2">
            まだ FAQ が登録されていません
          </p>
          <p className="text-[12px] text-gray-500 leading-relaxed">
            営業・問い合わせで繰り返し聞かれる質問と、その返答案を蓄積していきます。
          </p>
        </EditorialCard>
      )}

      {!error && faqs.length > 0 && (
        <ul className="space-y-3">
          {faqs.map((f) => {
            const initial = {
              question: f.question,
              base_answer: f.base_answer ?? "",
              supplement: f.supplement ?? "",
              caveat: f.caveat ?? "",
              requires_final_check: f.requires_final_check ?? false,
            };
            const label = f.question.slice(0, 40);
            return (
              <li key={f.id}>
                <EditorialCard variant="row" className="px-5 py-4 group">
                <div className="flex items-start gap-2 mb-3">
                  <span
                    aria-hidden
                    className="inline-flex items-center justify-center w-5 h-5 rounded bg-[#1c3550] text-white text-[11px] font-bold flex-shrink-0 mt-0.5"
                  >
                    Q
                  </span>
                  <h3 className="text-sm font-bold text-[#1c3550] flex-1">
                    {f.question}
                  </h3>
                  {f.requires_final_check && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider bg-[#fbf3e3] text-[#8a5a1c] border border-[#e6d3a3] flex-shrink-0">
                      要最終確認
                    </span>
                  )}
                  <div className="flex items-center gap-0.5 opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <FaqEditDialog
                      slug={slug}
                      tenantId={tenant.id}
                      faqId={f.id}
                      initial={initial}
                    />
                    <FaqDeleteButton
                      slug={slug}
                      tenantId={tenant.id}
                      faqId={f.id}
                      label={label}
                    />
                  </div>
                </div>

                {f.base_answer && (
                  <div className="flex items-start gap-2">
                    <span
                      aria-hidden
                      className="inline-flex items-center justify-center w-5 h-5 rounded bg-[#c08a3e] text-white text-[11px] font-bold flex-shrink-0 mt-0.5"
                    >
                      A
                    </span>
                    <p className="text-[13px] text-gray-800 leading-relaxed whitespace-pre-wrap flex-1">
                      {f.base_answer}
                    </p>
                  </div>
                )}

                {(f.supplement || f.caveat) && (
                  <div className="space-y-1.5 mt-3 pt-3 border-t border-gray-100 text-[12px] pl-7">
                    {f.supplement && (
                      <div>
                        <span className="text-gray-400 tracking-wider">補足: </span>
                        <span className="text-gray-700 whitespace-pre-wrap">
                          {f.supplement}
                        </span>
                      </div>
                    )}
                    {f.caveat && (
                      <div>
                        <span className="text-gray-400 tracking-wider">注意: </span>
                        <span className="text-gray-700 whitespace-pre-wrap">
                          {f.caveat}
                        </span>
                      </div>
                    )}
                  </div>
                )}
                </EditorialCard>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
