// Phase 1 で実装予定の各セクション用 placeholder。
// 枠を成り立たせるためだけのページ。Phase 1 完成時に各セクションの実体ページに差し替え。

import {
  EditorialHeader,
  EditorialCard,
} from "@/app/admin/_components/EditorialChrome";

interface ComingSoonProps {
  eyebrow: string;
  title: string;
  description?: string;
  bullets?: string[];
}

export function ComingSoon({
  eyebrow,
  title,
  description,
  bullets,
}: ComingSoonProps) {
  return (
    <div className="px-5 sm:px-6 py-6 space-y-6">
      <EditorialHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
      />
      <EditorialCard className="p-6">
        <p className="text-sm text-gray-700 leading-relaxed">
          このページは Phase 1 で実装予定です。今は枠だけ配置しています。
        </p>
        {bullets && bullets.length > 0 && (
          <ul className="mt-4 space-y-1.5 text-[13px] text-gray-600">
            {bullets.map((b, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-1.5 inline-block w-1 h-1 rounded-full bg-[#c08a3e]" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        )}
      </EditorialCard>
    </div>
  );
}
