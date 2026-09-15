"use client";

import { useState, useMemo } from "react";
import { MemberCard } from "./member-card";
import { MemberSearch } from "./member-search";
import { TagFilter } from "./tag-filter";
import { searchMembers, tags } from "@/lib/mock-data";
import { Filter, X } from "lucide-react";

export function MembersList() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const filteredMembers = useMemo(() => {
    return searchMembers(searchQuery, selectedTags);
  }, [searchQuery, selectedTags]);

  const handleTagToggle = (tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    );
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedTags([]);
  };

  const hasActiveFilters = searchQuery || selectedTags.length > 0;

  return (
    <div>
      {/* Search and Filter Controls */}
      <div className="mb-8 space-y-4">
        <div className="flex gap-3">
          <div className="flex-1">
            <MemberSearch value={searchQuery} onChange={setSearchQuery} />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-3 rounded-xl border transition-all flex items-center gap-2 ${
              showFilters || selectedTags.length > 0
                ? "bg-gray-900 text-white border-gray-900"
                : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
            }`}
          >
            <Filter className="h-5 w-5" />
            <span className="hidden sm:inline">フィルター</span>
            {selectedTags.length > 0 && (
              <span className="bg-white text-gray-900 text-xs px-2 py-0.5 rounded-full">
                {selectedTags.length}
              </span>
            )}
          </button>
        </div>

        {/* Tag Filters */}
        {showFilters && (
          <div className="p-5 bg-gray-50 rounded-xl border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">タグで絞り込み</h3>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
                >
                  <X className="h-4 w-4" />
                  クリア
                </button>
              )}
            </div>
            <TagFilter
              tags={tags}
              selectedTags={selectedTags}
              onTagToggle={handleTagToggle}
            />
          </div>
        )}
      </div>

      {/* Results count */}
      <div className="mb-6">
        <p className="text-sm text-gray-500">
          {filteredMembers.length}名のメンバーが見つかりました
        </p>
      </div>

      {/* Members Grid */}
      {filteredMembers.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMembers.map((member) => (
            <MemberCard key={member.id} member={member} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <p className="text-gray-500 mb-4">
            条件に一致するメンバーが見つかりませんでした
          </p>
          <button
            onClick={clearFilters}
            className="text-gray-900 underline hover:no-underline"
          >
            フィルターをクリア
          </button>
        </div>
      )}
    </div>
  );
}
