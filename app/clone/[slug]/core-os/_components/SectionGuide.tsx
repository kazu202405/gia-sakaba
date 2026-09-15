// Core OS 各セクション上部の「意図バナー」。
// 「このセクションは何か」と「埋めると右腕AIがどう変わるか（動機）」を短く示すだけ。
// 各項目の具体的な書き方ヒント・例文は、フォーム/ダイアログ内の <FieldHint> でインライン表示する
// （上で開いて下のフォームへ往復する摩擦を避けるため）。
// 状態を持たないので server component のままでよい。

import { Lightbulb } from "lucide-react";
import { SECTION_GUIDES, type SectionKey } from "./sectionGuides";

interface Props {
  section: SectionKey;
}

export function SectionGuide({ section }: Props) {
  const guide = SECTION_GUIDES[section];
  if (!guide) return null;

  return (
    <div className="space-y-2 rounded-lg border border-[#e6d3a3] bg-[#fbf7ee] px-4 py-3">
      <p className="text-[13px] leading-relaxed text-gray-700">{guide.what}</p>
      <div className="flex items-start gap-2">
        <Lightbulb className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[#a9772b]" />
        <p className="text-[12px] leading-relaxed text-[#7a5618]">
          {guide.payoff}
        </p>
      </div>
    </div>
  );
}
