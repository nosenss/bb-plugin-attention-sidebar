/** Short relative times for sidebar rows in the current locale: "now", "5m", "2h", "yesterday". */

import { getLocale, t, type Locale } from "./i18n";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

const formatters = new Map<string, Intl.RelativeTimeFormat>();

function formatterFor(locale: Locale, numeric: "always" | "auto"): Intl.RelativeTimeFormat {
  const key = `${locale}:${numeric}`;
  let formatter = formatters.get(key);
  if (formatter === undefined) {
    formatter = new Intl.RelativeTimeFormat(locale, { style: "narrow", numeric });
    formatters.set(key, formatter);
  }
  return formatter;
}

/**
 * "5m ago" / "5 min. ago" / "-5 min" (engines and ICU versions differ) →
 * "5m" / "5 min". Keeps the number and its unit, drops the sign, the "ago"
 * word (see `timeSuffix`), and a final dot.
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
    .replace(t().timeSuffix, "")
    .trimEnd()
    .replace(/\.$/u, "");
  if (unitText.trim() === "") return number;
  // "5m" stays attached; a spaced unit gets one plain space instead of ICU's NBSP.
  return /^\s/u.test(unitText) ? `${number} ${unitText.trim()}` : `${number}${unitText}`;
}

export function formatRelativeTime(timestamp: number, now: number): string {
  const elapsed = Math.max(0, now - timestamp);
  const locale = getLocale();
  const numericAlways = formatterFor(locale, "always");
  const numericAuto = formatterFor(locale, "auto");
  if (elapsed < MINUTE) return t().timeNow;
  if (elapsed < HOUR) return compact(numericAlways, Math.floor(elapsed / MINUTE), "minute");
  if (elapsed < DAY) return compact(numericAlways, Math.floor(elapsed / HOUR), "hour");
  if (elapsed < WEEK) return compact(numericAuto, Math.floor(elapsed / DAY), "day");
  if (elapsed < MONTH) return compact(numericAlways, Math.floor(elapsed / WEEK), "week");
  if (elapsed < YEAR) return compact(numericAlways, Math.floor(elapsed / MONTH), "month");
  return compact(numericAlways, Math.floor(elapsed / YEAR), "year");
}
