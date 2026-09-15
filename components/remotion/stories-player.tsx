"use client";

import { Player } from "@remotion/player";
import { GiaStoriesIntro, GIA_STORIES_VIDEO_CONFIG } from "./gia-stories-video";

export function StoriesVideoPlayer() {
  const { fps, durationInFrames, width, height } = GIA_STORIES_VIDEO_CONFIG;

  return (
    <section className="py-16 sm:py-24 bg-gradient-to-b from-white to-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <span className="inline-block text-sm font-medium text-amber-700 bg-amber-50 px-4 py-1.5 rounded-full mb-4">
            GIA Stories とは
          </span>
          <h2
            className="text-3xl sm:text-4xl font-bold text-slate-800 mb-4"
            style={{ fontFamily: "'Noto Serif JP', serif" }}
          >
            案内動画
          </h2>
          <p className="text-lg text-slate-500">
            信頼でつながるストーリープラットフォーム。
          </p>
        </div>
        <div className="rounded-2xl overflow-hidden shadow-2xl shadow-black/10 border border-gray-200">
          <Player
            component={GiaStoriesIntro}
            compositionWidth={width}
            compositionHeight={height}
            durationInFrames={durationInFrames}
            fps={fps}
            autoPlay
            loop
            style={{
              width: "100%",
              aspectRatio: `${width} / ${height}`,
            }}
            controls
          />
        </div>
      </div>
    </section>
  );
}
