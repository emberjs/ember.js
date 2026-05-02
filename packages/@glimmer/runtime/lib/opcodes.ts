import type { DebugOp, SomeDisassembledOperand } from '@glimmer/debug/lib/debug';
import type {
  DebugVmSnapshot,
  Dict,
  Nullable,
  Optional,
  RuntimeOp,
  SomeVmOp,
  VmMachineOp,
  VmOp,
} from '@glimmer/interfaces';
import { VM_SYSCALL_SIZE } from '@glimmer/constants/lib/syscall-ops';
import type { VmSnapshot } from '@glimmer/debug/lib/vm/snapshot';
import { dev, unwrap } from '@glimmer/debug-util/lib/platform-utils';
import assert from '@glimmer/debug-util/lib/assert';
import { LOCAL_DEBUG } from '@glimmer/local-debug-flags';

import type { LowLevelVM, VM } from './vm';
import type { Externs } from './vm/low-level';

// Lazy registration: when `./opcodes-debug-setup` is imported, it calls
// `registerDebugOpcodeSetup` to install the per-opcode tracing/snapshot
// hooks. Without that import, the heavy debug imports
// (`@glimmer/debug/lib/debug`, `DebugLogger`, `VmSnapshot`,
// `opcodeMetadata`, etc.) stay out of the bundle. Production builds with
// `LOCAL_DEBUG === false` never need these hooks.
type DebugOpcodeSetup = (opcodes: AppendOpcodes) => void;
let debugOpcodeSetup: DebugOpcodeSetup | null = null;

export function registerDebugOpcodeSetup(setup: DebugOpcodeSetup): void {
  debugOpcodeSetup = setup;
}

export interface OpcodeJSON {
  type: number | string;
  guid?: Nullable<number>;
  deopted?: boolean;
  args?: string[];
  details?: Dict<Nullable<string>>;
  children?: OpcodeJSON[];
}

export type Operand1 = number;
export type Operand2 = number;
export type Operand3 = number;

export type Syscall = (vm: VM, opcode: RuntimeOp) => void;
export type MachineOpcode = (vm: LowLevelVM, opcode: RuntimeOp) => void;

export type Evaluate =
  | { syscall: true; evaluate: Syscall }
  | { syscall: false; evaluate: MachineOpcode };

export type DebugState = {
  opcode: {
    type: VmMachineOp | VmOp;
    isMachine: 0 | 1;
    size: number;
  };
  closeGroup?: undefined | (() => void);
  params?: Optional<Dict<SomeDisassembledOperand>>;
  op?: Optional<DebugOp>;
  debug: DebugVmSnapshot;
  snapshot: VmSnapshot;
};

export class AppendOpcodes {
  // This code is intentionally putting unsafe `null`s into the array that it
  // will intentionally overwrite before anyone can see them.
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  private evaluateOpcode: Evaluate[] = new Array(VM_SYSCALL_SIZE).fill(null);

  declare debugBefore?: (vm: DebugVmSnapshot, opcode: RuntimeOp) => DebugState;
  declare debugAfter?: (debug: DebugVmSnapshot, pre: DebugState) => void;

  constructor() {
    if (LOCAL_DEBUG && debugOpcodeSetup) {
      debugOpcodeSetup(this);
    }
  }

  add<Name extends VmOp>(name: Name, evaluate: Syscall): void;
  add<Name extends VmMachineOp>(name: Name, evaluate: MachineOpcode, kind: 'machine'): void;
  add<Name extends SomeVmOp>(
    name: Name,
    evaluate: Syscall | MachineOpcode,
    kind = 'syscall'
  ): void {
    this.evaluateOpcode[name as number] = {
      syscall: kind !== 'machine',
      evaluate,
    } as Evaluate;
  }

  evaluate(vm: VM, opcode: RuntimeOp, type: number) {
    let operation = unwrap(this.evaluateOpcode[type]);

    if (operation.syscall) {
      assert(
        !opcode.isMachine,
        `BUG: Mismatch between operation.syscall (${operation.syscall}) and opcode.isMachine (${opcode.isMachine}) for ${opcode.type}`
      );
      operation.evaluate(vm, opcode);
    } else {
      assert(
        opcode.isMachine,
        `BUG: Mismatch between operation.syscall (${operation.syscall}) and opcode.isMachine (${opcode.isMachine}) for ${opcode.type}`
      );
      operation.evaluate(vm.lowlevel, opcode);
    }
  }
}

export function externs(vm: VM): Externs | undefined {
  return LOCAL_DEBUG
    ? {
        debugBefore: (opcode: RuntimeOp): DebugState => {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- @fixme
          return APPEND_OPCODES.debugBefore!(dev(vm.debug), opcode);
        },

        debugAfter: (state: DebugState): void => {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- @fixme
          APPEND_OPCODES.debugAfter!(dev(vm.debug), state);
        },
      }
    : undefined;
}

export const APPEND_OPCODES = new AppendOpcodes();
