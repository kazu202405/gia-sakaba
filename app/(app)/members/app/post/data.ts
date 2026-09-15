import type { MyProfile, Series, Event } from "./types";

// --- 自分のプロフィール（主催者として使用） ---
export const myProfile: MyProfile = {
  id: "1",
  name: "田中 一郎",
  photoUrl:
    "https://images.unsplash.com/photo-1630572780329-e051273e980f?w=400&h=400&fit=crop&crop=face",
  company: "株式会社田中商事",
  position: "代表取締役",
  bio: "大阪で食品卸売業を営んでいます。異業種交流を通じて新しいビジネスチャンスを探しています。",
};

// --- シリーズモックデータ ---
export const seriesList: Series[] = [
  {
    id: "s1",
    name: "経営者グルメ会",
    description:
      "月1回、大阪の名店で食事をしながら経営者同士の交流を深める定例会です。",
    organizer: {
      id: "1",
      name: "田中 一郎",
      photoUrl:
        "https://images.unsplash.com/photo-1630572780329-e051273e980f?w=400&h=400&fit=crop&crop=face",
    },
    totalEvents: 12,
  },
  {
    id: "s2",
    name: "ワイン勉強会",
    description:
      "ソムリエを招いてワインの知識を深める不定期開催の勉強会シリーズです。",
    organizer: {
      id: "6",
      name: "渡辺 剛",
      photoUrl:
        "https://images.unsplash.com/photo-1590799159581-0ef74a3bac90?w=400&h=400&fit=crop&crop=face",
    },
    totalEvents: 3,
  },
];

