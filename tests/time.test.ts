import { describe, expect, it } from "vitest";
import { setLocale } from "../lib/i18n";
import { formatRelativeTime } from "../lib/time";

const NOW = Date.UTC(2026, 10, 12, 12, 0, 0);
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

describe("formatRelativeTime (en)", () => {
  it("says now under a minute, and for future timestamps", () => {
    expect(formatRelativeTime(NOW - 30_000, NOW)).toBe("now");
    expect(formatRelativeTime(NOW + 5 * MIN, NOW)).toBe("now");
  });

  it("drops the sign and 'ago'", () => {
    expect(formatRelativeTime(NOW - 5 * MIN, NOW)).toMatch(/^5\s?m(?:in)?$/u);
    expect(formatRelativeTime(NOW - 2 * HOUR, NOW)).toMatch(/^2\s?h(?:r)?$/u);
  });

  it("says yesterday for one day", () => {
    expect(formatRelativeTime(NOW - DAY - HOUR, NOW)).toBe("yesterday");
  });

  it("uses days, weeks, months, years", () => {
    expect(formatRelativeTime(NOW - 3 * DAY, NOW)).toMatch(/^3\s?d/u);
    expect(formatRelativeTime(NOW - 14 * DAY, NOW)).toMatch(/^2\s?w/u);
    expect(formatRelativeTime(NOW - 90 * DAY, NOW)).toMatch(/^3\s?mo/u);
    expect(formatRelativeTime(NOW - 800 * DAY, NOW)).toMatch(/^2\s?y/u);
  });

  it("never contains a minus, 'ago' or 'in'", () => {
    for (const ago of [2 * MIN, 3 * HOUR, 4 * DAY, 20 * DAY, 200 * DAY, 400 * DAY]) {
      expect(formatRelativeTime(NOW - ago, NOW)).not.toMatch(/[-−]|\bago\b|\bin\b/u);
    }
  });
});

describe("formatRelativeTime (ru)", () => {
  it("says сейчас under a minute, and for future timestamps", () => {
    setLocale("ru");
    expect(formatRelativeTime(NOW - 30_000, NOW)).toBe("сейчас");
    expect(formatRelativeTime(NOW + 5 * MIN, NOW)).toBe("сейчас");
  });

  it("drops the sign and 'назад'", () => {
    setLocale("ru");
    expect(formatRelativeTime(NOW - 5 * MIN, NOW)).toMatch(/^5\s?мин$/u);
    expect(formatRelativeTime(NOW - 2 * HOUR, NOW)).toMatch(/^2\s?ч$/u);
  });

  it("says вчера for one day", () => {
    setLocale("ru");
    expect(formatRelativeTime(NOW - DAY - HOUR, NOW)).toBe("вчера");
  });

  it("uses days, weeks, months, years", () => {
    setLocale("ru");
    expect(formatRelativeTime(NOW - 3 * DAY, NOW)).toMatch(/^3\s?дн/u);
    expect(formatRelativeTime(NOW - 14 * DAY, NOW)).toMatch(/^2\s?нед/u);
    expect(formatRelativeTime(NOW - 90 * DAY, NOW)).toMatch(/^3\s?мес/u);
    expect(formatRelativeTime(NOW - 800 * DAY, NOW)).toMatch(/^2\s?(?:г|л)/u);
  });

  it("never contains a minus or 'назад'", () => {
    setLocale("ru");
    for (const ago of [2 * MIN, 3 * HOUR, 4 * DAY, 20 * DAY, 200 * DAY, 400 * DAY]) {
      expect(formatRelativeTime(NOW - ago, NOW)).not.toMatch(/[-−]|назад/u);
    }
  });
});
