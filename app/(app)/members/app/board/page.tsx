"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Send,
  Image as ImageIcon,
  Heart,
  MessageCircle,
  PartyPopper,
  Coffee,
  ImagePlus,
  Handshake,
  Dumbbell,
  Megaphone,
  ArrowUpRight,
  Plus,
  Star,
  Bookmark,
  Lightbulb,
  Music,
  Pencil,
  Trash2,
  X,
  RotateCcw,
  Check,
  type LucideIcon,
} from "lucide-react";

// アイコンマップ（文字列キー → コンポーネント）
const iconMap: Record<string, LucideIcon> = {
  PartyPopper,
  Coffee,
  ImagePlus,
  Handshake,
  Dumbbell,
  Megaphone,
  ArrowUpRight,
  MessageCircle,
  Star,
  Bookmark,
  Lightbulb,
  Music,
};

const iconKeys = Object.keys(iconMap);

// カラー候補
const colorOptions = [
  { key: "pink", class: "text-pink-500", bg: "bg-pink-500" },
  { key: "amber", class: "text-amber-500", bg: "bg-amber-500" },
  { key: "blue", class: "text-blue-500", bg: "bg-blue-500" },
  { key: "green", class: "text-green-500", bg: "bg-green-500" },
  { key: "purple", class: "text-purple-500", bg: "bg-purple-500" },
  { key: "red", class: "text-red-500", bg: "bg-red-500" },
  { key: "indigo", class: "text-indigo-500", bg: "bg-indigo-500" },
  { key: "teal", class: "text-teal-500", bg: "bg-teal-500" },
];

// チャンネルデータ型
interface ChannelData {
  id: string;
  name: string;
  iconKey: string;
  color: string;
}

// デフォルトチャンネル
const defaultChannels: ChannelData[] = [
  { id: "welcome", name: "新規ご入会挨拶", iconKey: "PartyPopper", color: "pink" },
  { id: "chat", name: "つぶやき・雑談", iconKey: "Coffee", color: "amber" },
  { id: "gallery", name: "みんなのギャラリー", iconKey: "ImagePlus", color: "blue" },
  { id: "exchange", name: "○○さんと交流しました", iconKey: "Handshake", color: "green" },
  { id: "club", name: "部活動：全", iconKey: "Dumbbell", color: "purple" },
  { id: "announce", name: "告知します！", iconKey: "Megaphone", color: "red" },
  { id: "referral", name: "紹介と依頼", iconKey: "ArrowUpRight", color: "indigo" },
];

const STORAGE_KEY = "gia-board-channels";

// localStorage読み書き
function loadChannels(): ChannelData[] {
  if (typeof window === "undefined") return defaultChannels;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultChannels;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    return defaultChannels;
  } catch {
    return defaultChannels;
  }
}

function saveChannels(channels: ChannelData[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(channels));
}

// カラーキーからtailwindクラスを取得
function getColorClass(colorKey: string): string {
  return colorOptions.find((c) => c.key === colorKey)?.class ?? "text-gray-500";
}

function getIconComponent(iconKey: string): LucideIcon {
  return iconMap[iconKey] ?? Star;
}

interface Post {
  id: string;
  channelId: string;
  author: {
    id: string;
    name: string;
    photoUrl: string;
    roleTitle: string;
  };
  content: string;
  imageUrl?: string;
  likes: number;
  comments: number;
  isLiked: boolean;
  postedAt: string;
}

