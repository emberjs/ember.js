/*
  The rollup pre-publication build resolves this instead of the real dev-time implementation in ./index.ts.
*/

export const LOCAL_DEBUG = false;
export const LOCAL_TRACE_LOGGING = false;
export const LOCAL_EXPLAIN_LOGGING = false;
export const LOCAL_INTERNALS_LOGGING = false;
export const LOCAL_SUBTLE_LOGGING = false;

export function hasFlagWith(): boolean {
  return false;
}

export function getFlagValues(): string[] {
  return [];
}

export function getFlag(): boolean | string | string[] | null {
  return null;
}
