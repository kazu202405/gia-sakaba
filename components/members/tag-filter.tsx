"use client";

import { Tag } from "@/lib/types";
import { cn } from "@/lib/utils";

interface TagFilterProps {
  tags: Tag[];
  selectedTags: string[];
  onTagToggle: (tagId: string) => void;
}

const tagTypeLabels: Record<Tag["type"], string> = {
  industry: "業種",
  region: "地域",
  challenge: "課題",
  strength: "強み",
};

export function TagFilter({ tags, selectedTags, onTagToggle }: TagFilterProps) {
  // タグをタイプ別にグループ化
  const groupedTags = tags.reduce((acc, tag) => {
    if (!acc[tag.type]) {
      acc[tag.type] = [];
    }
    acc[tag.type].push(tag);
    return acc;
  }, {} as Record<Tag["type"], Tag[]>);

  return (
    <div className="space-y-4">
      {(Object.keys(groupedTags) as Tag["type"][]).map((type) => (
        <div key={type}>
          <h4 className="text-sm font-medium text-gray-500 mb-2">
            {tagTypeLabels[type]}
          </h4>
          <div className="flex flex-wrap gap-2">
            {groupedTags[type].map((tag) => {
              const isSelected = selectedTags.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  onClick={() => onTagToggle(tag.id)}
                  className={cn(
                    "px-3 py-1.5 text-sm rounded-full border transition-all",
                    isSelected
                      ? "bg-gray-900 text-white border-gray-900"
                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  )}
                >
                  {tag.name}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
