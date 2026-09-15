"use client";

import { Settings, Bell } from "lucide-react";
import type { Event, Series } from "../types";

interface HostSummaryProps {
  events: Event[];
  seriesList: Series[];
  followedSeriesIds: Set<string>;
  onToggleFollowSeries: (id: string) => void;
  onManageEvent: (id: string) => void;
}

export default function HostSummary({
  events,
  seriesList,
  followedSeriesIds,
  onToggleFollowSeries,
  onManageEvent,
}: HostSummaryProps) {
  const hostEvents = events.filter((e) => e.isHost && e.status === "upcoming");
  const totalPending = hostEvents.reduce(
    (sum, e) => sum + e.pendingParticipants.length,
    0
  );

  return (
    <div className="space-y-4">
      {/* 主催イベントサマリー */}
      {hostEvents.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <h3 className="text-xs font-bold text-gray-500 mb-3 uppercase tracking-wider">
            主催イベント
          </h3>
          {totalPending > 0 && (
            <div className="mb-3 px-3 py-2 bg-red-50 border border-red-100 rounded-xl text-xs text-red-700 font-medium">
              {totalPending}件の参加申請があります
            </div>
          )}
          <div className="space-y-2">
            {hostEvents.map((event) => (
              <button
                key={event.id}
                onClick={() => onManageEvent(event.id)}
                className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-colors text-left group"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {event.title}
                  </p>
                  <p className="text-[11px] text-gray-400">{event.date}</p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {event.pendingParticipants.length > 0 && (
                    <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                      {event.pendingParticipants.length}
                    </span>
                  )}
                  <Settings className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* フォロー中のシリーズ */}
      {seriesList.filter((s) => followedSeriesIds.has(s.id)).length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <h3 className="text-xs font-bold text-gray-500 mb-3 uppercase tracking-wider">
            フォロー中のシリーズ
          </h3>
          <div className="space-y-2">
            {seriesList
              .filter((s) => followedSeriesIds.has(s.id))
              .map((series) => (
                <div
                  key={series.id}
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {series.name}
                    </p>
                    <p className="text-[11px] text-gray-400">
                      全{series.totalEvents}回
                    </p>
                  </div>
                  <button
                    onClick={() => onToggleFollowSeries(series.id)}
                    className="p-1.5 rounded-lg bg-indigo-50 text-indigo-500 hover:bg-indigo-100 transition-colors"
                    title="フォロー解除"
                  >
                    <Bell className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
