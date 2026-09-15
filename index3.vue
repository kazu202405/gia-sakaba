<template>
  <div class="gia-home">
    
    <!-- ===== Hero セクション ===== -->
    <section class="hero-section">
      <!-- // 差し替え: 背景画像を実際の画像に変更 -->
      <!-- <div class="hero-background" ref="heroBg"> -->
        <!-- CSS背景＋グラデで見た目を再現 -->
      <!-- </div> -->
      <video autoplay muted loop playsinline class="hero-video">
        <source src="/images/hero.mp4" type="video/mp4" />
      </video>
      <div class="hero-overlay"></div>
      
      <v-container fluid class="hero-container">
        <v-row justify="center" align="center" style="min-height: 100vh">
          <v-col cols="12" md="10" lg="8" class="text-center">
            
            <!-- メインコピー ここを追加 -->
            <h1 class="hero-title">
              心理学と仕組みで<br>人と組織が自然に育つ環境をデザイン<!-- <br class="d-md-none"> -->
            </h1>
            
            <!-- サブコピー ここを追加 -->
            <p class="hero-subtitle">
              成果を生むのは、仕組みと人の成長。<br>
              その力を、ともに引き出します。
            </p>
            
            <!-- Primary CTA ここを追加 -->
            <!-- <v-btn
              size="x-large"
              class="hero-cta mt-8 px-12"
              color="#1e40af"
              @click="scrollToContact"
            >
              無料相談する
              <v-icon end>mdi-arrow-right</v-icon>
            </v-btn> -->

            
          </v-col>
        </v-row>
      </v-container>
      
      <!-- SVG区切り（曲線） ここを追加 -->
      <div class="section-divider">
        <svg viewBox="0 0 1440 120" preserveAspectRatio="none">
          <path d="M0,60 C480,120 960,0 1440,60 L1440,120 L0,120 Z" fill="white"></path>
        </svg>
      </div>
    </section>

    <!-- ===== サービス セクション ===== -->
    <section class="services-section" id="services">
      <v-container class="narrow-container">
        
        <v-row justify="center" class="mb-16">
          <v-col cols="12" md="8" class="text-center">
            <!-- セクションタイトル ここを追加 -->
            <h2 class="section-title">私たちのサービス</h2>
            <p class="section-subtitle">
              人の想いや心理を大切にしながら、<br>
              人・仕組み・空間を整え、ビジネスが自然に成長する環境をデザインします。
            </p>
          </v-col>
        </v-row>
        
        <v-row>
          <!-- サービスカード1 -->
          <v-col cols="12" md="6" lg="4" class="mb-8">
            <v-card class="service-card" elevation="3" rounded="xl">
              <v-img
                src="/images/services/dx-system.jpg"
                alt="DX・システム開発"
                cover
                height="220"
                class="rounded-t-xl"
              />
              <v-card-text>
                <h3 class="service-title">DX・システム開発</h3>
                <p class="service-desc">
                  業務を整理し、ムダや属人化をなくす。<br>
                  ホームページ制作からWebアプリ開発、自動化・AI活用まで、仕組み化することで人にしかできない価値を最大化します。
                </p>
              </v-card-text>
            </v-card>
          </v-col>

          <!-- サービスカード2 -->
          <v-col cols="12" md="6" lg="4" class="mb-8">
            <v-card class="service-card" elevation="3" rounded="xl">
              <v-img
                src="/images/services/space-design.jpg"
                alt="空間・建築デザイン"
                cover
                height="220"
                class="rounded-t-xl"
              />
              <v-card-text>
                <h3 class="service-title">空間・建築デザイン</h3>
                <p class="service-desc">
                  そこにいる人の心地よさを大切にした空間づくり。<br>
                  内装・店舗設計・レジン造作まで、人の感情や動きに寄り添い、記憶に残る体験をデザインします。
                </p>
              </v-card-text>
            </v-card>
          </v-col>

          <!-- サービスカード3 -->
          <v-col cols="12" md="6" lg="4" class="mb-8">
            <v-card class="service-card" elevation="3" rounded="xl">
              <v-img
                src="/images/services/consulting.jpg"
                alt="伴走支援・コンサルティング"
                cover
                height="220"
                class="rounded-t-xl"
              />
              <v-card-text>
                <h3 class="service-title">伴走支援・コンサルティング</h3>
                <p class="service-desc">
                  人の感情や心理に寄り添い、対話を通じて組織の力を引き出す。<br>
                  業務改善から研修まで、自ら動ける組織づくりを支援します。
                </p>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
        
      </v-container>
    </section>

    <!-- ===== About セクション ===== -->
    <section class="about-section angled-section" id="about">
      <v-container>
        <v-row align="center">
          
          <v-col cols="12" md="6" class="mb-8 mb-md-0">
            <!-- // 差し替え: About画像 -->
            <div class="about-image">
              <v-img
                src="/images/about.jpg"
                alt="私たちについて"
                cover
                height="480"
                class="rounded-xl"
              />
            </div>
          </v-col>
          
          
          <v-col cols="12" md="6">
            <div class="about-content">
              <h2 class="section-title">私たちについて</h2>
              
              <p class="about-text">
                私たち株式会社Global Information Academy（GIA）は、<br>
                「人の力を引き出す」を合言葉に、システム開発と<br>
                心理学・脳科学の知見を融合させ、仕組みと人の成長の<br>
                両面からビジネスを支えるDXパートナーです。
              </p>
              <p class="about-text">
                単なる仕組みづくりではなく、経営者や現場の声に寄り添い、<br>
                人の力が最大限に活きる環境をともに築きます。<br>
                技術と心理の両面から、お客様のビジネスを次のステージへ導きます。
              </p>
              
              <v-btn
                variant="outlined"
                size="large"
                class="mt-6"
                color="#1e293b"
                @click="scrollToContact"
              >
                詳しく見る
                <v-icon end>mdi-arrow-right</v-icon>
              </v-btn>
            </div>
          </v-col>
          
        </v-row>
      </v-container>
    </section>

    <!-- ===== Works セクション ===== -->
    <section class="works-section" id="works">
      <v-container class="narrow-container">
        <v-row justify="center" class="mb-16">
          <v-col cols="12" md="8" class="text-center">
            <h2 class="section-title">実績</h2>
            <p class="section-subtitle">実際にお手伝いしたプロジェクトの事例とストーリーをいくつかご紹介します</p>
          </v-col>
        </v-row>

        <!-- データドリブンに変更：配列 works を v-for -->
        <v-row>
          <v-col
            v-for="(w, i) in works"
            :key="i"
            cols="12"
            md="4"
            class="mb-8"
          >
            <v-card class="work-card h-100" elevation="2">
              <!-- 画像 -->
              <div class="work-image">
                <v-img
                  :src="w.image"
                  :alt="w.title"
                  height="200"
                  cover
                />
                <div class="work-overlay">
                  <v-chip size="small" class="me-2" v-for="t in w.tags" :key="t" variant="flat">
                    {{ t }}
                  </v-chip>
                </div>
              </div>

              <!-- 本文 -->
              <v-card-text class="pt-4">
                <div class="text-subtitle-1 font-weight-bold">{{ w.industry }}</div>
                <h4 class="work-title mt-1">{{ w.title }}</h4>

                <p class="work-summary mt-2">
                  {{ w.summary }}
                </p>

                <!-- 成果（視認性UP：チップ） -->
                <div class="work-metrics mt-3">
                  <v-chip
                    v-for="(m, idx) in w.outcomes"
                    :key="idx"
                    size="small"
                    color="primary"
                    variant="tonal"
                    class="me-2 mb-2"
                  >
                    {{ m }}
                  </v-chip>
                </div>
              </v-card-text>

              <!-- CTA（任意） -->
              <!-- <v-card-actions class="pt-0">
                <v-btn variant="text" color="primary" :href="w.link ?? '#contact'" @click.prevent="scrollToContact">
                  詳細や類似案件の相談
                  <v-icon end>mdi-arrow-right</v-icon>
                </v-btn>
              </v-card-actions> -->
            </v-card>
          </v-col>
        </v-row>
      </v-container>
      <v-spacer style="height: 140px;px"></v-spacer>
      <!-- 波形は現状維持 -->
      <div class="section-divider">
        <svg viewBox="0 0 1440 120" preserveAspectRatio="none">
          <path d="M0,40 Q360,100 720,40 T1440,40 L1440,120 L0,120 Z" fill="#0f1f33"></path>
        </svg>
      </div>
    </section>

    <!-- ===== Contact セクション ===== -->
    <section class="contact-section" id="contact">
      <v-container>
        <v-row justify="center" align="center" style="min-height: 0vh">
          <!-- <v-col cols="12" md="8" lg="6" class="text-center">
            

            <h2 class="cta-title">まずは無料相談から</h2>
            <p class="cta-subtitle">
              お客様のビジネス課題をお聞かせください。<br>
              最適なソリューションをご提案いたします。
            </p>
            

            <v-card class="contact-form mt-10" elevation="0" rounded="lg">
              <v-card-text class="pa-8">
                <v-form @submit.prevent="submitForm">
                  
                  <v-text-field
                    v-model="formData.name"
                    label="お名前"
                    variant="outlined"
                    class="mb-4"
                    required
                  />
                  
                  <v-text-field
                    v-model="formData.email"
                    label="メールアドレス"
                    type="email"
                    variant="outlined"
                    class="mb-4"
                    required
                  />
                  
                  <v-textarea
                    v-model="formData.message"
                    label="お問い合わせ内容"
                    variant="outlined"
                    rows="4"
                    class="mb-6"
                  />
                  

                  <v-btn
                    type="submit"
                    size="x-large"
                    color="#1e40af"
                    block
                    class="submit-btn"
                  >
                    無料相談を申し込む
                    <v-icon end>mdi-send</v-icon>
                  </v-btn>
                  
                </v-form>
              </v-card-text>
            </v-card>
            
          </v-col> -->
        </v-row>
      </v-container>
    </section>

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

