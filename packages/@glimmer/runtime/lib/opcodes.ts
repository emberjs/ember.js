import type { DebugOp, SomeDisassembledOperand } from '@glimmer/debug';
import type {
  DebugVmSnapshot,
  Dict,
  Maybe,
  Nullable,
  Optional,
  RuntimeOp,
  SomeVmOp,
  VmMachineOp,
  VmOp,
} from '@glimmer/interfaces';
import { VM_SYSCALL_SIZE } from '@glimmer/constants';
import {
  DebugLogger,
  debugOp,
  describeOp,
  describeOpcode,
  frag,
  opcodeMetadata,
  recordStackSize,
  VmSnapshot,
} from '@glimmer/debug';
import { assert, dev, unwrap } from '@glimmer/debug-util';
import { LOCAL_DEBUG, LOCAL_TRACE_LOGGING } from '@glimmer/local-debug-flags';
import { LOCAL_LOGGER } from '@glimmer/util';
import { $pc, $ra, $s0, $s1, $sp, $t0, $t1, $v0 } from '@glimmer/vm';

import type { LowLevelVM, VM } from './vm';
import type { Externs } from './vm/low-level';

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
  params?: Maybe<Dict<SomeDisassembledOperand>> | undefined;
  op?: Optional<DebugOp>;
  debug: DebugVmSnapshot;
  snapshot: VmSnapshot;
};

export class AppendOpcodes {
  private evaluateOpcode: Evaluate[] = new Array(VM_SYSCALL_SIZE).fill(null);

  declare debugBefore?: (vm: DebugVmSnapshot, opcode: RuntimeOp) => DebugState;
  declare debugAfter?: (debug: DebugVmSnapshot, pre: DebugState) => void;

  constructor() {
    if (LOCAL_DEBUG) {
      this.debugBefore = (debug: DebugVmSnapshot, opcode: RuntimeOp): DebugState => {
        let opcodeSnapshot = {
          type: opcode.type,
          size: opcode.size,
          isMachine: opcode.isMachine,
        } as const;

        let snapshot = new VmSnapshot(opcodeSnapshot, debug);
        let params: Maybe<Dict<SomeDisassembledOperand>> = undefined;
        let op: DebugOp | undefined = undefined;
        let closeGroup: (() => void) | undefined;

        if (LOCAL_TRACE_LOGGING) {
          const logger = DebugLogger.configured();

          let pos = debug.registers[$pc] - opcode.size;

          op = debugOp(debug.context.program, opcode, debug.template);

          closeGroup = logger
            .group(frag`${pos}. ${describeOp(opcode, debug.context.program, debug.template)}`)
            .expanded();

          let debugParams = [];
          for (let [name, param] of Object.entries(op.params)) {
            const value = param.value;
            if (value !== null && (typeof value === 'object' || typeof value === 'function')) {
              debugParams.push(name, '=', value);
            }
          }
          LOCAL_LOGGER.debug(...debugParams);
        }

        recordStackSize(debug.registers[$sp]);
        return {
          op,
          closeGroup,
          params,
          opcode: opcodeSnapshot,
          debug,
          snapshot,
        };
      };

      this.debugAfter = (postSnapshot: DebugVmSnapshot, pre: DebugState) => {
        let post = new VmSnapshot(pre.opcode, postSnapshot);
        let diff = pre.snapshot.diff(post);
        let {
          opcode: { type },
        } = pre;

        let sp = diff.registers[$sp];

        let meta = opcodeMetadata(type);
        let actualChange = sp.after - sp.before;
        if (
          meta &&
          meta.check !== false &&
          typeof meta.stackChange! === 'number' &&
          meta.stackChange !== actualChange
        ) {
          throw new Error(
            `Error in ${pre.op?.name}:\n\n${pre.debug.registers[$pc]}. ${
              pre.op ? describeOpcode(pre.op?.name, pre.params!) : unwrap(opcodeMetadata(type)).name
            }\n\nStack changed by ${actualChange}, expected ${meta.stackChange}`
          );
        }

        if (LOCAL_TRACE_LOGGING) {
          const logger = DebugLogger.configured();

          logger.log(diff.registers[$pc].describe());
          logger.log(diff.registers[$ra].describe());
          logger.log(diff.registers[$s0].describe());
          logger.log(diff.registers[$s1].describe());
          logger.log(diff.registers[$t0].describe());
          logger.log(diff.registers[$t1].describe());
          logger.log(diff.registers[$v0].describe());
          logger.log(diff.stack.describe());
          logger.log(diff.destructors.describe());
          logger.log(diff.scope.describe());

          if (diff.constructing.didChange || diff.blocks.change) {
            const done = logger.group(`tree construction`).expanded();
            try {
              logger.log(diff.constructing.describe());
              logger.log(diff.blocks.describe());
              logger.log(diff.cursors.describe());
            } finally {
              done();
            }
          }

          pre.closeGroup?.();
        }
      };
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
          return APPEND_OPCODES.debugBefore!(dev(vm.debug), opcode);
        },

        debugAfter: (state: DebugState): void => {
          APPEND_OPCODES.debugAfter!(dev(vm.debug), state);
        },
      }
    : undefined;
}

export const APPEND_OPCODES = new AppendOpcodes();
