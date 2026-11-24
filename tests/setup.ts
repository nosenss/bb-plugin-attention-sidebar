import { beforeEach } from "vitest";
import { setLocale } from "../lib/i18n";

// Tests run in English regardless of the machine's language; Russian tests
// call `setLocale("ru")` themselves and are reset before the next test.
beforeEach(() => {
  setLocale("en");
});
