import { debug, logOpcode, opcodeMetadata, recordStackSize } from '@glimmer/debug';
import { Dict, Maybe, Op, Option, RuntimeOp } from '@glimmer/interfaces';
import { LOCAL_DEBUG, LOCAL_SHOULD_LOG } from '@glimmer/local-debug-flags';
import { valueForRef } from '@glimmer/reference';
import { assert, fillNulls, initializeGuid, LOCAL_LOGGER } from '@glimmer/util';
import { $fp, $pc, $ra, $sp } from '@glimmer/vm';
import { isScopeReference } from './scope';
import { CONSTANTS, DESTROYABLE_STACK, INNER_VM, STACKS } from './symbols';
import { LowLevelVM, UpdatingVM, VM } from './vm';
import { InternalVM } from './vm/append';
import { CURSOR_STACK } from './vm/element-builder';

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
        LOCAL_LOGGER.log(
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
        LOCAL_LOGGER.log('%c -> eval stack', 'color: red', vm.stack.toArray());
        LOCAL_LOGGER.log('%c -> block stack', 'color: magenta', vm.elements().debugBlocks());
        LOCAL_LOGGER.log(
          '%c -> destructor stack',
          'color: violet',
          vm[DESTROYABLE_STACK].toArray()
        );
        if (vm[STACKS].scope.current === null) {
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
