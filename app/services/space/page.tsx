"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// GSAP プラグイン登録
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

// ============================================
// データ定義
// ============================================

const values = [
  {
    title: "自然美を宿す",
    desc: "花、苔、木、石。日本の四季が織りなす自然の美しさを、透明なレジンの中に永遠に宿します。",
    icon: "美",
  },
  {
    title: "唯一無二の造形",
    desc: "同じものは二つとない。自然の姿とレジンが出会うことで生まれる、世界にただ一つの作品を創り出します。",
    icon: "匠",
  },
  {
    title: "和の世界観",
    desc: "侘び寂びの心、余白の美学。日本人が大切にしてきた美意識を、現代の空間に調和させます。",
    icon: "和",
  },
];

const services = [
  { title: "内装デザイン", desc: "素材・色・光のバランスで心地よさを設計。和と洋、伝統と現代を融合させた空間表現を得意としています。" },
  { title: "店舗設計", desc: "ブランド体験と機能性を両立する空間構成。お客様の滞在体験を最大化する設計を行います。" },
  { title: "ゾーニング", desc: "人の流れと滞在を意識した配置設計。視線の抜けと溜まりを計算し、心地よい空間を創出します。" },
  { title: "レジン造作", desc: "空間体験を成立させるオリジナル造作物。唯一無二のカウンターやテーブルを制作。素材に想いを宿します。" },
  { title: "照明計画", desc: "視線誘導と雰囲気づくりの方向性を提案。光の陰影で空間に奥行きと表情を与えます。" },
  { title: "設計監修", desc: "施工会社と連携し、設計意図を忠実に実現。完成まで責任を持って伴走いたします。" },
];

const process = [
  { num: "01", title: "ご相談", desc: "イメージや想いをお聞かせください" },
  { num: "02", title: "素材選定", desc: "木材や封入物を一緒に選びます" },
  { num: "03", title: "デザイン", desc: "形・色・サイズをご提案します" },
  { num: "04", title: "制作", desc: "一点一点、丁寧に仕上げます" },
  { num: "05", title: "仕上げ", desc: "研磨・コーティングで完成へ" },
  { num: "06", title: "お届け", desc: "設置やアフターケアも対応" },
];

const cases = [
  {
    type: "レジンテーブル",
    location: "飲食店・オフィス向け",
    size: "オーダーメイド",
    purpose: "空間の主役となる唯一無二の家具を",
    approach: "天然木とレジンを融合し、川の流れや海の波を表現。お客様の想いや空間コンセプトをヒアリングし、色・形・封入物をカスタマイズ。",
    image: "/images/services/space/resin-table.png",
  },
  {
    type: "レジンアート",
    location: "店舗・住宅向け",
    size: "壁面・パネル",
    purpose: "壁面を彩るアート作品として",
    approach: "抽象的な色彩のグラデーションや、四季の彩りを取り入れたパネルアートを制作。空間のアクセントとして、またブランドの世界観を表現する装飾として。",
    image: "/images/services/space/resin-art.png",
  },
  {
    type: "レジンフロア",
    location: "店舗・商業施設向け",
    size: "床面施工",
    purpose: "足元から空間体験を演出",
    approach: "透明感のあるレジンで床面をコーティング。石や砂、ドライフラワーなどを封入し、歩くたびに発見のある床を実現。耐久性と美しさを両立。",
    image: "/images/services/space/resin-floor.png",
  },
];