// レイアウト指定 ここを追加
definePageMeta({
  layout: 'default'
})

// ===== データ =====
const formData = ref({
  name: '',
  email: '',
  message: ''
})

// Hero背景要素のref ここを追加
const heroBg = ref<HTMLElement | null>(null)

// ===== メソッド =====
// スクロール処理 ここを追加
const scrollToContact = () => {
  const element = document.getElementById('contact')
  if (element) {
    element.scrollIntoView({ behavior: 'smooth' })
  }
}

// フォーム送信 ここを追加
const submitForm = () => {
  // // 差し替え: Supabase接続予定
  console.log('フォーム送信:', formData.value)
  alert('お問い合わせありがとうございます。追ってご連絡いたします。')
  
  // フォームリセット
  formData.value = {
    name: '',
    email: '',
    message: ''
  }
}

/* 実績データ：画像パスは /images/works に置く想定 */
const works = [
  {
    title: '査定・見積りの自動化と顧客育成の基盤づくり',
    industry: '飲食店専門の不動産会社',
    summary:
      '紙で行っていた査定・見積りをシステム化。顧客情報を一元管理し、顧客の育成フローも組み込み。現在は共同で、飲食店向けの共同サービスを構築中。',
    outcomes: ['査定・見積りの自動化', '顧客一元管理', '共同サービス展開'],
    tags: ['DX化', '業務自動化', '顧客育成'],
    image: '/images/works/work1.jpg',
  },
  {
    title: '営業データの一元化と見える化',
    industry: '省エネコンサルティング会社',
    summary:
      '上場企業もクライアントにもつ会社だったが、社内データが分散。顧客管理・営業管理を統合し、仕組みで経営・人材育成ができるようにサポート。',
    outcomes: ['データ一元化', 'ダッシュボード化', '営業育成の仕組み化'],
    tags: ['一元化', '営業管理', '顧客管理'],
    image: '/images/works/work2.jpg',
  },
  {
    title: 'AI活用で社内業務を効率化＋EC/HP支援',
    industry: '美容用品商社',
    summary:
      '業務フローにAIを導入することで社内の定型業務を効率化。また、ブランドの価値が伝わるホームページ制作も支援し、運用しやすい体制へ。',
    outcomes: ['AI導入', '業務効率化', 'HP制作'],
    tags: ['AI活用', '業務効率化', 'EC/HP'],
    image: '/images/works/work3.jpg',
  },
  {
    title: '申請業務の一元化とAIによる計画書作成',
    industry: '補助金申請会社',
    summary:
      'スプレッドシート/フォーム運用を脱却し、申請情報を一元管理。AIを組み合わせて事業計画書の下書きを自動生成、日常業務の効率化を実現。',
    outcomes: ['情報一元化', 'AIで計画書下書き', '業務効率化'],
    tags: ['一元化', 'AI活用', '申請業務'],
    image: '/images/works/work4.jpg',
  },
  {
    title: '経営の見える化と仕組み化の伴走支援',
    industry: '高圧電気工事会社（大阪メトロ等）',
    summary:
      '上場企業と仕事されている中でも事務作業が煩雑であった。AI活用だけでなく、経営の効率化・見える化・役割設計など"仕組み化"を中心に伴走。',
    outcomes: ['見える化', '役割設計', '運営体制の最適化'],
    tags: ['仕組み化', '経営効率', '伴走支援'],
    image: '/images/works/work5.jpg',
  },
  {
    title: '共同サービス構築に向けたDXの土台づくり',
    industry: '公共工事会社（自衛隊関連等）',
    summary:
      '航空・海上自衛隊の案件等、公共工事を扱う会社のDX化。将来の共同サービス展開を見据え、アライアンスを組み、工事会社のシステム化を進行中。',
    outcomes: ['DX基盤', 'アライアンス', '共同サービス準備'],
    tags: ['DX基盤', '公共', 'アライアンス'],
    image: '/images/works/work6.jpg',
  },
]

