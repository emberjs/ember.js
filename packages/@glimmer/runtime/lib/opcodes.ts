import { LowLevelVM, VM, UpdatingVM } from './vm';

import { Option, Dict, Slice as ListSlice, initializeGuid, fillNulls, assert } from '@glimmer/util';
import { recordStackSize } from '@glimmer/debug';
import { Op, $pc, $sp, $ra, $fp } from '@glimmer/vm';
import { Tag } from '@glimmer/reference';
import { opcodeMetadata } from '@glimmer/vm';
import { Opcode, Opaque } from '@glimmer/interfaces';
import { DEBUG, DEVMODE } from '@glimmer/local-debug-flags';
// these import bindings will be stripped from build
import { debug, logOpcode } from '@glimmer/opcode-compiler';
import { DESTRUCTOR_STACK, INNER_VM, CONSTANTS, STACKS, REGISTERS } from './symbols';
import { InternalVM } from './vm/append';

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

export type Syscall = (vm: InternalVM, opcode: Opcode) => void;
export type MachineOpcode = (vm: LowLevelVM, opcode: Opcode) => void;

export type Evaluate =
  | { syscall: true; evaluate: Syscall }
  | { syscall: false; evaluate: MachineOpcode };

export type DebugState = {
  pc: number;
  sp: number;
  type: number;
  isMachine: 0 | 1;
  size: number;
  params?: object;
  name?: string;
  state: Opaque;
};

export class AppendOpcodes {
  private evaluateOpcode: Evaluate[] = fillNulls<Evaluate>(Op.Size).slice();

  add<Name extends Op>(name: Name, evaluate: Syscall): void;
  add<Name extends Op>(name: Name, evaluate: MachineOpcode, kind: 'machine'): void;
  add<Name extends Op>(name: Name, evaluate: Syscall | MachineOpcode, kind = 'syscall'): void {
    this.evaluateOpcode[name as number] = { syscall: kind === 'syscall', evaluate } as Evaluate;
  }

  debugBefore(vm: VM<Opaque>, opcode: Opcode, type: number): DebugState {
    let params: object | undefined = undefined;
    let opName: string | undefined = undefined;

    if (DEBUG) {
      let pos = vm[INNER_VM].fetchRegister($pc) - opcode.size;
      /* tslint:disable */
      [opName, params] = debug(
        pos,
        vm[CONSTANTS],
        opcode.type,
        opcode.isMachine,
        opcode.op1,
        opcode.op2,
        opcode.op3
      );
      // console.log(`${typePos(vm['pc'])}.`);
      console.log(`${pos}. ${logOpcode(name, params)}`);

      let debugParams = [];
      for (let prop in params) {
        debugParams.push(prop, '=', params[prop]);
      }

      console.log(...debugParams);
      /* tslint:enable */
    }

    let sp: number;
    let state: Opaque;

    if (DEVMODE) {
      let metadata = opcodeMetadata(type, opcode.isMachine);

      if (metadata && metadata.before) {
        state = metadata.before(opcode, vm);
      } else {
        state = undefined;
      }

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
      state,
    };
  }

  debugAfter(vm: VM<Opaque>, pre: DebugState) {
    let { sp, type, isMachine, pc } = pre;

    let meta = opcodeMetadata(type, isMachine);

    if (DEBUG) {
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

      /* tslint:disable */
      console.log(
        '%c -> pc: %d, ra: %d, fp: %d, sp: %d, s0: %O, s1: %O, t0: %O, t1: %O, v0: %O',
        'color: orange',
        vm[REGISTERS][$pc],
        vm[REGISTERS][$ra],
        vm[REGISTERS][$fp],
        vm[REGISTERS][$sp],
        vm['s0'],
        vm['s1'],
        vm['t0'],
        vm['t1'],
        vm['v0']
      );
      console.log('%c -> eval stack', 'color: red', vm.stack.toArray());
      console.log('%c -> block stack', 'color: magenta', vm.elements().debugBlocks());
      console.log('%c -> destructor stack', 'color: violet', vm[DESTRUCTOR_STACK].toArray());
      if (vm[STACKS].scope.current === null) {
        console.log('%c -> scope', 'color: green', 'null');
      } else {
        console.log(
          '%c -> scope',
          'color: green',
          vm.scope()['slots'].map(s => (s && s['value'] ? s['value']() : s))
        );
      }
      console.log(
        '%c -> elements',
        'color: blue',
        vm.elements()['cursorStack']['stack'].map((c: any) => c.element)
      );
      /* tslint:enable */
    }
  }

  evaluate(vm: VM<Opaque>, opcode: Opcode, type: number) {
    let operation = this.evaluateOpcode[type];

    if (operation.syscall) {
      assert(
        !opcode.isMachine,
        `BUG: Mismatch between operation.syscall (${operation.syscall}) and opcode.isMachine (${
          opcode.isMachine
        }) for ${opcode.type}`
      );
      operation.evaluate(vm, opcode);
    } else {
      assert(
        opcode.isMachine,
        `BUG: Mismatch between operation.syscall (${operation.syscall}) and opcode.isMachine (${
          opcode.isMachine
        }) for ${opcode.type}`
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
  public abstract tag: Tag;

  next: Option<UpdatingOpcode> = null;
  prev: Option<UpdatingOpcode> = null;

  abstract evaluate(vm: UpdatingVM): void;
}

export type UpdatingOpSeq = ListSlice<UpdatingOpcode>;