const faqs = [
  {
    q: "オーダーメイドで制作できますか？",
    a: "はい、すべてオーダーメイドで制作しております。サイズ、形、色、封入するモチーフなど、お客様のご要望に合わせて一点一点お作りします。",
  },
  {
    q: "どんなものを封入できますか？",
    a: "木材、石、ドライフラワー、苔、貝殻、砂など様々なものを封入できます。思い出の品を封入したいというご相談も承っております。",
  },
  {
    q: "制作期間はどのくらいですか？",
    a: "作品の大きさや複雑さにより異なりますが、テーブルで1〜2ヶ月、アートパネルで2〜3週間程度が目安です。お急ぎの場合はご相談ください。",
  },
  {
    q: "設置や配送はしてもらえますか？",
    a: "全国配送に対応しております。大型作品の場合は設置までサポートいたします。配送料は作品サイズと地域により別途お見積りいたします。",
  },
  {
    q: "メンテナンスは必要ですか？",
    a: "日常的なお手入れは柔らかい布で拭くだけで大丈夫です。直射日光を避けていただければ、長く美しさを保てます。万が一の傷や修復もご相談ください。",
  },
];

// ============================================
// メインコンポーネント
// ============================================

export default function SpaceDesignPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // マウス追従（デスクトップのみ）
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({
        x: e.clientX / window.innerWidth,
        y: e.clientY / window.innerHeight,
      });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // GSAP アニメーション
  useEffect(() => {
    const ctx = gsap.context(() => {
      // Hero タイトルのフェードイン（fromToで明示的に状態指定）
      gsap.fromTo(".hero-title-line",
        { y: 50, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, ease: "power3.out", stagger: 0.1, force3D: true }
      );

      gsap.fromTo(".hero-subtitle",
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, ease: "power3.out", delay: 0.4, force3D: true }
      );

      gsap.fromTo(".hero-cta",
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, ease: "power3.out", delay: 0.6, force3D: true }
      );

      // 背景シェイプのアニメーション
      gsap.to(".floating-shape-1", {
        y: -30,
        x: 20,
        rotation: 15,
        duration: 8,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
      });

      gsap.to(".floating-shape-2", {
        y: 25,
        x: -15,
        rotation: -10,
        duration: 10,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
      });

      gsap.to(".floating-shape-3", {
        y: -20,
        x: -25,
        rotation: 8,
        duration: 12,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
      });

      // 円形の脈動
      gsap.to(".pulse-circle", {
        scale: 1.1,
        opacity: 0.3,
        duration: 4,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
        stagger: 1.5,
      });

      // Philosophy セクション - 波紋アニメーション
      gsap.to(".philosophy-ripple-1", {
        scale: 1.15,
        opacity: 0.8,
        duration: 6,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
      });

      gsap.to(".philosophy-ripple-2", {
        scale: 1.2,
        opacity: 0.7,
        duration: 8,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
      });

      // Philosophy セクション - 波アニメーション
      gsap.to(".philosophy-wave-1", {
        attr: { d: "M0,80 C240,130 480,30 720,80 C960,130 1200,30 1440,80 L1440,150 L0,150 Z" },
        duration: 4,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
      });

      gsap.to(".philosophy-wave-2", {
        attr: { d: "M0,100 C240,50 480,100 720,50 C960,100 1200,50 1440,100" },
        duration: 5,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
      });

      gsap.to(".philosophy-wave-3", {
        attr: { d: "M0,90 C240,140 480,90 720,140 C960,90 1200,140 1440,90" },
        duration: 6,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
      });

      // セクションごとのスクロールトリガー
      gsap.utils.toArray<HTMLElement>(".fade-section").forEach((section) => {
        gsap.fromTo(section,
          { y: 40, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.7,
            ease: "power2.out",
            force3D: true,
            scrollTrigger: {
              trigger: section,
              start: "top 90%",
              toggleActions: "play none none none",
            },
          }
        );
      });

      // カードのスタガーアニメーション
      gsap.utils.toArray<HTMLElement>(".stagger-cards").forEach((container) => {
        const cards = container.querySelectorAll(".card-item");
        gsap.fromTo(cards,
          { y: 30, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.5,
            stagger: 0.08,
            ease: "power2.out",
            force3D: true,
            scrollTrigger: {
              trigger: container,
              start: "top 85%",
              toggleActions: "play none none none",
            },
          }
        );
      });

      // プロセスラインアニメーション
      gsap.fromTo(".process-line",
        { scaleX: 0 },
        {
          scaleX: 1,
          duration: 0.8,
          ease: "power2.out",
          force3D: true,
          scrollTrigger: {
            trigger: ".process-line",
            start: "top 85%",
            toggleActions: "play none none none",
          },
        }
      );

      // 漢字アイコンのアニメーション（回転を削除してシンプルに）
      gsap.utils.toArray<HTMLElement>(".kanji-icon").forEach((icon) => {
        gsap.fromTo(icon,
          { scale: 0.8, opacity: 0 },
          {
            scale: 1,
            opacity: 1,
            duration: 0.5,
            ease: "power2.out",
            force3D: true,
            scrollTrigger: {
              trigger: icon,
              start: "top 90%",
              toggleActions: "play none none none",
            },
          }
        );
      });
    }, containerRef);

    // ScrollTriggerをリフレッシュ
    ScrollTrigger.refresh(true);

    return () => {
      ctx.revert();
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    };
  }, []);

  const handleContact = () => {
    window.location.href = "/contact";
  };

  return (
    <div ref={containerRef} className="relative bg-[#f7f6f3] text-[#2a2a28] overflow-hidden">
      {/* ===== SVG フィルター定義 ===== */}
      <svg className="absolute w-0 h-0">
        <defs>
          <filter id="noise">
            <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <filter id="blur-lg">
            <feGaussianBlur stdDeviation="60" />
          </filter>
        </defs>
      </svg>

      {/* ===== 1. Hero ===== */}
      <section ref={heroRef} className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* 背景レイヤー */}
        <div className="absolute inset-0">
          {/* 背景画像 */}
          <Image
            src="/images/services/space-design.jpg"
            alt="空間デザイン"
            fill
            className="object-cover"
            priority
          />
          {/* オーバーレイ */}
          <div className="absolute inset-0 bg-[#2a2a28]/40" />

          {/* 和紙風テクスチャ */}
          <div
            className="absolute inset-0 opacity-[0.04] mix-blend-multiply"
            style={{ filter: "url(#noise)" }}
          />

          {/* 和風装飾 - 波紋 */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid slice">
            {/* 波紋 - 左上 */}
            <g className="floating-shape-1" opacity="0.15">
              <circle cx={250 + (mousePos.x - 0.5) * 30} cy={200 + (mousePos.y - 0.5) * 30} r="80" fill="none" stroke="#ffffff" strokeWidth="0.5" />
              <circle cx={250 + (mousePos.x - 0.5) * 30} cy={200 + (mousePos.y - 0.5) * 30} r="120" fill="none" stroke="#ffffff" strokeWidth="0.5" />
              <circle cx={250 + (mousePos.x - 0.5) * 30} cy={200 + (mousePos.y - 0.5) * 30} r="160" fill="none" stroke="#ffffff" strokeWidth="0.5" />
            </g>
            {/* 波紋 - 右 */}
            <g className="floating-shape-2" opacity="0.12">
              <circle cx={750 - (mousePos.x - 0.5) * 20} cy={400 - (mousePos.y - 0.5) * 20} r="60" fill="none" stroke="#c9a86c" strokeWidth="0.5" />
              <circle cx={750 - (mousePos.x - 0.5) * 20} cy={400 - (mousePos.y - 0.5) * 20} r="100" fill="none" stroke="#c9a86c" strokeWidth="0.5" />
              <circle cx={750 - (mousePos.x - 0.5) * 20} cy={400 - (mousePos.y - 0.5) * 20} r="140" fill="none" stroke="#c9a86c" strokeWidth="0.5" />
            </g>
            {/* 青海波風パターン - 下部 */}
            <g className="floating-shape-3" opacity="0.1">
              <path d="M0,800 Q50,750 100,800 T200,800 T300,800 T400,800 T500,800" fill="none" stroke="#ffffff" strokeWidth="0.5" />
              <path d="M0,830 Q50,780 100,830 T200,830 T300,830 T400,830 T500,830" fill="none" stroke="#ffffff" strokeWidth="0.5" />
              <path d="M500,820 Q550,770 600,820 T700,820 T800,820 T900,820 T1000,820" fill="none" stroke="#c9a86c" strokeWidth="0.5" />
            </g>
            {/* 散りばめた円 - 花びら風 */}
            <circle className="pulse-circle" cx="850" cy="150" r="8" fill="#c9a86c" opacity="0.2" />
            <circle className="pulse-circle" cx="880" cy="180" r="6" fill="#c9a86c" opacity="0.15" />
            <circle className="pulse-circle" cx="820" cy="190" r="5" fill="#ffffff" opacity="0.15" />
            <circle className="pulse-circle" cx="100" cy="600" r="10" fill="#ffffff" opacity="0.1" />
            <circle className="pulse-circle" cx="130" cy="580" r="6" fill="#c9a86c" opacity="0.12" />
          </svg>
        </div>

        {/* コンテンツ */}
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          {/* ブランド名 */}
          <h1 className="hero-title-line font-[family-name:var(--font-noto-serif-jp)] text-4xl sm:text-5xl md:text-6xl lg:text-7xl tracking-[0.15em] text-[#c9a86c] mb-8 font-light">
            YAMATO RESIN
          </h1>
          <p className="hero-title-line font-[family-name:var(--font-noto-serif-jp)] text-xl sm:text-2xl md:text-3xl font-light tracking-wide text-white/90 leading-relaxed mb-5">
            日本の美を、<span className="text-[#c9a86c]">空間</span>に宿す。
          </p>
          <p className="hero-subtitle text-base sm:text-lg text-white/80 leading-loose max-w-2xl mx-auto mb-14">
            四季の移ろい、自然の息吹、和の心。
            <br />
            ヤマトレジンは、日本の美意識を
            <br className="sm:hidden" />
            空間そのものへと昇華させます。
          </p>
          <div className="hero-cta flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleContact}
              className="group px-10 py-4 bg-white text-[#2a2a28] text-sm tracking-[0.15em] rounded-none hover:bg-[#c9a86c] transition-all duration-500 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 relative overflow-hidden"
            >
              <span className="relative z-10">無料相談する</span>
              <div className="absolute inset-0 bg-gradient-to-r from-[#c9a86c]/30 to-transparent translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-500" />
            </button>
            <button
              onClick={() => document.getElementById("process")?.scrollIntoView({ behavior: "smooth" })}
              className="px-10 py-4 border border-white/50 text-white text-sm tracking-[0.15em] rounded-none hover:border-white hover:bg-white/10 transition-all duration-500 focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2"
            >
              相談の流れを見る
            </button>
          </div>
        </div>

        {/* スクロールインジケーター */}
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4">
          <span className="text-[10px] tracking-[0.3em] text-white/60 writing-vertical">SCROLL</span>
          <div className="w-px h-12 bg-gradient-to-b from-white/50 to-transparent relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1/2 bg-[#c9a86c] animate-scroll-line" />
          </div>
        </div>

        {/* 波形ディバイダー */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 80" preserveAspectRatio="none" className="w-full h-16 sm:h-20">
            <path d="M0,60 C360,80 720,40 1080,55 C1260,62 1380,65 1440,60 L1440,80 L0,80 Z" fill="#f7f6f3" />
          </svg>
        </div>
      </section>

      {/* ===== 2. コンセプト ===== */}
      <section className="py-28 sm:py-36 bg-[#f7f6f3] relative">
        {/* 背景装飾 */}
        <div className="absolute top-20 right-10 w-32 h-32 border border-[#2a2a28]/5 rounded-full" />
        <div className="absolute bottom-20 left-10 w-24 h-24 border border-[#9e3d3f]/5" style={{ transform: "rotate(45deg)" }} />

        <div className="max-w-3xl mx-auto px-6">
          <div className="fade-section text-center">
            <p className="text-xs tracking-[0.4em] text-[#9e3d3f] mb-8 font-medium">CONCEPT</p>
            <h2 className="font-[family-name:var(--font-noto-serif-jp)] text-2xl sm:text-3xl md:text-4xl font-light text-[#2a2a28] leading-relaxed mb-10">
              <span className="text-[#9e3d3f]">素材</span>と向き合い、
              <br />
              <span className="text-[#9e3d3f]">空間</span>と調和する。
            </h2>
            <div className="w-12 h-px bg-[#2a2a28]/20 mx-auto mb-10" />
            <p className="text-[#5a5a58] leading-[2.2] text-sm sm:text-base">
              一つとして同じものがない自然の表情。
              <br />
              その木目、石の表情、花の色彩を活かしながら、
              <br />
              置かれる空間に溶け込み、引き立てる。
              <br />
              素材と空間、両方への敬意が私たちのものづくりです。
            </p>
          </div>
        </div>
      </section>

      {/* ===== 3. 提供価値 ===== */}
      <section className="py-28 sm:py-36 bg-[#2a2a28] relative overflow-hidden">
        {/* 和紙風テクスチャ */}
        <div
          className="absolute inset-0 opacity-[0.05] mix-blend-overlay"
          style={{ filter: "url(#noise)" }}
        />

        {/* 装飾 - 波紋（右上） */}
        <svg className="philosophy-ripple-1 absolute -top-10 -right-10 w-[400px] h-[400px]" viewBox="0 0 400 400">
          <circle cx="200" cy="200" r="60" fill="none" stroke="#c9a86c" strokeWidth="1" opacity="0.15" />
          <circle cx="200" cy="200" r="100" fill="none" stroke="#c9a86c" strokeWidth="1" opacity="0.12" />
          <circle cx="200" cy="200" r="140" fill="none" stroke="#c9a86c" strokeWidth="1" opacity="0.09" />
          <circle cx="200" cy="200" r="180" fill="none" stroke="#c9a86c" strokeWidth="1" opacity="0.06" />
        </svg>

        {/* 装飾 - 波紋（左下） */}
        <svg className="philosophy-ripple-2 absolute -bottom-20 -left-20 w-[350px] h-[350px]" viewBox="0 0 350 350">
          <circle cx="175" cy="175" r="50" fill="none" stroke="#9e3d3f" strokeWidth="1" opacity="0.25" />
          <circle cx="175" cy="175" r="90" fill="none" stroke="#9e3d3f" strokeWidth="1" opacity="0.18" />
          <circle cx="175" cy="175" r="130" fill="none" stroke="#9e3d3f" strokeWidth="1" opacity="0.12" />
        </svg>

        {/* 装飾 - 波（下部） */}
        <svg className="absolute bottom-0 left-0 w-full h-[150px]" viewBox="0 0 1440 150" preserveAspectRatio="none">
          <path
            className="philosophy-wave-1"
            d="M0,100 C240,150 480,50 720,100 C960,150 1200,50 1440,100 L1440,150 L0,150 Z"
            fill="none"
            stroke="#c9a86c"
            strokeWidth="1"
            opacity="0.15"
          />
          <path
            className="philosophy-wave-2"
            d="M0,80 C240,130 480,30 720,80 C960,130 1200,30 1440,80"
            fill="none"
            stroke="#c9a86c"
            strokeWidth="1"
            opacity="0.1"
          />
          <path
            className="philosophy-wave-3"
            d="M0,120 C240,70 480,120 720,70 C960,120 1200,70 1440,120"
            fill="none"
            stroke="#9e3d3f"
            strokeWidth="1.5"
            opacity="0.2"
          />
        </svg>

        <div className="max-w-5xl mx-auto px-6 relative z-10">
          <div className="fade-section text-center mb-20">
            <p className="text-xs tracking-[0.4em] text-[#c9a86c] mb-4 font-medium">PHILOSOPHY</p>
            <h2 className="font-[family-name:var(--font-noto-serif-jp)] text-2xl sm:text-3xl font-light text-white">
              ヤマトレジンの哲学
            </h2>
          </div>

          <div className="stagger-cards grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 items-stretch">
            {values.map((v, i) => (
              <div
                key={i}
                className="card-item group flex flex-col p-10 sm:p-12 bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 hover:border-[#c9a86c]/30 transition-all duration-500 min-h-[320px]"
              >
                <div className="kanji-icon w-16 h-16 flex items-center justify-center text-3xl font-light text-[#c9a86c] mb-8 border border-[#c9a86c]/30 group-hover:border-[#c9a86c]/50 transition-all duration-500">
                  {v.icon}
                </div>
                <h3 className="text-lg font-medium text-white mb-4 tracking-wide">{v.title}</h3>
                <p className="text-sm text-white/70 leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== 4. 事例 ===== */}
      <section className="py-28 sm:py-36 bg-[#f7f6f3] relative overflow-hidden">
        {/* 背景装飾 */}
        <div className="absolute inset-0 pointer-events-none">
          <svg className="absolute top-20 left-10 w-64 h-64 opacity-[0.03]" viewBox="0 0 200 200">
            <circle cx="100" cy="100" r="80" fill="none" stroke="#2a2a28" strokeWidth="0.5" />
            <circle cx="100" cy="100" r="60" fill="none" stroke="#2a2a28" strokeWidth="0.5" />
            <circle cx="100" cy="100" r="40" fill="none" stroke="#2a2a28" strokeWidth="0.5" />
          </svg>
          <svg className="absolute bottom-20 right-10 w-48 h-48 opacity-[0.03]" viewBox="0 0 200 200">
            <rect x="40" y="40" width="120" height="120" fill="none" stroke="#9e3d3f" strokeWidth="0.5" transform="rotate(15 100 100)" />
            <rect x="60" y="60" width="80" height="80" fill="none" stroke="#9e3d3f" strokeWidth="0.5" transform="rotate(15 100 100)" />
          </svg>
        </div>

        <div className="max-w-5xl mx-auto px-6 relative z-10">
          <div className="fade-section text-center mb-20">
            <p className="text-xs tracking-[0.4em] text-[#9e3d3f] mb-4 font-medium">YAMATO RESIN</p>
            <h2 className="font-[family-name:var(--font-noto-serif-jp)] text-2xl sm:text-3xl font-light text-[#2a2a28] mb-6">
              ヤマトレジンの世界
            </h2>
            <p className="text-sm text-[#5a5a58] leading-relaxed">
              ただのレジンではない。
              <br />
              日本の自然と四季の美、和の世界観を宿し、
              <br />
              空間そのものを作品へと昇華させます。
            </p>
          </div>

          <div className="stagger-cards grid grid-cols-1 md:grid-cols-3 gap-6">
            {cases.map((c, i) => (
              <div
                key={i}
                className="card-item group bg-white border border-[#2a2a28]/5 hover:border-[#9e3d3f]/20 transition-all duration-500 overflow-hidden"
              >
                {/* 画像 */}
                <div className="relative h-48 overflow-hidden">
                  <Image
                    src={c.image}
                    alt={c.type}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>

                <div className="p-8">
                  <div className="flex items-center justify-between mb-4">
                    <span className="px-3 py-1 text-xs tracking-wider text-[#f7f6f3] bg-[#2a2a28]">
                      {c.type}
                    </span>
                    <span className="text-[10px] text-[#5a5a58]">{c.location}</span>
                  </div>

                  <p className="text-xs text-[#9e3d3f] mb-4">{c.size}</p>

                  <div className="space-y-4">
                    <div>
                      <p className="text-[10px] tracking-[0.2em] text-[#5a5a58]/70 mb-1">目的</p>
                      <p className="text-sm text-[#2a2a28]">{c.purpose}</p>
                    </div>
                    <div className="w-full h-px bg-[#2a2a28]/10" />
                    <div>
                      <p className="text-[10px] tracking-[0.2em] text-[#5a5a58]/70 mb-1">工夫</p>
                      <p className="text-sm text-[#5a5a58] leading-relaxed">{c.approach}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== 5. サービス内容 ===== */}
      {/* 一時的に非表示
      <section className="py-28 sm:py-36 bg-[#f7f6f3] relative">
        <div className="max-w-5xl mx-auto px-6">
          <div className="fade-section text-center mb-20">
            <p className="text-xs tracking-[0.4em] text-[#9e3d3f] mb-4 font-medium">SERVICE</p>
            <h2 className="font-[family-name:var(--font-noto-serif-jp)] text-2xl sm:text-3xl font-light text-[#2a2a28]">
              サービス内容
            </h2>
          </div>

          <div className="stagger-cards grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {services.map((s, i) => (
              <div
                key={i}
                className="card-item group h-full flex flex-col p-8 bg-white border border-[#2a2a28]/5 hover:border-[#9e3d3f]/30 hover:shadow-xl hover:shadow-[#2a2a28]/5 transition-all duration-500"
              >
                <div className="flex items-baseline gap-3 mb-4">
                  <span className="text-2xl font-light text-[#9e3d3f]/40 group-hover:text-[#9e3d3f] transition-colors duration-500">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="text-base font-medium text-[#2a2a28]">{s.title}</h3>
                </div>
                <p className="text-sm text-[#5a5a58] leading-relaxed flex-grow">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      */}

      {/* ===== 6. プロセス ===== */}
      <section id="process" className="py-28 sm:py-36 bg-[#e8e4dd] relative overflow-hidden">
        {/* 背景の円弧 */}
        <svg className="absolute top-0 left-1/2 -translate-x-1/2 w-[200%] h-full opacity-5" viewBox="0 0 1000 500" preserveAspectRatio="none">
          <circle cx="500" cy="800" r="600" fill="none" stroke="#2a2a28" strokeWidth="1" />
          <circle cx="500" cy="900" r="700" fill="none" stroke="#2a2a28" strokeWidth="0.5" />
        </svg>

        <div className="max-w-6xl mx-auto px-6 relative z-10">
          <div className="fade-section text-center mb-20">
            <p className="text-xs tracking-[0.4em] text-[#9e3d3f] mb-4 font-medium">PROCESS</p>
            <h2 className="font-[family-name:var(--font-noto-serif-jp)] text-2xl sm:text-3xl font-light text-[#2a2a28]">
              制作の流れ
            </h2>
          </div>

          {/* プロセスライン（PC） */}
          <div className="hidden lg:block relative mb-16">
            <div className="process-line absolute top-6 left-[8%] right-[8%] h-px bg-[#2a2a28]/20 origin-left" />
          </div>

          <div className="stagger-cards grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6 lg:gap-4">
            {process.map((p, i) => (
              <div key={i} className="card-item text-center relative">
                <div className="relative z-10">
                  <span className="inline-flex items-center justify-center w-12 h-12 text-lg font-light text-[#f7f6f3] bg-[#2a2a28] rounded-full mb-6">
                    {p.num}
                  </span>
                  <h3 className="text-sm font-medium text-[#2a2a28] mb-2">{p.title}</h3>
                  <p className="text-xs text-[#5a5a58] leading-relaxed">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== 7. CTA ===== */}
      <section className="py-32 sm:py-40 bg-[#2a2a28] relative overflow-hidden">
        {/* 背景装飾 */}
        <div className="absolute inset-0">
          <svg className="absolute top-0 right-0 w-1/2 h-full opacity-5" viewBox="0 0 500 500">
            <circle cx="400" cy="100" r="200" fill="none" stroke="#f7f6f3" strokeWidth="0.5" />
            <circle cx="450" cy="400" r="150" fill="none" stroke="#f7f6f3" strokeWidth="0.5" />
          </svg>
          <svg className="absolute bottom-0 left-0 w-1/3 h-full opacity-5" viewBox="0 0 300 500">
            <rect x="50" y="100" width="100" height="100" fill="none" stroke="#f7f6f3" strokeWidth="0.5" transform="rotate(15 100 150)" />
          </svg>
        </div>

        <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
          <div className="fade-section">
            <p className="text-xs tracking-[0.4em] text-[#c9a86c] mb-8 font-medium">CONTACT</p>
            <h2 className="font-[family-name:var(--font-noto-serif-jp)] text-2xl sm:text-3xl md:text-4xl font-light text-[#f7f6f3] leading-relaxed mb-8">
              あなたの想いを、
              <br />
              かたちにする。
            </h2>
            <p className="text-[#f7f6f3]/60 text-sm leading-loose mb-14">
              「こんなテーブルが欲しい」「この思い出を形に残したい」
              <br />
              そんな想いをお聞かせください。
              <br />
              一つひとつの作品は、対話から生まれます。
            </p>
            <button
              onClick={handleContact}
              className="group px-14 py-5 bg-[#c9a86c] text-[#2a2a28] text-sm tracking-[0.2em] rounded-none hover:bg-[#f7f6f3] transition-all duration-500 focus:outline-none focus:ring-2 focus:ring-[#c9a86c] focus:ring-offset-2 focus:ring-offset-[#2a2a28] relative overflow-hidden"
            >
              <span className="relative z-10">ご相談・お問い合わせ</span>
            </button>
          </div>
        </div>
      </section>

      {/* ===== 8. FAQ ===== */}
      <section className="py-28 sm:py-36 bg-white">
        <div className="max-w-3xl mx-auto px-6">
          <div className="fade-section text-center mb-16">
            <p className="text-xs tracking-[0.4em] text-[#9e3d3f] mb-4 font-medium">FAQ</p>
            <h2 className="font-[family-name:var(--font-noto-serif-jp)] text-2xl sm:text-3xl font-light text-[#2a2a28]">
              よくあるご質問
            </h2>
          </div>

          <div className="space-y-0">
            {faqs.map((faq, i) => (
              <div key={i} className="border-b border-[#2a2a28]/10">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-start gap-4 py-6 text-left focus:outline-none group"
                  aria-expanded={openFaq === i}
                >
                  <span className="text-sm font-medium text-[#9e3d3f] mt-0.5">Q.</span>
                  <span className="flex-1 text-sm sm:text-base text-[#2a2a28] group-hover:text-[#9e3d3f] transition-colors duration-300">
                    {faq.q}
                  </span>
                  <span className="text-xl text-[#5a5a58] transition-transform duration-300" style={{ transform: openFaq === i ? "rotate(45deg)" : "rotate(0)" }}>
                    +
                  </span>
                </button>
                <div
                  className="overflow-hidden transition-all duration-500"
                  style={{ maxHeight: openFaq === i ? "300px" : "0", opacity: openFaq === i ? 1 : 0 }}
                >
                  <div className="pb-6 pl-8">
                    <p className="text-sm text-[#5a5a58] leading-relaxed">{faq.a}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== カスタムスタイル ===== */}
      <style jsx>{`
        .writing-vertical {
          writing-mode: vertical-rl;
          text-orientation: mixed;
        }
        @keyframes scroll-line {
          0% {
            transform: translateY(-100%);
          }
          100% {
            transform: translateY(200%);
          }
        }
        .animate-scroll-line {
          animation: scroll-line 1.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
