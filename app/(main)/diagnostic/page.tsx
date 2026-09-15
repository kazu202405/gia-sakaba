import { Suspense } from "react";
import { Metadata } from "next";
import { DiagnosticApp } from "@/components/behavioral/diagnostic-app";

export const metadata: Metadata = {
  title: "仕組み化診断",
  description:
    "18問の設問で6領域をチェック。人の価値を最大化するために仕組み化すべきことが見えてきます。所要時間約3分、登録不要。",
};

export default function DiagnosticPage() {
  return (
    <Suspense>
      <DiagnosticApp />
    </Suspense>
  );
}
