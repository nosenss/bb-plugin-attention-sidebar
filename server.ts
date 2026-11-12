// The list is frontend-only. bb's manifest still requires a `bb.server`
// entry (`bb plugin build` refuses a manifest without one), so this backend
// registers nothing. The parameter stays untyped so the plugin does not need
// the backend SDK's type dependencies (better-sqlite3, hono).
export default function plugin(_bb: unknown): void {}