// ===== ライフサイクル =====
onMounted(() => {
  // パララックス効果（prefers-reduced-motion対応） ここを追加
  const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)')
  if (!mq || !mq.matches) {
    // passive: true で安全性＆パフォーマンス ここを変更
    window.addEventListener('scroll', handleParallax, { passive: true })
  }
})

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('scroll', handleParallax)
  }
})

// パララックス処理（安全なDOM参照） ここを変更
const handleParallax = () => {
  // ガードを強化 ここを追加
  if (typeof window === 'undefined') return
  const el = heroBg.value
  if (!el) return

  // 互換的に取得 ここを変更
  const scrolled =
    window.scrollY ?? window.pageYOffset ?? document.documentElement.scrollTop ?? 0

  el.style.transform = `translateY(${scrolled * 0.3}px)`
}
</script>

<style scoped>
/* ===== 基本設定 ===== */
.gia-home {
  font-family: 'Inter', 'Noto Sans JP', sans-serif;
  color: #1e293b;
  overflow-x: hidden;
}

/* ===== Hero セクション ===== */
.hero-section {
  position: relative;
  min-height: 80vh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}


.hero-container {
  position: relative;
  z-index: 2;
}

.hero-video {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: 0;   /* ← 一番下 */
}

.hero-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);   /* 薄暗い黒の透過（50%） */
  z-index: 1;   /* ← 動画より上、テキストより下 */
}

