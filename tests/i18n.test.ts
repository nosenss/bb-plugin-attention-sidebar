import { afterEach, describe, expect, it, vi } from "vitest";
import { detectLocale, getLocale, setLocale, t } from "../lib/i18n";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("detectLocale", () => {
  const withNavigator = (value: { language?: string; languages?: readonly string[] } | undefined) => {
    vi.stubGlobal("navigator", value);
  };

  it("picks Russian when the client language starts with ru", () => {
    withNavigator({ language: "ru-RU", languages: ["ru-RU", "en-US"] });
    expect(detectLocale()).toBe("ru");
    withNavigator({ language: "ru" });
    expect(detectLocale()).toBe("ru");
  });

  it("falls back to English for other languages and a missing navigator", () => {
    withNavigator({ language: "en-US", languages: ["en-US", "ru"] });
    expect(detectLocale()).toBe("en");
    withNavigator({ language: "de-DE", languages: ["de-DE"] });
    expect(detectLocale()).toBe("en");
    withNavigator(undefined);
    expect(detectLocale()).toBe("en");
  });
});

describe("setLocale", () => {
  it("switches the dictionary", () => {
    expect(getLocale()).toBe("en");
    expect(t().blocks.attention).toBe("Waiting for you");
    setLocale("ru");
    expect(getLocale()).toBe("ru");
    expect(t().blocks.attention).toBe("Ждут вас");
  });

  it("formats parameterized strings in both languages", () => {
    expect(t().folderIndicator("attention", 3)).toBe("Threads in “Waiting for you”: 3");
    expect(t().toggleBranchLabel("A", true)).toBe("Expand child threads of “A”");
    setLocale("ru");
    expect(t().folderIndicator("working", 2)).toBe("Есть треды в «В работе»: 2");
    expect(t().toggleBranchLabel("А", false)).toBe("Свернуть дочерние треды «А»");
  });
});
