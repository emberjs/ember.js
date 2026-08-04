/**
  EXPERIMENT ONLY — see EXPERIMENT-CLASSIC-OUTLET-USAGE.md.

  A side ledger recording which route-manager code paths actually execute.
  It must never influence control flow: every call is a `void`-returning
  write into a `globalThis` dictionary, guarded by `DEBUG`, and it never
  throws (a probe failure would change behavior, which defeats the purpose).

  Delete this module — and its call sites — when the experiment is over.
*/

import { DEBUG } from '@glimmer/env';

export interface ProbeRecord {
  count: number;
}

export type ProbeLedger = Record<string, ProbeRecord>;

const LEDGER_KEY = '__EMBER_CLASSIC_PROBE__';

function ledger(): ProbeLedger | undefined {
  let global = globalThis as unknown as Record<string, ProbeLedger | undefined>;
  let existing = global[LEDGER_KEY];
  if (existing === undefined) {
    existing = Object.create(null) as ProbeLedger;
    global[LEDGER_KEY] = existing;
  }
  return existing;
}

/**
  Record that probe `id` executed. Returns nothing and swallows its own
  errors so no call site can observe it.
*/
export function recordUse(id: string): void {
  if (!DEBUG) {
    return;
  }

  try {
    let all = ledger();
    if (all === undefined) {
      return;
    }

    let record = all[id];

    if (record === undefined) {
      all[id] = { count: 1 };
    } else {
      record.count++;
    }
  } catch {
    // A probe must never be able to alter behavior.
  }
}

/**
  Test/console helper: snapshot the ledger as plain counts.
*/
export function probeCounts(): Record<string, number> {
  let out: Record<string, number> = Object.create(null) as Record<string, number>;
  let all = ledger();
  if (all === undefined) {
    return out;
  }
  for (let id of Object.keys(all)) {
    out[id] = all[id]!.count;
  }
  return out;
}

/**
  Test helper: clear the ledger between scenarios.
*/
export function resetProbes(): void {
  let global = globalThis as unknown as Record<string, ProbeLedger | undefined>;
  global[LEDGER_KEY] = Object.create(null) as ProbeLedger;
}
