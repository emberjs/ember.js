import { LowLevelVM, VM, UpdatingVM } from './vm';

import { Option, initializeGuid, fillNulls, assert } from '@glimmer/util';
import { recordStackSize, opcodeMetadata } from '@glimmer/debug';
import { $pc, $sp, $ra, $fp } from '@glimmer/vm';
import { RuntimeOp, Op, Maybe, Dict } from '@glimmer/interfaces';
import { LOCAL_DEBUG, LOCAL_SHOULD_LOG } from '@glimmer/local-debug-flags';
// these import bindings will be stripped from build
import { debug, logOpcode } from '@glimmer/debug';
import { DESTROYABLE_STACK, INNER_VM, CONSTANTS, STACKS } from './symbols';
import { InternalVM } from './vm/append';
import { CURSOR_STACK } from './vm/element-builder';
import { isScopeReference } from './scope';
import { valueForRef } from '@glimmer/reference';

export interface OpcodeJSON {
  type: number | string;
  guid?: Option<number>;
  deopted?: boolean;
  args?: string[];
  details?: Dict<Option<string>>;
  children?: OpcodeJSON[];
}

export type Operand1 = number;
export type Operand2 = number;
export type Operand3 = number;

export type Syscall = (vm: InternalVM, opcode: RuntimeOp) => void;
export type MachineOpcode = (vm: LowLevelVM, opcode: RuntimeOp) => void;

export type Evaluate =
  | { syscall: true; evaluate: Syscall }
  | { syscall: false; evaluate: MachineOpcode };

export type DebugState = {
  pc: number;
  sp: number;
  type: number;
  isMachine: 0 | 1;
  size: number;
  params?: Maybe<Dict>;
  name?: string;
  state: unknown;
};

export class AppendOpcodes {
  private evaluateOpcode: Evaluate[] = fillNulls<Evaluate>(Op.Size).slice();

  add<Name extends Op>(name: Name, evaluate: Syscall): void;
  add<Name extends Op>(name: Name, evaluate: MachineOpcode, kind: 'machine'): void;
  add<Name extends Op>(name: Name, evaluate: Syscall | MachineOpcode, kind = 'syscall'): void {
    this.evaluateOpcode[name as number] = {
      syscall: kind !== 'machine',
      evaluate,
    } as Evaluate;
  }

  debugBefore(vm: VM, opcode: RuntimeOp): DebugState {
    let params: Maybe<Dict> = undefined;
    let opName: string | undefined = undefined;

    if (LOCAL_SHOULD_LOG) {
      let pos = vm[INNER_VM].fetchRegister($pc) - opcode.size;

      [opName, params] = debug(vm[CONSTANTS], vm.runtime.resolver, opcode, opcode.isMachine)!;

      // console.log(`${typePos(vm['pc'])}.`);
      console.log(`${pos}. ${logOpcode(opName, params)}`);

      let debugParams = [];
      for (let prop in params) {
        debugParams.push(prop, '=', params[prop]);
      }

      console.log(...debugParams);
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
      let meta = opcodeMetadata(type, isMachine);
      let actualChange = vm.fetchValue($sp) - sp!;
      if (
        meta &&
        meta.check &&
        typeof meta.stackChange! === 'number' &&
        meta.stackChange! !== actualChange
      ) {
        throw new Error(
          `Error in ${pre.name}:\n\n${pc}. ${logOpcode(
            pre.name!,
            pre.params!
          )}\n\nStack changed by ${actualChange}, expected ${meta.stackChange!}`
        );
      }

      if (LOCAL_SHOULD_LOG) {
        console.log(
          '%c -> pc: %d, ra: %d, fp: %d, sp: %d, s0: %O, s1: %O, t0: %O, t1: %O, v0: %O',
          'color: orange',
          vm[INNER_VM].registers[$pc],
          vm[INNER_VM].registers[$ra],
          vm[INNER_VM].registers[$fp],
          vm[INNER_VM].registers[$sp],
          vm['s0'],
          vm['s1'],
          vm['t0'],
          vm['t1'],
          vm['v0']
        );
        console.log('%c -> eval stack', 'color: red', vm.stack.toArray());
        console.log('%c -> block stack', 'color: magenta', vm.elements().debugBlocks());
        console.log('%c -> destructor stack', 'color: violet', vm[DESTROYABLE_STACK].toArray());
        if (vm[STACKS].scope.current === null) {
          console.log('%c -> scope', 'color: green', 'null');
        } else {
          console.log(
            '%c -> scope',
            'color: green',
            vm.scope().slots.map((s) => (isScopeReference(s) ? valueForRef(s) : s))
          );
        }

        console.log('%c -> elements', 'color: blue', vm.elements()[CURSOR_STACK].current!.element);

        console.log('%c -> constructing', 'color: aqua', vm.elements()['constructing']);
      }
    }
  }

  evaluate(vm: VM, opcode: RuntimeOp, type: number) {
    let operation = this.evaluateOpcode[type];

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
      operation.evaluate(vm[INNER_VM], opcode);
    }
  }
}

export const APPEND_OPCODES = new AppendOpcodes();

export abstract class AbstractOpcode {
  public abstract type: string;
  public _guid!: number; // Set by initializeGuid() in the constructor

  constructor() {
    initializeGuid(this);
  }
}

export abstract class UpdatingOpcode extends AbstractOpcode {
  abstract evaluate(vm: UpdatingVM): void;
}
