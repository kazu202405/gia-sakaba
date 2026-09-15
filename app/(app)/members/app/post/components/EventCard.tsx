"use client";

import { useState } from "react";
import {
  CalendarDays,
  MapPin,
  Clock,
  Users,
  Check,
  Settings,
  Repeat,
  Bell,
  BellOff,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from "lucide-react";
import type { Event, Series } from "../types";

interface EventCardProps {
  event: Event;
  isJoined: boolean;
  seriesList: Series[];
  followedSeriesIds: Set<string>;
  managingEventId: string | null;
  allEvents: Event[];
  onToggleJoin: (eventId: string) => void;
  onSetManagingEventId: (id: string | null) => void;
  onToggleFollowSeries: (seriesId: string) => void;
}

export default function EventCard({
  event,
  isJoined,
  seriesList,
  followedSeriesIds,
  managingEventId,
  allEvents,
  onToggleJoin,
  onSetManagingEventId,
  onToggleFollowSeries,
}: EventCardProps) {
  const [expandedSeries, setExpandedSeries] = useState(false);

  const isUpcoming = event.status === "upcoming";
  const isFull =
    event.capacity !== null && event.participantCount >= event.capacity;
  const isManaging = managingEventId === event.id;

  const series = event.seriesId
    ? seriesList.find((s) => s.id === event.seriesId)
    : null;

  const seriesEvents = series
    ? allEvents
        .filter((e) => e.seriesId === series.id)
        .sort((a, b) => b.date.localeCompare(a.date))
    : [];

  return (
    <div
      className={`bg-white rounded-2xl border shadow-sm p-5 hover:shadow-md transition-all ${
        isUpcoming ? "border-amber-200" : "border-gray-100"
      }`}
    >
      {/* タイトル行 */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <h4 className="text-base font-bold text-gray-900">{event.title}</h4>
          {event.isHost && (
            <span className="px-2 py-0.5 rounded-full bg-gray-900 text-white text-[10px] font-bold">
              主催
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {isFull && isUpcoming && (
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold">
              <AlertCircle className="w-3 h-3" />
              満員
            </span>
          )}
          {isUpcoming && !isFull && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[11px] font-bold">
              開催予定
            </span>
          )}
        </div>
      </div>

      {/* シリーズバッジ */}
      {series && (
        <div className="mb-3">
          <button
            onClick={() => setExpandedSeries(!expandedSeries)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-medium hover:bg-indigo-100 transition-colors"
          >
            <Repeat className="w-3 h-3" />
            {series.name}（全{series.totalEvents}回）
            {expandedSeries ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
          </button>

          {expandedSeries && (
            <div className="mt-3 p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <h5 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                    <Repeat className="w-4 h-4 text-indigo-500" />
                    {series.name}
                  </h5>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                    {series.description}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFollowSeries(series.id);
                  }}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex-shrink-0 ${
                    followedSeriesIds.has(series.id)
                      ? "bg-indigo-600 text-white hover:bg-indigo-700"
                      : "bg-white border border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                  }`}
                >
                  {followedSeriesIds.has(series.id) ? (
                    <>
                      <Bell className="w-3.5 h-3.5" />
                      フォロー中
                    </>
                  ) : (
                    <>
                      <BellOff className="w-3.5 h-3.5" />
                      フォローする
                    </>
                  )}
                </button>
              </div>

              <div className="flex items-center gap-2 mb-3 text-xs text-gray-500">
                <img
                  src={series.organizer.photoUrl}
                  alt={series.organizer.name}
                  className="w-5 h-5 rounded-full object-cover border border-white shadow"
                />
                主催:{" "}
                <span className="font-medium text-gray-700">
                  {series.organizer.name}
                </span>
              </div>

              <h6 className="text-[11px] font-bold text-gray-500 mb-2">
                開催履歴
              </h6>
              <div className="space-y-1.5">
                {seriesEvents.map((se) => (
                  <div
                    key={se.id}
                    className={`flex items-center gap-3 p-2 rounded-lg text-xs ${
                      se.id === event.id
                        ? "bg-white border border-indigo-200 font-bold"
                        : "hover:bg-white/60"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                        se.status === "upcoming" ? "bg-amber-500" : "bg-gray-300"
                      }`}
                    />
                    <span className="text-gray-500 w-20 flex-shrink-0">
                      {se.date}
                    </span>
                    <span className="text-gray-900 flex-1 truncate">
                      {se.title}
                    </span>
                    <span className="text-gray-400 flex-shrink-0">
                      {se.participantCount}人
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 日時・場所 */}
      <div className="space-y-1.5 text-sm text-gray-600 mb-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <span>{event.date}</span>
          <Clock className="w-4 h-4 text-gray-400 ml-2 flex-shrink-0" />
          <span>{event.time}</span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <span>{event.location}</span>
        </div>
      </div>

      {/* 説明 */}
      {event.description && (
        <p className="text-sm text-gray-500 leading-relaxed mb-4">
          {event.description}
        </p>
      )}

      {/* 主催者 */}
      <div className="flex items-center gap-2 mb-3 text-sm text-gray-600">
        <img
          src={event.organizer.photoUrl}
          alt={event.organizer.name}
          className="w-6 h-6 rounded-full object-cover border border-white shadow"
        />
        <span className="text-xs text-gray-500">
          主催:{" "}
          <span className="font-medium text-gray-700">
            {event.organizer.name}
          </span>
        </span>
      </div>

      {/* 参加者 + ボタン */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <div className="flex -space-x-2">
            {event.participants.slice(0, 4).map((p) => (
              <img
                key={p.id}
                src={p.photoUrl}
                alt={p.name}
                className="w-7 h-7 rounded-full object-cover border-2 border-white shadow"
              />
            ))}
            {event.participants.length > 4 && (
              <span className="w-7 h-7 rounded-full bg-gray-100 border-2 border-white shadow flex items-center justify-center text-[10px] font-bold text-gray-500">
                +{event.participants.length - 4}
              </span>
            )}
          </div>
          <span className="text-xs text-gray-500">
            <Users className="w-3.5 h-3.5 inline mr-0.5" />
            {event.participantCount}人参加
            {event.capacity && (
              <span className={isFull ? "text-red-400" : "text-gray-400"}>
                {" "}
                / {event.capacity}人
              </span>
            )}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {event.isHost && (
            <button
              onClick={() =>
                onSetManagingEventId(isManaging ? null : event.id)
              }
              className={`relative inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                isManaging
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              管理
              {event.pendingParticipants.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                  {event.pendingParticipants.length}
                </span>
              )}
            </button>
          )}
          {isUpcoming &&
            (isFull && !isJoined ? (
              <span className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-gray-100 text-gray-400 cursor-not-allowed">
                満員
              </span>
            ) : (
              <button
                onClick={() => onToggleJoin(event.id)}
                className={`inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  isJoined
                    ? "bg-green-100 text-green-700 hover:bg-green-200"
                    : "bg-amber-500 text-white hover:bg-amber-600"
                }`}
              >
                {isJoined ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    参加済み
                  </>
                ) : (
                  "参加する"
                )}
              </button>
            ))}
        </div>
      </div>

    </div>
  );
}
