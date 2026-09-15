import Link from "next/link";

export default function GuildLookIndexPage() {
  const items = [
    {
      key: "C",
      title: "C. 明るい酒場（A×B）",
      note: "Bの明るさ＋Aの窓・▶カーソル・ボタン・急ぎ札。文字はすべてドットで、言葉もひらがな多め",
      links: [
        { href: "/guild-look/c", label: "ホーム" },
        { href: "/guild-look/c/status", label: "ステータス" },
      ],
    },
    {
      key: "A",
      title: "A. ほどほど",
      note: "背景と窓はRPG風。見出し・数字・ボタンなど要所だけドット文字。本文は普通の字",
      links: [
        { href: "/guild-look/a", label: "ホーム" },
        { href: "/guild-look/a/status", label: "ステータス" },
      ],
    },
    {
      key: "B",
      title: "B. がっつり",
      note: "8bitcn の部品を使い、文字もすべてドット",
      links: [
        { href: "/guild-look/b", label: "ホーム" },
        { href: "/guild-look/b/status", label: "ステータス" },
      ],
    },
  ];

  return (
    <main className="min-h-screen bg-[#f6f5f1] px-4 py-10 font-[family-name:var(--font-jp-sans)] text-slate-900">
      <div className="mx-auto max-w-2xl">
        <p className="text-[10px] tracking-[0.3em] text-[#a88845]">LOOK</p>
        <h1 className="mt-1 text-2xl font-semibold">GIAの酒場 見た目の見比べ</h1>
        <p className="mt-2 text-sm text-slate-600">
          同じ内容を2つの濃さで作りました。中身は /guild の見本と同じ架空データです。
        </p>
        <div className="mt-6 space-y-3">
          {items.map((it) => (
            <section key={it.key} className="rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="font-semibold">{it.title}</h2>
              <p className="mt-1 text-sm text-slate-600">{it.note}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {it.links.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    className="rounded-lg bg-[#0f1f33] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1a3050]"
                  >
                    {l.label}
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
        <p className="mt-6 text-xs text-slate-500">
          いまの見た目は <Link href="/guild" className="underline underline-offset-4">/guild</Link> です。
        </p>
      </div>
    </main>
  );
}
