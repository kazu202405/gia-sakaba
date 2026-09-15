"use client";

import { Search } from "lucide-react";

interface MemberSearchProps {
  value: string;
  onChange: (value: string) => void;
}

export function MemberSearch({ value, onChange }: MemberSearchProps) {
  return (
    <div className="relative">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
      <input
        type="text"
        placeholder="名前、職種、サービスで検索..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 transition-all"
      />
    </div>
  );
}