.hero-content {
  position: relative;
  z-index: 2;   /* ← 一番上に固定 */
  color: #1e293b; /* ネイビーで読みやすく */
}


.hero-title {
  font-size: clamp(56px, 8vw, 64px); /* H1=56–64px */
  font-weight: 800;
  line-height: 1.1;
  color: white;
  margin-bottom: 32px;
  letter-spacing: -1px;
}

.hero-subtitle {
  font-size: clamp(18px, 2.5vw, 20px); /* 本文16–18px */
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.7;
  font-weight: 600;
  margin-bottom: 0;
}

.hero-cta {
  font-size: 18px;
  font-weight: 600;
  letter-spacing: 0.5px;
  height: 56px;
  box-shadow: 0 4px 16px rgba(59, 130, 246, 0.3);
  transition: all 0.3s ease;
}

.hero-cta:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(59, 130, 246, 0.4);
}


/* ===== セクション共通 ===== */
.section-title {
  font-size: clamp(40px, 6vw, 48px);
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 24px;
  line-height: 1.2;
}

.section-subtitle {
  font-size: 18px;
  color: #64748b;
  line-height: 1.7;
  font-weight: 400;
}

.section-divider {
  position: absolute;
  bottom: -1px;
  left: 0;
  right: 0;
  height: 120px;
  overflow: hidden;
  z-index: 1;
}

.section-divider svg {
  width: 100%;
  height: 100%;
}

.section-divider.diagonal {
  top: -1px;
  bottom: auto;
}

.narrow-container {
  max-width: 1200px; /* 例：横幅を少し狭める */
  margin: 0 auto;
}


/* ===== サービス セクション ===== */
.services-section {
  padding: 120px 0 160px;
  background: white;
  position: relative;
}

.service-card {
  text-align: center;
  padding: 32px 24px;
  transition: transform 0.3s ease;
  height: 100%;
}

.service-card:hover {
  transform: translateY(-8px);
}

.service-image {
  margin-bottom: 32px;
}

.placeholder-image {
  width: 100%;
  height: 240px;
  background: linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%);
  border-radius: 12px;
  position: relative;
}

.placeholder-image::after {
  content: '📷';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 48px;
  opacity: 0.3;
}

.service-title {
  font-size: 24px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 16px;
}

.service-desc {
  font-size: 16px;
  color: #64748b;
  line-height: 1.6;
}

.service-card {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.service-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.08);
}

.service-title {
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 12px;
  color: #1e293b; /* 濃いネイビー */
}

