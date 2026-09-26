"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

function Message({ children }: { children: React.ReactNode }) {
  const params = useSearchParams();
  if (!params.has("auth_error")) return null;
  return <p role="alert" className="border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{children}</p>;
}

export function AuthLinkError({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={null}><Message>{children}</Message></Suspense>;
}
