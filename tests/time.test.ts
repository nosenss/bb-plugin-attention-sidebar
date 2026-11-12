import { describe, expect, it } from "vitest";
import { formatRelativeTime } from "../lib/time";

const NOW = Date.UTC(2026, 10, 12, 12, 0, 0);
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

describe("formatRelativeTime", () => {
  it("says сейчас under a minute, and for future timestamps", () => {
    expect(formatRelativeTime(NOW - 30_000, NOW)).toBe("сейчас");
    expect(formatRelativeTime(NOW + 5 * MIN, NOW)).toBe("сейчас");
  });

  it("drops the sign and 'назад'", () => {
    const text = formatRelativeTime(NOW - 5 * MIN, NOW);
    expect(text).toMatch(/^5\s?мин$/u);
    expect(formatRelativeTime(NOW - 2 * HOUR, NOW)).toMatch(/^2\s?ч$/u);
  });

  it("says вчера for one day", () => {
    expect(formatRelativeTime(NOW - DAY - HOUR, NOW)).toBe("вчера");
  });

  it("uses days, weeks, months, years", () => {
    expect(formatRelativeTime(NOW - 3 * DAY, NOW)).toMatch(/^3\s?дн/u);
    expect(formatRelativeTime(NOW - 14 * DAY, NOW)).toMatch(/^2\s?нед/u);
    expect(formatRelativeTime(NOW - 90 * DAY, NOW)).toMatch(/^3\s?мес/u);
    expect(formatRelativeTime(NOW - 800 * DAY, NOW)).toMatch(/^2\s?г/u);
  });

  it("never contains a minus or 'назад'", () => {
    for (const ago of [2 * MIN, 3 * HOUR, 4 * DAY, 20 * DAY, 200 * DAY, 400 * DAY]) {
      const text = formatRelativeTime(NOW - ago, NOW);
      expect(text).not.toMatch(/[-−]|назад/u);
    }
  });
});
