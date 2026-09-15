import type { Metadata } from "next";
import { EdlRevealObserver } from "@/components/ui/edl-reveal";

export const metadata: Metadata = {
  title: "Founder's Note",
  description:
    "AIに任せ、時間を、人にしかできないことへ。GIA代表が、なぜこの仕事をしているのかを綴った私的なノート。",
  alternates: { canonical: "/founder" },
};

export default function FounderPage() {
  return (
    <div className="edl-root bg-[var(--edl-off-white)] text-[var(--edl-body)]">
      <EdlRevealObserver />

      {/* Hero — タイトル一行 */}
      <section className="relative pt-32 md:pt-44 pb-24 md:pb-32 px-6 md:px-16 border-b border-[var(--edl-line)]">
        <div className="max-w-[920px] mx-auto">
          <span className="edl-eyebrow edl-reveal mb-7">Founder&apos;s Note</span>
          <h1
            className="edl-headline edl-reveal mb-10 edl-jp-keep"
            data-delay="1"
            style={{ fontSize: "clamp(34px, 4.4vw, 60px)", lineHeight: 1.4 }}
          >
            AIに任せ、<br />
            時間を、<br />
            <span className="accent">人にしかできないこと</span>へ
            <span className="period">.</span>
          </h1>
          <p
            className="edl-reveal max-w-[44ch] text-[14px] tracking-[0.04em] text-[var(--edl-muted)]"
            data-delay="2"
            style={{ lineHeight: 2 }}
          >
            なぜ、この仕事をしているのか。
          </p>
        </div>
      </section>

      {/* Scene 01 — 営業の現場で */}
      <section className="py-24 md:py-32 px-6 md:px-16 border-b border-[var(--edl-line)]">
        <div className="max-w-[760px] mx-auto">
          <span className="edl-section-num edl-reveal">01 — 営業の現場で</span>
          <h2
            className="edl-headline edl-reveal mt-5 mb-12 edl-jp-keep"
            data-delay="1"
            style={{ fontSize: "clamp(24px, 2.8vw, 36px)" }}
          >
            結局これは、<br />
            <span className="accent">人の繋がり</span>なんだな
            <span className="period">.</span>
          </h2>

          <div
            className="edl-reveal text-[15px] leading-[2.1] tracking-[0.02em] space-y-8"
            data-delay="2"
          >
            <p>
              私はもともと、長く営業の世界にいました。
              商材も会社も色々変わったけれど、ずっと変わらず効いていたのは
              「<strong className="edl-hl">紹介</strong>」でした。
            </p>
            <p>
              商談の組み方も、提案書の出来も、もちろん大事。
              でも振り返ってみると、本当に物事を動かしていたのは
              「この人をあの人に会わせたい」と誰かが思ってくれた、その一瞬だった。
              数字や仕組みじゃなくて、ものすごく人間的な意思が、結局いちばん強い。
            </p>
            <p className="text-[var(--edl-muted)]">
              ああ、結局これは人の繋がりなんだな──
              <br />
              営業を続けながら、何度もそう思っていました。
            </p>
          </div>
        </div>
      </section>

      {/* Scene 02 — 三年前（dark：物語の山場として暗く沈める） */}
      <section className="py-24 md:py-32 px-6 md:px-16 bg-[var(--edl-navy)] text-white border-b border-[var(--edl-line-dark)]">
        <div className="max-w-[760px] mx-auto">
          <span className="edl-section-num on-dark edl-reveal">02 — 三年前</span>
          <h2
            className="edl-headline on-dark edl-reveal mt-5 mb-12 edl-jp-keep"
            data-delay="1"
            style={{ fontSize: "clamp(24px, 2.8vw, 36px)" }}
          >
            画面の中で、<br />
            処理が<span className="accent">勝手に進んでいく</span>
            <span className="period">.</span>
          </h2>

          <div
            className="edl-reveal text-[15px] text-white/85 leading-[2.1] tracking-[0.02em] space-y-8"
            data-delay="2"
          >
            <p>転機は、あるエンジニアとの出会いでした。</p>
            <p>
              AIで何ができるか、自分が作っているシステムがどう動くか。
              彼に見せてもらったとき、画面の中で処理がどんどん勝手に進んでいくのに衝撃を受けました。
              これまで人が時間をかけて手で叩いていた作業が、一瞬で完了していく。
            </p>
            <p>
              そこで思ったんです。
              <br />
              AIに仕事を奪われる、じゃない。{" "}
              <strong className="font-semibold text-[var(--edl-gold-soft)]">
                AIに任せていい仕事はAIに任せて、人にしかできないことに時間を返せばいい。
              </strong>
            </p>
            <p>
              営業時代にずっと感じていた「人にしかできない瞬間」を、
              もう一度ちゃんと取り戻せる時代になった。
              そう思った瞬間に、いまの仕事が始まりました。
            </p>
          </div>
        </div>
      </section>

      {/* Scene 03 — 今 */}
      <section className="py-24 md:py-32 px-6 md:px-16 border-b border-[var(--edl-line)]">
        <div className="max-w-[760px] mx-auto">
          <span className="edl-section-num edl-reveal">03 — 今</span>
          <h2
            className="edl-headline edl-reveal mt-5 mb-12 edl-jp-keep"
            data-delay="1"
            style={{ fontSize: "clamp(24px, 2.8vw, 36px)" }}
          >
            楽になった誰かが、<br />
            <span className="accent">ふっと笑ってくれる</span>
            <span className="period">.</span>
          </h2>

          <div
            className="edl-reveal text-[15px] leading-[2.1] tracking-[0.02em] space-y-8"
            data-delay="2"
          >
            <p>
              GIAでやっているのは、経営者の方の隣に立って、
              会社の仕事を一つずつ軽くしていくこと。
            </p>
            <p>
              アプリを作りながら、「これが動いたら、この人のこの作業はもうなくなるな」
              と見える瞬間がある。
              それが回って、現場が楽になり、社長の頭がひとつ空く。
              空いたぶんだけ、人と話す時間や、考えるべきことに頭を使う時間が戻る。
            </p>
            <p>
              楽になった誰かが、ふっと笑ってくれる。
              <br />
              たぶん私は、その瞬間のためにこの仕事をしているんだと思います。
            </p>
          </div>
        </div>
      </section>

      {/* Closing — このページを開いてくれているあなたへ（on dark）
          末尾なので edl-section-fade-deep でFooter(navy-deep)に向けて滲ませる */}
      <section className="py-28 md:py-40 px-6 md:px-16 edl-section-fade-deep text-white">
        <div className="max-w-[760px] mx-auto">
          <span className="edl-section-num on-dark edl-reveal">
            04 — このページを開いてくれているあなたへ
          </span>
          <h2
            className="edl-headline on-dark edl-reveal mt-5 mb-14 edl-jp-keep"
            data-delay="1"
            style={{ fontSize: "clamp(24px, 2.8vw, 36px)" }}
          >
            最後まで残るのは、<br />
            <span className="accent">人間の感覚</span>だと思う
            <span className="period">.</span>
          </h2>

          <div
            className="edl-reveal text-[15px] text-white/85 leading-[2.1] tracking-[0.02em] space-y-8"
            data-delay="2"
          >
            <p>
              もし、誰かの紹介でここを開いてくれているなら。
              それ自体が、私がずっと信じてきたことの、ひとつの証明みたいなものです。
            </p>
            <p>
              AIがどれだけ進んでも、最後まで残るのは
              <br />
              「この人をあの人に会わせたい」という、人間の感覚。
              <br />
              その感覚が動いてくれた結果、いまあなたはここにいる。
            </p>
            <p>
              そのことに、まずお礼を言わせてください。
              <br />
              そして、もしご縁があれば、ぜひ一度お話ししましょう。
            </p>
          </div>

          {/* 手書きサイン
              暫定で会社名のみ表示（氏名はテキストでは出さない方針＝検索流入回避）。
              手書きサイン画像準備でき次第、下の <p> を
              <Image src="/images/founder-signature.png" alt="signature" .../>
              に差し替え。 */}
          <div
            className="edl-reveal mt-16 pt-10 border-t border-white/15"
            data-delay="3"
          >
            <p className="font-[family-name:var(--font-en)] text-[10px] tracking-[0.32em] text-[var(--edl-gold-soft)] mb-6">
              SIGNATURE
            </p>
            <p className="font-[family-name:var(--font-mincho)] text-white/85 text-base md:text-lg tracking-[0.04em] leading-[1.6]">
              株式会社 Global Information Academy
            </p>
          </div>

          {/* CTA */}
          <div
            className="edl-reveal mt-16 flex flex-col items-start gap-5"
            data-delay="4"
          >
            <a
              href="https://page.line.me/131liqrt"
              target="_blank"
              rel="noopener noreferrer"
              className="edl-cta-primary line"
            >
              LINEで一度お話しする
              <span className="arrow" />
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