// --- イベントモックデータ ---
export const initialEvents: Event[] = [
  {
    id: "e1",
    title: "第12回 経営者グルメ会",
    date: "2026-03-01",
    time: "19:00〜22:00",
    location: "鮨 まつもと（大阪・北新地）",
    description:
      "今回は北新地の名店で、メンバー同士の交流を深めます。初参加の方も歓迎です。",
    organizer: {
      id: "1",
      name: "田中 一郎",
      photoUrl:
        "https://images.unsplash.com/photo-1630572780329-e051273e980f?w=400&h=400&fit=crop&crop=face",
    },
    participantCount: 8,
    capacity: 10,
    participants: [
      {
        id: "1",
        name: "田中 一郎",
        photoUrl:
          "https://images.unsplash.com/photo-1630572780329-e051273e980f?w=400&h=400&fit=crop&crop=face",
        role: "owner",
      },
      {
        id: "3",
        name: "山本 恵美",
        photoUrl:
          "https://images.unsplash.com/photo-1613020092739-5d01102e080b?w=400&h=400&fit=crop&crop=face",
        role: "admin",
      },
      {
        id: "6",
        name: "渡辺 剛",
        photoUrl:
          "https://images.unsplash.com/photo-1590799159581-0ef74a3bac90?w=400&h=400&fit=crop&crop=face",
        role: "member",
      },
      {
        id: "10",
        name: "本田 浩二",
        photoUrl:
          "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face",
        role: "member",
      },
    ],
    pendingParticipants: [
      {
        id: "11",
        name: "高橋 真一",
        photoUrl:
          "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face",
        appliedAt: "2026-02-25",
        message: "初参加です。知人の紹介で申し込みました。",
      },
      {
        id: "12",
        name: "井上 美咲",
        photoUrl:
          "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=face",
        appliedAt: "2026-02-27",
        message: "飲食業界で経営しております。ぜひ参加したいです。",
      },
    ],
    status: "upcoming",
    isHost: true,
    seriesId: "s1",
  },
  {
    id: "e2",
    title: "新メンバー歓迎ランチ",
    date: "2026-03-08",
    time: "12:00〜14:00",
    location: "ビストロ マルシェ（大阪・中之島）",
    description:
      "今月入会した3名の歓迎ランチです。カジュアルな雰囲気でお互いを知る場にしましょう。",
    organizer: {
      id: "3",
      name: "山本 恵美",
      photoUrl:
        "https://images.unsplash.com/photo-1613020092739-5d01102e080b?w=400&h=400&fit=crop&crop=face",
    },
    participantCount: 6,
    capacity: 8,
    participants: [
      {
        id: "3",
        name: "山本 恵美",
        photoUrl:
          "https://images.unsplash.com/photo-1613020092739-5d01102e080b?w=400&h=400&fit=crop&crop=face",
        role: "owner",
      },
      {
        id: "7",
        name: "小川 理沙",
        photoUrl:
          "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop&crop=face",
        role: "member",
      },
      {
        id: "9",
        name: "藤田 舞",
        photoUrl:
          "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&h=400&fit=crop&crop=face",
        role: "member",
      },
    ],
    pendingParticipants: [],
    status: "upcoming",
    isHost: false,
  },
  {
    id: "e5",
    title: "経営者×士業 交流ディナー",
    date: "2026-03-22",
    time: "18:30〜21:30",
    location: "天ぷら 近藤（大阪・本町）",
    description:
      "弁護士・税理士・社労士など士業の方と経営者をつなぐ異業種交流会です。",
    organizer: {
      id: "5",
      name: "中村 明子",
      photoUrl:
        "https://images.unsplash.com/photo-1624091844772-554661d10173?w=400&h=400&fit=crop&crop=face",
    },
    participantCount: 12,
    capacity: 15,
    participants: [
      {
        id: "5",
        name: "中村 明子",
        photoUrl:
          "https://images.unsplash.com/photo-1624091844772-554661d10173?w=400&h=400&fit=crop&crop=face",
        role: "owner",
      },
      {
        id: "2",
        name: "佐藤 裕樹",
        photoUrl:
          "https://images.unsplash.com/photo-1619193597120-1d1edb42e34b?w=400&h=400&fit=crop&crop=face",
        role: "member",
      },
      {
        id: "4",
        name: "鈴木 健二",
        photoUrl:
          "https://images.unsplash.com/photo-1720467438431-c1b5659a933e?w=400&h=400&fit=crop&crop=face",
        role: "member",
      },
      {
        id: "8",
        name: "森田 駿",
        photoUrl:
          "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop&crop=face",
        role: "member",
      },
      {
        id: "6",
        name: "渡辺 剛",
        photoUrl:
          "https://images.unsplash.com/photo-1590799159581-0ef74a3bac90?w=400&h=400&fit=crop&crop=face",
        role: "member",
      },
    ],
    pendingParticipants: [],
    status: "upcoming",
    isHost: false,
  },
  {
    id: "e3",
    title: "第11回 経営者グルメ会",
    date: "2026-02-01",
    time: "19:00〜22:00",
    location: "割烹 田中（大阪・北新地）",
    description:
      "北新地の割烹で季節の食材を楽しみながら、事業の近況を共有しました。",
    organizer: {
      id: "1",
      name: "田中 一郎",
      photoUrl:
        "https://images.unsplash.com/photo-1630572780329-e051273e980f?w=400&h=400&fit=crop&crop=face",
    },
    participantCount: 10,
    capacity: 10,
    participants: [
      {
        id: "1",
        name: "田中 一郎",
        photoUrl:
          "https://images.unsplash.com/photo-1630572780329-e051273e980f?w=400&h=400&fit=crop&crop=face",
        role: "owner",
      },
      {
        id: "2",
        name: "佐藤 裕樹",
        photoUrl:
          "https://images.unsplash.com/photo-1619193597120-1d1edb42e34b?w=400&h=400&fit=crop&crop=face",
        role: "admin",
      },
      {
        id: "4",
        name: "鈴木 健二",
        photoUrl:
          "https://images.unsplash.com/photo-1720467438431-c1b5659a933e?w=400&h=400&fit=crop&crop=face",
        role: "member",
      },
      {
        id: "5",
        name: "中村 明子",
        photoUrl:
          "https://images.unsplash.com/photo-1624091844772-554661d10173?w=400&h=400&fit=crop&crop=face",
        role: "member",
      },
    ],
    pendingParticipants: [],
    status: "past",
    isHost: true,
    seriesId: "s1",
  },
  {
    id: "e4",
    title: "ワイン勉強会",
    date: "2026-01-20",
    time: "18:30〜21:00",
    location: "ワインバー CAVA（大阪・心斎橋）",
    description:
      "ソムリエを招いてのワイン勉強会。ビジネスシーンでのワイン選びを学びました。",
    organizer: {
      id: "6",
      name: "渡辺 剛",
      photoUrl:
        "https://images.unsplash.com/photo-1590799159581-0ef74a3bac90?w=400&h=400&fit=crop&crop=face",
    },
    participantCount: 5,
    capacity: null,
    participants: [
      {
        id: "6",
        name: "渡辺 剛",
        photoUrl:
          "https://images.unsplash.com/photo-1590799159581-0ef74a3bac90?w=400&h=400&fit=crop&crop=face",
        role: "owner",
      },
      {
        id: "8",
        name: "森田 駿",
        photoUrl:
          "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop&crop=face",
        role: "member",
      },
    ],
    pendingParticipants: [],
    status: "past",
    isHost: false,
    seriesId: "s2",
  },
  {
    id: "e6",
    title: "春の読書会＆ランチ",
    date: "2026-04-05",
    time: "11:00〜14:00",
    location: "カフェ 北浜レトロ（大阪・北浜）",
    description:
      "経営に役立つ本を持ち寄り、学びを共有するカジュアルな読書会です。",
    organizer: {
      id: "7",
      name: "小川 理沙",
      photoUrl:
        "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop&crop=face",
    },
    participantCount: 4,
    capacity: null,
    participants: [
      {
        id: "7",
        name: "小川 理沙",
        photoUrl:
          "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop&crop=face",
        role: "owner",
      },
      {
        id: "9",
        name: "藤田 舞",
        photoUrl:
          "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&h=400&fit=crop&crop=face",
        role: "member",
      },
    ],
    pendingParticipants: [],
    status: "upcoming",
    isHost: false,
  },
];
