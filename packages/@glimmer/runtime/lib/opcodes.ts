import type {
  Dict,
  Maybe,
  Nullable,
  RuntimeOp,
  SomeVmOp,
  VmMachineOp,
  VmOp,
} from '@glimmer/interfaces';
import { debug, logOpcode, opcodeMetadata, recordStackSize } from '@glimmer/debug';
import { assert, unwrap } from '@glimmer/debug-util';
import { LOCAL_DEBUG, LOCAL_SHOULD_LOG } from '@glimmer/local-debug-flags';
import { valueForRef } from '@glimmer/reference';
import { LOCAL_LOGGER } from '@glimmer/util';
import { $fp, $pc, $ra, $s0, $s1, $sp, $t0, $t1, $v0, Op } from '@glimmer/vm';

import type { LowLevelVM, VM } from './vm';

import { isScopeReference } from './scope';
import { CURSOR_STACK } from './vm/element-builder';

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
  pc: number;
  sp: number;
  type: VmMachineOp | VmOp;
  isMachine: 0 | 1;
  size: number;
  params?: Maybe<Dict> | undefined;
  name?: string | undefined;
  state: unknown;
};

export class AppendOpcodes {
  private evaluateOpcode: Evaluate[] = new Array(Op.Size).fill(null);

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

  debugBefore(vm: VM, opcode: RuntimeOp): DebugState {
    let params: Maybe<Dict> = undefined;
    let opName: string | undefined = undefined;

    if (LOCAL_SHOULD_LOG) {
      const lowlevel = unwrap(vm.debug).lowlevel;
      let pos = lowlevel.fetchRegister($pc) - opcode.size;

      [opName, params] = debug(vm.constants, opcode, opcode.isMachine)!;

      // console.log(`${typePos(vm['pc'])}.`);
      LOCAL_LOGGER.log(`${pos}. ${logOpcode(opName, params)}`);

      let debugParams = [];
      for (let prop in params) {
        debugParams.push(prop, '=', params[prop]);
      }

      LOCAL_LOGGER.log(...debugParams);
    }

    let sp: number;

    if (LOCAL_DEBUG) {
      sp = vm.fetchValue($sp);
    }

    recordStackSize(vm.fetchValue($sp));
    return {
      sp: sp!,
      pc: vm.fetchValue($pc),
      name: opName,
      params,
      type: opcode.type,
      isMachine: opcode.isMachine,
      size: opcode.size,
      state: undefined,
    };
  }

  debugAfter(vm: VM, pre: DebugState) {
    let { sp, type, isMachine, pc } = pre;

    if (LOCAL_DEBUG) {
      const debug = unwrap(vm.debug);

      let meta = opcodeMetadata(type, isMachine);
      let actualChange = vm.fetchValue($sp) - sp;
      if (
        meta &&
        meta.check &&
        typeof meta.stackChange! === 'number' &&
        meta.stackChange !== actualChange
      ) {
        throw new Error(
          `Error in ${pre.name}:\n\n${pc}. ${logOpcode(
            pre.name!,
            pre.params
          )}\n\nStack changed by ${actualChange}, expected ${meta.stackChange}`
        );
      }

      if (LOCAL_SHOULD_LOG) {
        const { lowlevel, registers } = unwrap(vm.debug);
        LOCAL_LOGGER.log(
          '%c -> pc: %d, ra: %d, fp: %d, sp: %d, s0: %O, s1: %O, t0: %O, t1: %O, v0: %O',
          'color: orange',
          lowlevel.registers[$pc],
          lowlevel.registers[$ra],
          lowlevel.registers[$fp],
          lowlevel.registers[$sp],
          registers[$s0],
          registers[$s1],
          registers[$t0],
          registers[$t1],
          registers[$v0]
        );
        LOCAL_LOGGER.log('%c -> eval stack', 'color: red', vm.stack.toArray());
        LOCAL_LOGGER.log('%c -> block stack', 'color: magenta', vm.elements().debugBlocks());
        LOCAL_LOGGER.log(
          '%c -> destructor stack',
          'color: violet',
          debug.destroyableStack.toArray()
        );
        if (debug.stacks.scope.current === null) {
          LOCAL_LOGGER.log('%c -> scope', 'color: green', 'null');
        } else {
          LOCAL_LOGGER.log(
            '%c -> scope',
            'color: green',
            vm.scope().slots.map((s) => (isScopeReference(s) ? valueForRef(s) : s))
          );
        }

        LOCAL_LOGGER.log(
          '%c -> elements',
          'color: blue',
          vm.elements()[CURSOR_STACK].current!.element
        );

        LOCAL_LOGGER.log('%c -> constructing', 'color: aqua', vm.elements()['constructing']);
      }
    }
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

export const APPEND_OPCODES = new AppendOpcodes();
