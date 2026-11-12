import { describe, expect, it } from "vitest";
import {
  AVATAR_PALETTE,
  fnv1a,
  projectAvatarStyle,
  projectColor,
  projectInitials,
} from "../lib/avatar";

describe("projectInitials", () => {
  it.each([
    ["veber-writing", "VW"],
    ["book-smm", "BS"],
    ["steadycontrol-analytics", "SA"],
    ["Редзапал", "РЕ"],
    ["кат ми ин", "КМ"],
    ["smmJokes", "SJ"],
  ])("%s → %s", (name, expected) => {
    expect(projectInitials(name)).toBe(expected);
  });

  it("splits on underscores, dots, and runs of separators", () => {
    expect(projectInitials("my_cool_project")).toBe("MC");
    expect(projectInitials("example.com")).toBe("EC");
    expect(projectInitials("a -- b")).toBe("AB");
  });

  it("skips leading emoji and non-letters", () => {
    expect(projectInitials("🚀 rocket-launch")).toBe("RL");
    expect(projectInitials("2024-отчёт")).toBe("ОТ");
    expect(projectInitials("#bb")).toBe("BB");
  });

  it("skips words without letters", () => {
    expect(projectInitials("web 3")).toBe("WE");
  });

  it("uses one letter for a one-letter name", () => {
    expect(projectInitials("x")).toBe("X");
  });

  it("gives ? for empty and letterless names", () => {
    expect(projectInitials("")).toBe("?");
    expect(projectInitials("   ")).toBe("?");
    expect(projectInitials("🔥🔥")).toBe("?");
    expect(projectInitials(null)).toBe("?");
  });

  it("gives Я for the personal project", () => {
    expect(projectInitials("Personal", true)).toBe("Я");
  });
});

describe("project colors", () => {
  it("has ten palette entries", () => {
    expect(AVATAR_PALETTE).toHaveLength(10);
    expect(new Set(AVATAR_PALETTE).size).toBe(10);
  });

  it("implements 32-bit FNV-1a", () => {
    expect(fnv1a("")).toBe(0x811c9dc5);
    expect(fnv1a("a")).toBe(0xe40c292c);
    expect(fnv1a("foobar")).toBe(0xbf9cf968);
  });

  it("picks the palette entry by FNV-1a of the project id", () => {
    const id = "proj_4kav2cdx2a";
    expect(projectColor(id)).toBe(AVATAR_PALETTE[fnv1a(id) % 10]);
    expect(projectColor(id)).toBe(projectColor(id));
  });

  it("depends on the id, not the name", () => {
    const ids = Array.from({ length: 40 }, (_, index) => `proj_${index}`);
    expect(new Set(ids.map(projectColor)).size).toBeGreaterThan(5);
  });

  it("tints the background with 22% of the text color", () => {
    const style = projectAvatarStyle("proj_x");
    expect(style.color).toBe(projectColor("proj_x"));
    expect(style.backgroundColor).toBe(
      `color-mix(in oklab, ${projectColor("proj_x")} 22%, transparent)`,
    );
  });
});
