import type { Profile } from "./types";

type SearchableMember = Pick<Profile, "id" | "display_name" | "name_kana" | "job" | "region">;

function normalize(value: string) {
  return value.normalize("NFKC").toLocaleLowerCase("ja-JP")
    .replace(/[ァ-ヶ]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0x60))
    .replace(/\s+/g, "");
}

export function filterProjectMembers<T extends SearchableMember>(members: T[], input: string): T[] {
  const query = normalize(input);
  if (!query) return members;
  return members.filter((member) => [member.display_name, member.name_kana ?? "", member.job, member.region]
    .some((part) => normalize(part).includes(query)));
}
