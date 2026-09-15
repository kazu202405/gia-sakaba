"use client";

import { useState } from "react";
import type { Event, Series, ParticipantRole, Participant } from "../types";

interface CreateFormProps {
  myProfile: Participant;
  seriesList: Series[];
  onClose: () => void;
  onCreate: (event: Event) => void;
}

export default function CreateForm({
  myProfile,
  seriesList,
  onClose,
  onCreate,
}: CreateFormProps) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [selectedSeriesId, setSelectedSeriesId] = useState("");
  const [capacity, setCapacity] = useState("");

  const handleSubmit = () => {
    if (!title || !date) return;
    const newEvent: Event = {
      id: `e-new-${Date.now()}`,
      title,
      date,
      time: time || "未定",
      location: location || "未定",
      description,
      organizer: myProfile,
      participantCount: 1,
      capacity: capacity ? parseInt(capacity, 10) : null,
      participants: [
        { ...myProfile, role: "owner" as ParticipantRole },
      ],
      pendingParticipants: [],
      status: "upcoming",
      isHost: true,
      seriesId: selectedSeriesId || undefined,
    };
    onCreate(newEvent);
  };

  return (
    <div className="bg-white rounded-2xl border border-amber-200 shadow-sm p-6 sm:p-8 mb-6">
      <h2 className="text-base font-bold text-gray-900 mb-5">
        新しい会を作成
      </h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            タイトル <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例: 第13回 経営者グルメ会"
            className="block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              日付 <span className="text-red-400">*</span>
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              時間
            </label>
            <input
              type="text"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              placeholder="例: 19:00〜22:00"
              className="block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              場所
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="例: 鮨 まつもと（大阪・北新地）"
              className="block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              定員
            </label>
            <input
              type="number"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              placeholder="未設定（無制限）"
              min={1}
              className="block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            />
          </div>
        </div>

        {/* シリーズ紐付け */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            シリーズ（任意）
          </label>
          <select
            value={selectedSeriesId}
            onChange={(e) => setSelectedSeriesId(e.target.value)}
            className="block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent bg-white"
          >
            <option value="">シリーズなし（単発）</option>
            {seriesList.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            説明
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="会の趣旨や備考を記入..."
            className="block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none"
          />
        </div>
        <div className="flex gap-3 justify-end pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            キャンセル
          </button>
          <button
            onClick={handleSubmit}
            className="px-6 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-bold hover:bg-gray-800 transition-colors"
          >
            作成する
          </button>
        </div>
      </div>
    </div>
  );
}
