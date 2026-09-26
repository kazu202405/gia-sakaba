export function isValidBirthday(
  month: number | null | undefined,
  day: number | null | undefined,
  year: number | null | undefined,
): boolean {
  if (month == null && day == null && year == null) return true;
  if (month == null || day == null) return false;
  if (!Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(day) || day < 1) return false;
  if (year != null && (!Number.isInteger(year) || year < 1900 || year > new Date().getUTCFullYear())) return false;
  const lastDay = new Date(Date.UTC(year ?? 2000, month, 0)).getUTCDate();
  return day <= lastDay;
}

export function birthdayLabel(
  month: number | null | undefined,
  day: number | null | undefined,
  year: number | null | undefined,
): string {
  if (month == null || day == null || !isValidBirthday(month, day, year)) return "";
  return `${year == null ? "" : `${year}年`}${month}月${day}日`;
}
