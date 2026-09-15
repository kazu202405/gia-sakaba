"use client";

import { useState } from "react";
import { Camera, Building2, Briefcase, User, MessageSquare, X } from "lucide-react";
import type { MyProfile, Event } from "../types";

interface JoinModalProps {
  event: Event;
  profile: MyProfile;
  onClose: () => void;
  onConfirm: (eventId: string, comment: string, editedProfile: MyProfile) => void;
}

export default function JoinModal({
  event,
  profile,
  onClose,
  onConfirm,
}: JoinModalProps) {
  const [name, setName] = useState(profile.name);
  const [company, setCompany] = useState(profile.company);
  const [position, setPosition] = useState(profile.position);
  const [bio, setBio] = useState(profile.bio);
  const [comment, setComment] = useState("");

  const handleSubmit = () => {
    const editedProfile: MyProfile = {
      ...profile,
      name,
      company,
      position,
      bio,
    };
    onConfirm(event.id, comment, editedProfile);
  };

  const isFull =
    event.capacity !== null && event.participantCount >= event.capacity;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full sm:max-w-md max-h-[90vh] overflow-y-auto bg-white rounded-t-2xl sm:rounded-2xl shadow-xl">
        {/* ヘッダー */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <h2 className="text-base font-bold text-gray-900">参加申請</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* イベント情報 */}
          <div className="p-3.5 bg-amber-50 border border-amber-100 rounded-xl">
            <p className="text-sm font-bold text-gray-900">{event.title}</p>
            <p className="text-xs text-gray-500 mt-1">
              {event.date}　{event.time}　{event.location}
            </p>
            {isFull && (
              <p className="text-xs text-red-600 font-medium mt-1.5">
                ※ 定員に達しています（キャンセル待ちになる場合があります）
              </p>
            )}
          </div>

          {/* プロフィール確認・編集 */}
          <div>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
              プロフィール確認
            </h3>
            <p className="text-[11px] text-gray-400 mb-3">
              主催者に表示される情報です。必要に応じて修正できます。
            </p>

            {/* アイコン表示 */}
            <div className="flex items-center gap-3 mb-4">
              <div className="relative">
                <img
                  src={profile.photoUrl}
                  alt={name}
                  className="w-14 h-14 rounded-full object-cover border-2 border-white shadow"
                />
                <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-gray-100 border border-white flex items-center justify-center">
                  <Camera className="w-3 h-3 text-gray-400" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate">
                  {name}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {company && position
                    ? `${company} / ${position}`
                    : company || position || ""}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {/* 名前 */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1">
                  <User className="w-3.5 h-3.5 text-gray-400" />
                  名前
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="block w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
              </div>

              {/* 会社名 */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1">
                  <Building2 className="w-3.5 h-3.5 text-gray-400" />
                  会社名
                </label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="block w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
              </div>

              {/* 役職 */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1">
                  <Briefcase className="w-3.5 h-3.5 text-gray-400" />
                  役職
                </label>
                <input
                  type="text"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  className="block w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
              </div>

              {/* 自己紹介 */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1">
                  <User className="w-3.5 h-3.5 text-gray-400" />
                  自己紹介
                </label>
                <textarea
                  rows={2}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="block w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none"
                />
              </div>
            </div>
          </div>

          {/* 一言コメント */}
          <div>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
              主催者へのひとこと
            </h3>
            <div className="relative">
              <MessageSquare className="absolute left-3 top-3 w-4 h-4 text-gray-300" />
              <textarea
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="参加の動機や自己紹介など（任意）"
                className="block w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none"
              />
            </div>
            <p className="text-[11px] text-gray-400 mt-1.5">
              主催者の管理画面に表示されます
            </p>
          </div>
        </div>

        {/* フッターボタン */}
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-5 py-4 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            キャンセル
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim()}
            className="flex-1 px-4 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-bold hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            参加を申請する
          </button>
        </div>
      </div>
    </div>
  );
}
