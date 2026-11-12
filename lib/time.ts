/** Short relative times for sidebar rows: «сейчас», «5 мин», «2 ч», «вчера». */

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

const numericAlways = new Intl.RelativeTimeFormat("ru", {
  style: "narrow",
  numeric: "always",
});
const numericAuto = new Intl.RelativeTimeFormat("ru", {
  style: "narrow",
  numeric: "auto",
});

/**
 * "5 мин. назад" / "-5 мин" (engines and ICU versions differ) → "5 мин".
 * Keeps the number and its unit, drops the sign, "назад", and a final dot.
 */
function compact(
  formatter: Intl.RelativeTimeFormat,
  value: number,
  unit: Intl.RelativeTimeFormatUnit,
): string {
  const parts = formatter.formatToParts(-value, unit);
  const integerIndex = parts.findIndex((part) => part.type === "integer");
  if (integerIndex === -1) return parts.map((part) => part.value).join("");
  const number = parts
    .filter((part) => part.type === "integer" || part.type === "group")
    .map((part) => part.value)
    .join("");
  const unitText = (parts.slice(integerIndex + 1).find((part) => part.type === "literal")?.value ?? "")
    .replace(/назад|тому/gu, "")
    .trim()
    .replace(/\.$/u, "");
  return unitText === "" ? number : `${number} ${unitText}`;
}

export function formatRelativeTime(timestamp: number, now: number): string {
  const elapsed = Math.max(0, now - timestamp);
  if (elapsed < MINUTE) return "сейчас";
  if (elapsed < HOUR) return compact(numericAlways, Math.floor(elapsed / MINUTE), "minute");
  if (elapsed < DAY) return compact(numericAlways, Math.floor(elapsed / HOUR), "hour");
  if (elapsed < WEEK) return compact(numericAuto, Math.floor(elapsed / DAY), "day");
  if (elapsed < MONTH) return compact(numericAlways, Math.floor(elapsed / WEEK), "week");
  if (elapsed < YEAR) return compact(numericAlways, Math.floor(elapsed / MONTH), "month");
  return compact(numericAlways, Math.floor(elapsed / YEAR), "year");
}
