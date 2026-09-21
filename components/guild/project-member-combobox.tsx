"use client";

import { useId, useState } from "react";
import type { Profile } from "@/lib/guild/types";
import { filterProjectMembers } from "@/lib/guild/project-member-search";

export function ProjectMemberCombobox({ members, label, selectedMemberId, onChange, disabled }: {
  members: Profile[];
  label: string;
  selectedMemberId: string | null;
  onChange: (label: string, memberId: string | null) => void;
  disabled: boolean;
}) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const matches = filterProjectMembers(members, selectedMemberId ? "" : label);
  const visible = matches.slice(0, 30);

  function select(member: Profile) {
    onChange(member.display_name, member.id);
    setOpen(false);
    setActive(-1);
  }

  return <div className="relative min-w-0 flex-1" onBlur={(event) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
  }}>
    <input
      type="text" role="combobox" aria-autocomplete="list" aria-expanded={open}
      aria-controls={open ? listId : undefined} aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
      aria-label="相手を検索または自由入力" placeholder="メンバーを検索／名前を自由入力"
      className="c-input h-11" maxLength={30} value={label} disabled={disabled}
      onFocus={() => setOpen(true)}
      onChange={(event) => { onChange(event.target.value, null); setActive(-1); setOpen(true); }}
      onKeyDown={(event) => {
        if (event.key === "Escape") { setOpen(false); return; }
        if (event.key === "ArrowDown") { event.preventDefault(); setOpen(true); setActive((index) => Math.min(index + 1, visible.length - 1)); }
        if (event.key === "ArrowUp") { event.preventDefault(); setOpen(true); setActive((index) => Math.max(index - 1, 0)); }
        if (event.key === "Enter" && open && active >= 0 && visible[active]) { event.preventDefault(); select(visible[active]); }
      }}
    />
    {selectedMemberId && <p className="c-muted mt-1 text-xs">ギルドメンバーを選択中。名前を書き換えると自由入力になります。</p>}
    {open && <div id={listId} role="listbox" aria-label="ギルドメンバー候補" className="absolute inset-x-0 top-full z-20 mt-1 max-h-60 overflow-y-auto border-2 border-[#1b2a41] bg-[#fffdf6] shadow-[4px_4px_0_rgba(27,42,65,0.18)]">
      {visible.length === 0 ? <p className="c-muted px-3 py-3 text-xs">一致するメンバーはいません。この名前のまま追加できます。</p> : visible.map((member, index) => <button
        key={member.id} id={`${listId}-${index}`} type="button" role="option" aria-selected={active === index}
        onMouseDown={(event) => event.preventDefault()} onClick={() => select(member)}
        className={`block w-full border-b border-[#1b2a41]/15 px-3 py-2 text-left text-sm last:border-b-0 hover:bg-[#f3ecd9] ${active === index ? "bg-[#e8cf8e]" : ""}`}
      ><span className="block">{member.display_name}</span><span className="c-muted block text-xs">{[member.name_kana, member.job, member.region].filter(Boolean).join(" · ")}</span></button>)}
      {matches.length > visible.length && <p className="c-muted px-3 py-2 text-xs">ほかのメンバーは名前を入力して絞り込めます。</p>}
      <p className="c-muted border-t border-[#1b2a41]/15 px-3 py-2 text-xs">候補を選ばず「追加」を押すと、自由入力の相手として保存します。</p>
    </div>}
  </div>;
}
