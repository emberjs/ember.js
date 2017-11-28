import { Option, Dict, Slice as ListSlice, initializeGuid, fillNulls, unreachable, assert } from '@glimmer/util';
import { recordStackSize } from '@glimmer/debug';
import { Op } from '@glimmer/vm';
import { Tag } from '@glimmer/reference';
import { debug, logOpcode } from "@glimmer/opcode-compiler";
import { METADATA } from "@glimmer/vm";
import { Opcode, Opaque } from "@glimmer/interfaces";
import { LowLevelVM, VM, UpdatingVM } from './vm';
import { DEBUG, DEVMODE } from '@glimmer/local-debug-flags';

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

export type Syscall = (vm: VM<Opaque>, opcode: Opcode) => void;
export type MachineOpcode = (vm: LowLevelVM, opcode: Opcode) => void;

export type Evaluate = { syscall: true, evaluate: Syscall } | { syscall: false, evaluate: MachineOpcode };

export type DebugState = { sp: number, state: Opaque };

export class AppendOpcodes {
  private evaluateOpcode: Evaluate[] = fillNulls<Evaluate>(Op.Size).slice();

  add<Name extends Op>(name: Name, evaluate: Syscall): void;
  add<Name extends Op>(name: Name, evaluate: MachineOpcode, kind: 'machine'): void;
  add<Name extends Op>(name: Name, evaluate: Syscall | MachineOpcode, kind = 'syscall'): void {
    this.evaluateOpcode[name as number] = { syscall: kind === 'syscall', evaluate } as Evaluate;
  }

  debugBefore(vm: VM<Opaque>, opcode: Opcode, type: number): DebugState {
    if (DEBUG) {
      /* tslint:disable */
      let [name, params] = debug(vm.constants, opcode.type, opcode.op1, opcode.op2, opcode.op3);
      // console.log(`${typePos(vm['pc'])}.`);
      console.log(`${vm['pc'] - opcode.size}. ${logOpcode(name, params)}`);

      let debugParams = [];
      for (let prop in params) {
        debugParams.push(prop, "=", params[prop]);
      }

      console.log(...debugParams);
      /* tslint:enable */
    }

    let sp: number;
    let state: Opaque;

    if (DEVMODE) {
      let metadata = METADATA[type];

      if (metadata && metadata.before) {
        state = metadata.before(opcode, vm);
      } else {
        state = undefined;
      }

      sp = vm.stack.sp;
    }

    recordStackSize(vm.stack);
    return { sp: sp!, state };
  }

  debugAfter(vm: VM<Opaque>, opcode: Opcode, type: number, pre: DebugState) {
    let expectedChange: number;
    let { sp, state } = pre;

    let metadata = METADATA[type];
    if (metadata !== null) {
      if (typeof metadata.stackChange === 'number') {
        expectedChange = metadata.stackChange;
      } else {
        expectedChange = metadata.stackChange({ opcode, constants: vm.constants, state });
        if (isNaN(expectedChange)) throw unreachable();
      }
    }

    let actualChange = vm.stack.sp - sp!;
    if (metadata && metadata.check && typeof expectedChange! === 'number' && expectedChange! !== actualChange) {
      let [name, params] = debug(vm.constants, opcode.type, opcode.op1, opcode.op2, opcode.op3);

      throw new Error(`Error in ${name}:\n\n${(vm['pc'] + (opcode.size))}. ${logOpcode(name, params)}\n\nStack changed by ${actualChange}, expected ${expectedChange!}`);
    }

    if (DEBUG) {
      /* tslint:disable */
      console.log('%c -> pc: %d, ra: %d, fp: %d, sp: %d, s0: %O, s1: %O, t0: %O, t1: %O, v0: %O', 'color: orange', vm['pc'], vm['ra'], vm['fp'], vm['sp'], vm['s0'], vm['s1'], vm['t0'], vm['t1'], vm['v0']);
      console.log('%c -> eval stack', 'color: red', vm.stack.toArray());
      console.log('%c -> scope', 'color: green', vm.scope()['slots'].map(s => s && s['value'] ? s['value']() : s));
      console.log('%c -> elements', 'color: blue', vm.elements()['cursorStack']['stack'].map((c: any) => c.element));
      /* tslint:enable */
    }
  }

  evaluate(vm: VM<Opaque>, opcode: Opcode, type: number) {
    let operation = this.evaluateOpcode[type];

    if (operation.syscall) {
      assert(!opcode.isMachine, `BUG: Mismatch between operation.syscall (${operation.syscall}) and opcode.isMachine (${opcode.isMachine}) for ${opcode.type}`);
      operation.evaluate(vm, opcode);
    } else {
      assert(opcode.isMachine, `BUG: Mismatch between operation.syscall (${operation.syscall}) and opcode.isMachine (${opcode.isMachine}) for ${opcode.type}`);
      operation.evaluate(vm.inner, opcode);
    }
  }
}

export const APPEND_OPCODES = new AppendOpcodes();

export abstract class AbstractOpcode {
  public type: string;
  public _guid: number;

  constructor() {
    initializeGuid(this);
  }
}

export abstract class UpdatingOpcode extends AbstractOpcode {
  public abstract tag: Tag;

  next: Option<UpdatingOpcode> = null;
  prev: Option<UpdatingOpcode> = null;

  abstract evaluate(vm: UpdatingVM<Opaque>): void;
}

export type UpdatingOpSeq = ListSlice<UpdatingOpcode>;
