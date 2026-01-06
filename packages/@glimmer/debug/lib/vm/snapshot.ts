import type {
  Cursor,
  DebugRegisters,
  DebugVmSnapshot,
  Nullable,
  ScopeSlot,
  SimpleElement,
  VmMachineOp,
  VmOp,
} from '@glimmer/interfaces';
import { exhausted } from '@glimmer/debug-util';
import { LOCAL_SUBTLE_LOGGING } from '@glimmer/local-debug-flags';
import { zipArrays, zipTuples } from '@glimmer/util';
import { $fp, $pc } from '@glimmer/vm';

import type { Fragment } from '../render/fragment';

import { decodeRegister } from '../decoders';
import { value } from '../render/basic';
import { array } from '../render/combinators';
import { as, frag } from '../render/fragment';

export interface RuntimeOpSnapshot {
  type: VmMachineOp | VmOp;
  isMachine: 0 | 1;
  size: number;
}

export class VmSnapshot {
  #opcode: RuntimeOpSnapshot;
  #snapshot: DebugVmSnapshot;

  constructor(opcode: RuntimeOpSnapshot, snapshot: DebugVmSnapshot) {
    this.#opcode = opcode;
    this.#snapshot = snapshot;
  }

  diff(other: VmSnapshot): VmDiff {
    return new VmDiff(this.#opcode, this.#snapshot, other.#snapshot);
  }
}

type GetRegisterDiffs<D extends DebugRegisters> = {
  [P in keyof D]: VmSnapshotValueDiff<P, D[P]>;
};

type RegisterDiffs = GetRegisterDiffs<DebugRegisters>;

export class VmDiff {
  readonly opcode: RuntimeOpSnapshot;

  readonly registers: RegisterDiffs;
  readonly stack: VmSnapshotArrayDiff<'stack', unknown[]>;
  readonly blocks: VmSnapshotArrayDiff<'blocks', object[]>;
  readonly cursors: VmSnapshotArrayDiff<'cursors', Cursor[]>;
  readonly constructing: VmSnapshotValueDiff<'constructing', Nullable<SimpleElement>>;
  readonly destructors: VmSnapshotArrayDiff<'destructors', object[]>;
  readonly scope: VmSnapshotArrayDiff<'scope', ScopeSlot[]>;

  constructor(opcode: RuntimeOpSnapshot, before: DebugVmSnapshot, after: DebugVmSnapshot) {
    this.opcode = opcode;
    const registers = [] as unknown[];

    for (const [i, preRegister, postRegister] of zipTuples(before.registers, after.registers)) {
      if (i === $pc) {
        const preValue = preRegister;
        const postValue = postRegister;
        registers.push(new VmSnapshotValueDiff(decodeRegister(i), preValue, postValue));
      } else {
        registers.push(new VmSnapshotValueDiff(decodeRegister(i), preRegister, postRegister));
      }
    }

    this.registers = registers as unknown as RegisterDiffs;

    const frameChange = this.registers[$fp].didChange;
    this.stack = new VmSnapshotArrayDiff(
      'stack',
      before.stack,
      after.stack,
      frameChange ? 'reset' : undefined
    );

    this.blocks = new VmSnapshotArrayDiff('blocks', before.elements.blocks, after.elements.blocks);

    this.constructing = new VmSnapshotValueDiff(
      'constructing',
      before.elements.constructing,
      after.elements.constructing
    );

    this.cursors = new VmSnapshotArrayDiff(
      'cursors',
      before.elements.cursors,
      after.elements.cursors
    );

    this.destructors = new VmSnapshotArrayDiff(
      'destructors',
      before.stacks.destroyable,
      after.stacks.destroyable
    );

    this.scope = new VmSnapshotArrayDiff('scope', before.scope, after.scope);
  }
}

export class VmSnapshotArrayDiff<N extends string | number, T extends unknown[]> {
  readonly name: N;
  readonly before: T;
  readonly after: T;
  readonly change: boolean | 'reset';

  constructor(name: N, before: T, after: T, change: boolean | 'reset' = didChange(before, after)) {
    this.name = name;
    this.before = before;
    this.after = after;
    this.change = change;
  }

  describe(): Fragment {
    if (this.change === false) {
      return frag`${as.kw(this.name)}: unchanged`.subtle();
    }

    if (this.change === 'reset') {
      return frag`${as.kw(this.name)}: ${as.dim('reset to')} ${array(
        this.after.map((v) => value(v))
      )}`;
    }

    const fragments: Fragment[] = [];
    let seenDiff = false;

    for (const [op, i, before, after] of zipArrays(this.before, this.after)) {
      if (Object.is(before, after)) {
        if (!seenDiff) {
          // If we haven't seen a change yet, only print the value in subtle mode.
          fragments.push(value(before, { ref: `${i}` }).subtle());
        } else {
          // If we *have* seen a change, print the value unconditionally, but style
          // it as dimmed.
          if (LOCAL_SUBTLE_LOGGING) {
            fragments.push(value(before, { ref: `${i}` }).styleAll('dim'));
          } else {
            fragments.push(as.dim(`<unchanged>`));
          }
        }
        continue;
      }

      // The first time we see
      if (!seenDiff && i > 0 && !LOCAL_SUBTLE_LOGGING) {
        fragments.push(as.dim(`... ${i} items`));
      }

      let pre: Fragment;

      if (op === 'pop') {
        pre = frag`${value(before, { ref: `${i}:popped` })} -> `;
      } else if (op === 'retain') {
        pre = frag`${value(before, { ref: `${i}:before` })} -> `;
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- exhaustion check
      } else if (op === 'push') {
        pre = frag`push -> `.subtle();
      } else {
        exhausted(op);
      }

      let post: Fragment;

      if (op === 'push') {
        post = value(after, { ref: `${i}:push` });
      } else if (op === 'retain') {
        post = value(after, { ref: `${i}:after` });
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- exhaustion check
      } else if (op === 'pop') {
        post = frag`${as.diffDelete('<removed>')}`;
      } else {
        exhausted(op);
      }

      fragments.push(frag`${pre}${post}`);
      seenDiff = true;
    }

    return frag`${as.kw(this.name)}: ${array(fragments)}`;
  }
}

export class VmSnapshotValueDiff<N extends string | number, T> {
  readonly name: N;
  readonly before: T;
  readonly after: T;
  readonly didChange: boolean;

  constructor(name: N, before: T, after: T) {
    this.name = name;
    this.before = before;
    this.after = after;
    this.didChange = !Object.is(before, after);
  }

  describe(): Fragment {
    if (!this.didChange) {
      return frag`${as.register(this.name)}: ${value(this.after)}`.subtle();
    }

    return frag`${as.register(this.name)}: ${value(this.before)} -> ${value(this.after)}`;
  }
}

function didChange(before: unknown[], after: unknown[]): boolean {
  return before.length !== after.length || before.some((v, i) => !Object.is(v, after[i]));
}