.service-desc {
  font-size: 16px;
  color: #475569; /* グレー */
  line-height: 1.6;
}


/* ===== About セクション ===== */
.about-section {
  padding: 120px 0;
  background: #f8fafc;
  position: relative;
  overflow: hidden;
  border-radius: 0;
}

/* 画像カラム */
.about-image {
  position: relative;
  padding-right: 24px; /* デスクトップでの右余白 */
}

@media (max-width: 960px) {
  .about-image {
    padding-right: 0;     /* スマホでは詰める */
    margin-bottom: 24px;  /* 下に余白を追加 */
  }
}

/* プレースホルダ */
.large-placeholder {
  width: 100%;
  height: 480px;
  background: linear-gradient(135deg, #94a3b8 0%, #64748b 100%);
  border-radius: 16px;
  position: relative;
}

.large-placeholder::after {
  content: '🏢';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 80px;
  opacity: 0.4;
}

/* テキストカラム */
.about-content {
  padding-left: 24px; /* デスクトップでの左余白 */
  position: relative;
  z-index: 2;
}

.about-text {
  font-size: 18px;
  color: #475569;
  line-height: 1.8;
  margin-bottom: 24px;
}


/* ===== 三角ウェッジ装飾 ===== */
.angled-section {
  --wedge-from: rgba(59, 130, 246, 0.08);
  --wedge-to: rgba(30, 41, 59, 0.12);
  --wedge-w: min(34vw, 520px);
}

.angled-section::after {
  content: '';
  position: absolute;
  bottom: 0;
  right: 0;
  width: var(--wedge-w);
  height: var(--wedge-w);
  background: linear-gradient(135deg, var(--wedge-from) 0%, var(--wedge-to) 100%);
  clip-path: polygon(100% 0%, 100% 100%, 0% 100%);
  z-index: 0;
  pointer-events: none;
  aria-hidden: true;
  backdrop-filter: blur(8px);
  opacity: 0.9;
}

/* レスポンシブ対応 */
@media (max-width: 959px) {
  .angled-section {
    --wedge-w: min(28vw, 380px);
  }
}

@media (max-width: 599px) {
  .angled-section::after {
    display: none;
  }
}

/* ===== Works セクション ===== */
.works-section {
  background: #fff;
  padding: 100px 0 0;
  position: relative;
}

.work-card {
  border-radius: 16px;
  overflow: hidden;
  transition: transform .2s ease, box-shadow .2s ease;
}
.work-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(2, 6, 23, .08);
}

/* 画像＋タグ */
.work-image {
  position: relative;
}
.work-overlay {
  position: absolute;
  left: 12px;
  bottom: 12px;
}

/* テキスト */
.work-title {
  font-weight: 700;
  line-height: 1.4;
}
.work-summary {
  color: #475569;
  line-height: 1.7;
}

/* 文字数が増えたときに高さを保つための調整 */
.work-summary {
  display: -webkit-box;
  -webkit-line-clamp: 3;   /* 3行で省略 */
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* ===== Contact セクション ===== */
.contact-section {
  padding: 0px 0;
  background: #0f1f33;
  color: white;
}

.cta-title {
  font-size: clamp(36px, 6vw, 48px);
  font-weight: 700;
  margin-bottom: 24px;
}

.cta-subtitle {
  font-size: 18px;
  opacity: 0.9;
  line-height: 1.7;
}

.contact-form {
  background: white;
  max-width: 600px;
  margin: 0 auto;
}

.submit-btn {
  font-size: 18px;
  font-weight: 600;
  height: 56px;
  letter-spacing: 0.5px;
}

/* ===== レスポンシブ ===== */
@media (max-width: 960px) {
  .about-content {
    padding-left: 0;
    padding-top: 32px;
  }
  
  .section-divider {
    height: 80px;
  }
  
  .hero-section {
    min-height: 90vh;
  }
  
  .services-section,
  .about-section {
    padding: 80px 0;
  }
  
  .works-section {
    padding: 80px 0 0;
  }
  
  .contact-section {
    padding: 80px 0;
  }
}

@media (max-width: 600px) {
  .hero-cta {
    width: 100%;
    max-width: 320px;
  }
  
  .service-card {
    padding: 24px 16px;
  }
}

/* ===== アニメーション（prefers-reduced-motion対応） ===== */
@media (prefers-reduced-motion: reduce) {
  .hero-cta,
  .service-card,
  .work-card {
    transition: none;
  }
  
  .work-overlay {
    transform: translateY(0);
  }
}
</style>