// モックデータ
const mockPosts: Post[] = [
  {
    id: "p1",
    channelId: "welcome",
    author: { id: "a1", name: "高橋 美咲", photoUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop&crop=face", roleTitle: "Webデザイナー" },
    content: "はじめまして！Webデザイナーの高橋です。田中さんのご紹介で入会しました。大阪でフリーランスとして活動しています。皆さんとの交流を楽しみにしています！よろしくお願いします🙏",
    likes: 12,
    comments: 5,
    isLiked: true,
    postedAt: "2026-03-02 14:30",
  },
  {
    id: "p2",
    channelId: "welcome",
    author: { id: "a2", name: "松本 大輔", photoUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&crop=face", roleTitle: "不動産仲介業" },
    content: "初めまして、松本です！不動産仲介をやっております。鈴木さんからのご紹介です。物件のことならなんでもご相談ください。これからよろしくお願いします！",
    likes: 8,
    comments: 3,
    isLiked: false,
    postedAt: "2026-03-01 10:15",
  },
  {
    id: "p3",
    channelId: "chat",
    author: { id: "2", name: "佐藤 裕樹", photoUrl: "https://images.unsplash.com/photo-1619193597120-1d1edb42e34b?w=400&h=400&fit=crop&crop=face", roleTitle: "IT起業家" },
    content: "今日は梅田のスターバックスでリモートワーク中。新しいアプリのプロトタイプが完成しました！誰かレビューしてくれる人いませんか〜？",
    likes: 6,
    comments: 4,
    isLiked: false,
    postedAt: "2026-03-03 09:00",
  },
  {
    id: "p4",
    channelId: "chat",
    author: { id: "5", name: "中村 明子", photoUrl: "https://images.unsplash.com/photo-1624091844772-554661d10173?w=400&h=400&fit=crop&crop=face", roleTitle: "医師・クリニック経営" },
    content: "花粉の季節ですね...。今年は特にひどいそうです。対策はお早めに！ちなみにうちのクリニックでも花粉症の初診受け付けてますので、お気軽にどうぞ。",
    likes: 15,
    comments: 7,
    isLiked: true,
    postedAt: "2026-03-02 18:45",
  },
  {
    id: "p5",
    channelId: "gallery",
    author: { id: "7", name: "小川 理沙", photoUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop&crop=face", roleTitle: "デザイナー" },
    content: "先日手掛けたカフェの内装が完成しました！コンセプトは「光と木のぬくもり」。オーナーさんにもとても喜んでいただけて嬉しいです。",
    imageUrl: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800&h=600&fit=crop",
    likes: 24,
    comments: 8,
    isLiked: true,
    postedAt: "2026-03-01 16:20",
  },
  {
    id: "p6",
    channelId: "exchange",
    author: { id: "1", name: "田中 一郎", photoUrl: "https://images.unsplash.com/photo-1630572780329-e051273e980f?w=400&h=400&fit=crop&crop=face", roleTitle: "経営コンサルタント" },
    content: "本田さんと北新地の鮨まつもとで会食しました！飲食業界のリアルな話を聞けて、めちゃくちゃ勉強になりました。新メニュー開発のコラボも進みそうです。",
    likes: 18,
    comments: 6,
    isLiked: false,
    postedAt: "2026-03-01 22:00",
  },
  {
    id: "p7",
    channelId: "club",
    author: { id: "8", name: "森田 駿", photoUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop&crop=face", roleTitle: "人材紹介業" },
    content: "【ゴルフ部】今月の活動報告です⛳\n3/15（土）枚方カントリーで12名でラウンドしてきました。天気も最高で、スコアも...まあまあでした（笑）。来月は4/19を予定しています。初心者大歓迎です！",
    likes: 10,
    comments: 4,
    isLiked: false,
    postedAt: "2026-03-02 20:30",
  },
  {
    id: "p8",
    channelId: "announce",
    author: { id: "3", name: "山本 恵美", photoUrl: "https://images.unsplash.com/photo-1613020092739-5d01102e080b?w=400&h=400&fit=crop&crop=face", roleTitle: "オーナーシェフ" },
    content: "🎉 お知らせ！\n4月から北新地に2号店をオープンすることになりました。GIA Storiesメンバーさんにはプレオープンにご招待したいと思います。詳細は追ってお知らせしますので、お楽しみに！",
    likes: 32,
    comments: 14,
    isLiked: true,
    postedAt: "2026-03-03 12:00",
  },
  {
    id: "p9",
    channelId: "referral",
    author: { id: "4", name: "鈴木 健二", photoUrl: "https://images.unsplash.com/photo-1720467438431-c1b5659a933e?w=400&h=400&fit=crop&crop=face", roleTitle: "不動産デベロッパー" },
    content: "【紹介依頼】\n中之島エリアで50坪前後のオフィスを探しているクライアントがいます。リノベーション済みの物件があれば理想的です。心当たりのある方、DMいただけると嬉しいです！",
    likes: 5,
    comments: 3,
    isLiked: false,
    postedAt: "2026-03-02 11:00",
  },
  {
    id: "p10",
    channelId: "referral",
    author: { id: "6", name: "渡辺 剛", photoUrl: "https://images.unsplash.com/photo-1590799159581-0ef74a3bac90?w=400&h=400&fit=crop&crop=face", roleTitle: "ファイナンシャルアドバイザー" },
    content: "【ご紹介】\n先日お話しした事業承継のセミナー、4月に開催が決まりました。定員20名で、メンバーさん優先でご案内します。興味ある方はコメントかDMください！",
    likes: 9,
    comments: 5,
    isLiked: false,
    postedAt: "2026-03-01 15:30",
  },
];

export default function BoardPage() {
  const [channels, setChannels] = useState<ChannelData[]>(defaultChannels);
  const [activeChannel, setActiveChannel] = useState<string>("welcome");
  const [newPost, setNewPost] = useState("");
  const [posts, setPosts] = useState(mockPosts);
  const [showModal, setShowModal] = useState(false);

  // 新規追加フォーム
  const [newChName, setNewChName] = useState("");
  const [newChIcon, setNewChIcon] = useState("Star");
  const [newChColor, setNewChColor] = useState("blue");

  // 編集中のチャンネルID
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editIcon, setEditIcon] = useState("");
  const [editColor, setEditColor] = useState("");

  // localStorage読み込み（クライアントのみ）
  useEffect(() => {
    setChannels(loadChannels());
  }, []);

  // チャンネル変更時にlocalStorageへ保存
  const updateChannels = useCallback((next: ChannelData[]) => {
    setChannels(next);
    saveChannels(next);
  }, []);

  const channelPosts = useMemo(
    () => posts.filter((p) => p.channelId === activeChannel),
    [posts, activeChannel]
  );

  const activeChannelData = channels.find((c) => c.id === activeChannel);

  // アクティブチャンネルが削除された場合、先頭に戻す
  useEffect(() => {
    if (!activeChannelData && channels.length > 0) {
      setActiveChannel(channels[0].id);
    }
  }, [activeChannelData, channels]);

  const handleLike = (postId: string) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, isLiked: !p.isLiked, likes: p.isLiked ? p.likes - 1 : p.likes + 1 }
          : p
      )
    );
  };

  const handlePost = () => {
    if (!newPost.trim()) return;
    const post: Post = {
      id: `p${Date.now()}`,
      channelId: activeChannel,
      author: {
        id: "1",
        name: "田中 一郎",
        photoUrl: "https://images.unsplash.com/photo-1630572780329-e051273e980f?w=400&h=400&fit=crop&crop=face",
        roleTitle: "経営コンサルタント",
      },
      content: newPost,
      likes: 0,
      comments: 0,
      isLiked: false,
      postedAt: new Date().toLocaleString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).replace(/\//g, "-"),
    };
    setPosts((prev) => [post, ...prev]);
    setNewPost("");
  };

  // チャンネル追加
  const handleAddChannel = () => {
    const trimmed = newChName.trim();
    if (!trimmed) return;
    const id = `ch_${Date.now()}`;
    const next = [...channels, { id, name: trimmed, iconKey: newChIcon, color: newChColor }];
    updateChannels(next);
    setNewChName("");
    setNewChIcon("Star");
    setNewChColor("blue");
  };

  // チャンネル削除
  const handleDeleteChannel = (id: string) => {
    const next = channels.filter((c) => c.id !== id);
    updateChannels(next);
  };

  // 編集開始
  const startEdit = (ch: ChannelData) => {
    setEditingId(ch.id);
    setEditName(ch.name);
    setEditIcon(ch.iconKey);
    setEditColor(ch.color);
  };

  // 編集確定
  const confirmEdit = () => {
    if (!editingId || !editName.trim()) return;
    const next = channels.map((c) =>
      c.id === editingId ? { ...c, name: editName.trim(), iconKey: editIcon, color: editColor } : c
    );
    updateChannels(next);
    setEditingId(null);
  };

  // デフォルトに戻す
  const resetToDefault = () => {
    updateChannels(defaultChannels);
    setActiveChannel("welcome");
    setEditingId(null);
  };

  // activeChannelDataがない場合のフォールバック
  const currentIcon = activeChannelData ? getIconComponent(activeChannelData.iconKey) : Star;
  const currentColor = activeChannelData ? getColorClass(activeChannelData.color) : "text-gray-500";

  return (
    <div className="min-h-screen">
      {/* ヘッダー */}
      <div className="sticky top-0 z-10 bg-gray-50/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-gray-900">掲示板</h1>
            <span className="text-xs text-gray-400">
              {channelPosts.length}件の投稿
            </span>
          </div>

          {/* チャンネルタブ */}
          <div className="flex flex-wrap gap-2 items-center">
            {channels.map((ch) => {
              const Icon = getIconComponent(ch.iconKey);
              const colorCls = getColorClass(ch.color);
              const count = posts.filter((p) => p.channelId === ch.id).length;
              return (
                <button
                  key={ch.id}
                  onClick={() => setActiveChannel(ch.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border ${
                    activeChannel === ch.id
                      ? "bg-gray-900 text-white border-gray-900"
                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${activeChannel === ch.id ? "text-white" : colorCls}`} />
                  {ch.name}
                  {count > 0 && (
                    <span className={`text-[10px] ${activeChannel === ch.id ? "text-gray-300" : "text-gray-400"}`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
            {/* 管理ボタン */}
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-medium transition-colors bg-white text-gray-400 border border-gray-200 hover:border-gray-300 hover:text-gray-600"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6">

        {/* チャンネル管理モーダル */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => { setShowModal(false); setEditingId(null); }}
            />
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6 max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-sm font-bold text-gray-900">チャンネル管理</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={resetToDefault}
                    className="inline-flex items-center gap-1 text-[10px] text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    リセット
                  </button>
                  <button
                    onClick={() => { setShowModal(false); setEditingId(null); }}
                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* 既存チャンネル一覧 */}
              <div className="space-y-1.5 mb-5">
                {channels.map((ch) => {
                  const Icon = getIconComponent(ch.iconKey);
                  const colorCls = getColorClass(ch.color);
                  const isEditing = editingId === ch.id;

                  if (isEditing) {
                    return (
                      <div key={ch.id} className="p-3 bg-gray-50 rounded-xl space-y-2.5">
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                        />
                        <div className="flex flex-wrap gap-1">
                          {iconKeys.map((ik) => {
                            const Ic = iconMap[ik];
                            return (
                              <button
                                key={ik}
                                onClick={() => setEditIcon(ik)}
                                className={`p-1.5 rounded-md transition-colors ${
                                  editIcon === ik ? "bg-gray-900 text-white" : "bg-white text-gray-400 hover:text-gray-600 border border-gray-200"
                                }`}
                              >
                                <Ic className="w-3.5 h-3.5" />
                              </button>
                            );
                          })}
                        </div>
                        <div className="flex gap-1.5">
                          {colorOptions.map((co) => (
                            <button
                              key={co.key}
                              onClick={() => setEditColor(co.key)}
                              className={`w-5 h-5 rounded-full ${co.bg} transition-all ${
                                editColor === co.key ? "ring-2 ring-offset-1 ring-gray-900 scale-110" : "opacity-50 hover:opacity-80"
                              }`}
                            />
                          ))}
                        </div>
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => setEditingId(null)} className="px-3 py-1 text-xs text-gray-500 hover:bg-gray-200 rounded-lg transition-colors">
                            キャンセル
                          </button>
                          <button onClick={confirmEdit} className="px-3 py-1 text-xs bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors">
                            保存
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={ch.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded-xl transition-colors group">
                      <Icon className={`w-4 h-4 ${colorCls}`} />
                      <span className="text-sm text-gray-700 flex-1">{ch.name}</span>
                      <button
                        onClick={() => startEdit(ch)}
                        className="p-1.5 text-gray-300 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteChannel(ch.id)}
                        className="p-1.5 text-gray-300 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* 新規追加フォーム */}
              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs font-bold text-gray-500 mb-3">新規チャンネル追加</p>
                <div className="space-y-3">
                  <input
                    value={newChName}
                    onChange={(e) => setNewChName(e.target.value)}
                    placeholder="例: お知らせ"
                    className="w-full px-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 focus:bg-white transition-all"
                  />
                  <div>
                    <p className="text-[10px] text-gray-400 mb-1.5">アイコン</p>
                    <div className="flex flex-wrap gap-1.5">
                      {iconKeys.map((ik) => {
                        const Ic = iconMap[ik];
                        return (
                          <button
                            key={ik}
                            onClick={() => setNewChIcon(ik)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              newChIcon === ik ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-400 hover:text-gray-600 border border-gray-200"
                            }`}
                          >
                            <Ic className="w-4 h-4" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 mb-1.5">カラー</p>
                    <div className="flex gap-2">
                      {colorOptions.map((co) => (
                        <button
                          key={co.key}
                          onClick={() => setNewChColor(co.key)}
                          className={`w-6 h-6 rounded-full ${co.bg} transition-all ${
                            newChColor === co.key ? "ring-2 ring-offset-2 ring-gray-900 scale-110" : "opacity-50 hover:opacity-80"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  {newChName.trim() && (
                    <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-2">
                      <p className="text-[10px] text-gray-400">プレビュー:</p>
                      {(() => {
                        const PreviewIcon = getIconComponent(newChIcon);
                        return <PreviewIcon className={`w-4 h-4 ${getColorClass(newChColor)}`} />;
                      })()}
                      <span className="text-sm font-medium text-gray-700">{newChName.trim()}</span>
                    </div>
                  )}
                  <button
                    onClick={handleAddChannel}
                    disabled={!newChName.trim()}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-gray-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed w-full justify-center"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    追加
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 投稿フォーム */}
        <div className="py-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-start gap-3">
              <img
                src="https://images.unsplash.com/photo-1630572780329-e051273e980f?w=400&h=400&fit=crop&crop=face"
                alt=""
                className="w-9 h-9 rounded-full object-cover border-2 border-white shadow flex-shrink-0 mt-0.5"
              />
              <div className="flex-1">
                <textarea
                  value={newPost}
                  onChange={(e) => setNewPost(e.target.value)}
                  placeholder={`${activeChannelData?.name ?? "チャンネル"}に投稿...`}
                  rows={2}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent focus:bg-white transition-all resize-none"
                />
                <div className="flex items-center justify-between mt-2">
                  <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
                    <ImageIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handlePost}
                    disabled={!newPost.trim()}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-gray-900 text-white rounded-lg text-sm font-bold hover:bg-gray-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Send className="w-3.5 h-3.5" />
                    投稿
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 投稿一覧 */}
        <div className="space-y-4 pb-8">
          {channelPosts.length > 0 ? (
            <>
              {channelPosts.map((post) => (
                <div
                  key={post.id}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-all"
                >
                  <div className="flex gap-3">
                    <Link href={`/members/app/profile/${post.author.id}`}>
                      <img
                        src={post.author.photoUrl}
                        alt={post.author.name}
                        className="w-10 h-10 rounded-full object-cover border-2 border-white shadow hover:ring-2 hover:ring-amber-300 transition-all flex-shrink-0"
                      />
                    </Link>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Link
                          href={`/members/app/profile/${post.author.id}`}
                          className="text-sm font-bold text-gray-900 hover:text-amber-700 transition-colors"
                        >
                          {post.author.name}
                        </Link>
                        <span className="text-xs text-gray-400">
                          {post.author.roleTitle}
                        </span>
                        <span className="text-xs text-gray-300 ml-auto flex-shrink-0">
                          {post.postedAt}
                        </span>
                      </div>

                      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap mb-3">
                        {post.content}
                      </p>

                      {post.imageUrl && (
                        <div className="mb-3 rounded-xl overflow-hidden max-w-lg">
                          <img
                            src={post.imageUrl}
                            alt=""
                            className="w-full h-48 object-cover"
                          />
                        </div>
                      )}

                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => handleLike(post.id)}
                          className={`inline-flex items-center gap-1.5 text-xs transition-colors ${
                            post.isLiked
                              ? "text-pink-500"
                              : "text-gray-400 hover:text-pink-500"
                          }`}
                        >
                          <Heart
                            className={`w-4 h-4 ${post.isLiked ? "fill-current" : ""}`}
                          />
                          {post.likes}
                        </button>
                        <button className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors">
                          <MessageCircle className="w-4 h-4" />
                          {post.comments}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </>
          ) : (
            <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
              {(() => {
                const EmptyIcon = currentIcon;
                return (
                  <EmptyIcon
                    className={`w-10 h-10 mx-auto mb-3 ${currentColor} opacity-30`}
                  />
                );
              })()}
              <p className="text-sm text-gray-400">
                まだ投稿がありません
              </p>
              <p className="text-xs text-gray-300 mt-1">
                最初の投稿をしてみましょう
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
