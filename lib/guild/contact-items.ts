export const contactKindOptions = [
  { value: "email", label: "メールアドレス" },
  { value: "line", label: "LINE" },
  { value: "instagram", label: "Instagram" },
  { value: "x", label: "X (Twitter)" },
  { value: "facebook", label: "Facebook" },
  { value: "threads", label: "Threads" },
  { value: "note", label: "note" },
  { value: "website", label: "ウェブサイト" },
  { value: "other", label: "その他" },
] as const;

export type ContactItemKind = (typeof contactKindOptions)[number]["value"];
export type ContactVisibility = "members" | "approved" | "private";

export type GuildContactItem = {
  id?: string;
  kind: ContactItemKind;
  label: string;
  value: string;
  visibility: ContactVisibility;
  sort_order: number;
};

const labels = Object.fromEntries(contactKindOptions.map((option) => [option.value, option.label])) as Record<ContactItemKind, string>;

export function contactItemLabel(item: Pick<GuildContactItem, "kind" | "label">): string {
  return item.kind === "other" && item.label.trim() ? item.label.trim() : labels[item.kind];
}

export function contactItemHref(item: Pick<GuildContactItem, "kind" | "value">): string {
  return item.kind === "email" ? `mailto:${encodeURIComponent(item.value)}` : item.value;
}

export function contactItemsError(items: GuildContactItem[]): string | null {
  if (items.length > 10) return "連絡先は10件まで追加できます。";
  for (const item of items) {
    if (!item.value.trim()) return `${contactItemLabel(item)}を入力するか、この項目を削除してください。`;
    if (item.kind === "other" && !item.label.trim()) return "「その他」の表示名を入力してください。";
    if (item.label.length > 40 || item.value.length > 300) return "連絡先の文字数が上限を超えています。";
    if (item.kind === "email") {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item.value.trim())) return "メールアドレスの形式を確認してください。";
    } else if (!/^https?:\/\/\S+$/i.test(item.value.trim())) {
      return `${contactItemLabel(item)}は https:// から入力してください。`;
    }
  }
  return null;
}

export function legacyContactItems(input: {
  email?: string;
  line_url?: string;
  website_url?: string;
  email_visibility?: ContactVisibility | null;
  line_visibility?: ContactVisibility | null;
  website_visibility?: ContactVisibility | null;
}): GuildContactItem[] {
  const candidates: Array<[ContactItemKind, string, ContactVisibility]> = [
    ["email", input.email ?? "", input.email_visibility ?? "approved"],
    ["line", input.line_url ?? "", input.line_visibility ?? "approved"],
    ["website", input.website_url ?? "", input.website_visibility ?? "approved"],
  ];
  return candidates
    .filter(([, value]) => Boolean(value.trim()))
    .map(([kind, value, visibility], sort_order) => ({ kind, label: "", value, visibility, sort_order }));
}


// sakaba_get_contact_items の返り値（人ごと）。value が null なら「承認した人だけ」でまだ見られないもの
export type ViewContactItem = {
  kind: ContactItemKind;
  label: string;
  value: string | null;
  visibility: ContactVisibility | null;
  locked: boolean;
};

const kinds = new Set<string>(contactKindOptions.map((option) => option.value));
const visibilities = new Set<string>(["members", "approved", "private"]);

/** RPCの返り値を人ごとの一覧にする。形のおかしいものは捨てる（壊れた値でリンクを作らない） */
export function parseContactItemsMap(data: unknown): Record<string, ViewContactItem[]> {
  if (!data || typeof data !== "object" || Array.isArray(data)) return {};
  const result: Record<string, ViewContactItem[]> = {};
  for (const [userId, raw] of Object.entries(data as Record<string, unknown>)) {
    if (!Array.isArray(raw)) continue;
    result[userId] = raw.flatMap((entry): ViewContactItem[] => {
      if (!entry || typeof entry !== "object") return [];
      const e = entry as Record<string, unknown>;
      if (typeof e.kind !== "string" || !kinds.has(e.kind)) return [];
      const value = typeof e.value === "string" && e.value.trim() ? e.value : null;
      const locked = e.locked === true;
      if (!value && !locked) return [];
      return [{
        kind: e.kind as ContactItemKind,
        label: typeof e.label === "string" ? e.label : "",
        value: locked ? null : value,
        visibility: typeof e.visibility === "string" && visibilities.has(e.visibility) ? e.visibility as ContactVisibility : null,
        locked,
      }];
    });
  }
  return result;
}

/** リンクとして開いてよい値か（http(s) と mailto だけ。javascript: などは出さない） */
export function safeContactHref(item: { kind: ContactItemKind; value: string | null }): string | null {
  if (!item.value) return null;
  if (item.kind === "email") return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item.value) ? contactItemHref({ kind: "email", value: item.value }) : null;
  return /^https?:\/\/\S+$/i.test(item.value) ? item.value : null;
}
