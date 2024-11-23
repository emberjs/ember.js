import type { EvaluationContext, Nullable, RuntimeOp } from '@glimmer/interfaces';
import type { MachineRegister } from '@glimmer/vm';
import {
  VM_INVOKE_STATIC_OP,
  VM_INVOKE_VIRTUAL_OP,
  VM_JUMP_OP,
  VM_POP_FRAME_OP,
  VM_PUSH_FRAME_OP,
  VM_RETURN_OP,
  VM_RETURN_TO_OP,
} from '@glimmer/constants';
import { localAssert } from '@glimmer/debug-util';
import { LOCAL_DEBUG } from '@glimmer/local-debug-flags';
import { $fp, $pc, $ra, $sp } from '@glimmer/vm';

import type { DebugState } from '../opcodes';
import type { VM } from './append';

import { APPEND_OPCODES } from '../opcodes';

export type LowLevelRegisters = [$pc: number, $ra: number, $sp: number, $fp: number];

export function initializeRegisters(): LowLevelRegisters {
  return [0, -1, 0, 0];
}

export function restoreRegisters(pc: number, sp: number): LowLevelRegisters {
  return [pc, -1, sp, 0];
}

export function initializeRegistersWithSP(sp: number): LowLevelRegisters {
  return [0, -1, sp, 0];
}

export function initializeRegistersWithPC(pc: number): LowLevelRegisters {
  return [pc, -1, 0, 0];
}

export interface VmStack {
  readonly registers: LowLevelRegisters;

  push(value: unknown): void;
  get(position: number): number;
  pop<T>(): T;

  snapshot?(): unknown[];
}

export interface Externs {
  debugBefore: (opcode: RuntimeOp) => DebugState;
  debugAfter: (state: DebugState) => void;
}

export class LowLevelVM {
  public currentOpSize = 0;
  readonly registers: LowLevelRegisters;
  readonly context: EvaluationContext;

  constructor(
    public stack: VmStack,
    context: EvaluationContext,
    public externs: Externs | undefined,
    registers: LowLevelRegisters
  ) {
    this.context = context;
    this.registers = registers;
  }

  fetchRegister(register: MachineRegister): number {
    return this.registers[register];
  }

  loadRegister(register: MachineRegister, value: number) {
    this.registers[register] = value;
  }

  setPc(pc: number): void {
    localAssert(typeof pc === 'number' && !isNaN(pc), 'pc is set to a number');
    this.registers[$pc] = pc;
  }

  // Start a new frame and save $ra and $fp on the stack
  pushFrame() {
    this.stack.push(this.registers[$ra]);
    this.stack.push(this.registers[$fp]);
    this.registers[$fp] = this.registers[$sp] - 1;
  }

  // Restore $ra, $sp and $fp
  popFrame() {
    this.registers[$sp] = this.registers[$fp] - 1;
    this.registers[$ra] = this.stack.get(0);
    this.registers[$fp] = this.stack.get(1);
  }

  pushSmallFrame() {
    this.stack.push(this.registers[$ra]);
  }

  popSmallFrame() {
    this.registers[$ra] = this.stack.pop();
  }

  // Jump to an address in `program`
  goto(offset: number) {
    this.setPc(this.target(offset));
  }

  target(offset: number) {
    return this.registers[$pc] + offset - this.currentOpSize;
  }

  // Save $pc into $ra, then jump to a new address in `program` (jal in MIPS)
  call(handle: number) {
    localAssert(handle < 0xffffffff, `Jumping to placeholder address`);

    this.registers[$ra] = this.registers[$pc];
    this.setPc(this.context.program.heap.getaddr(handle));
  }

  // Put a specific `program` address in $ra
  returnTo(offset: number) {
    this.registers[$ra] = this.target(offset);
  }

  // Return to the `program` address stored in $ra
  return() {
    this.setPc(this.registers[$ra]);
  }

  nextStatement(): Nullable<RuntimeOp> {
    let { registers, context } = this;

    let pc = registers[$pc];

    localAssert(typeof pc === 'number', 'pc is a number');

    if (pc === -1) {
      return null;
    }

    // We have to save off the current operations size so that
    // when we do a jump we can calculate the correct offset
    // to where we are going. We can't simply ask for the size
    // in a jump because we have have already incremented the
    // program counter to the next instruction prior to executing.
    let opcode = context.program.opcode(pc);
    let operationSize = (this.currentOpSize = opcode.size);
    this.registers[$pc] += operationSize;

    return opcode;
  }

  evaluateOuter(opcode: RuntimeOp, vm: VM) {
    if (LOCAL_DEBUG && this.externs) {
      let {
        externs: { debugBefore, debugAfter },
      } = this;
      let state = debugBefore(opcode);
      this.evaluateInner(opcode, vm);
      debugAfter(state);
    } else {
      this.evaluateInner(opcode, vm);
    }
  }

  evaluateInner(opcode: RuntimeOp, vm: VM) {
    if (opcode.isMachine) {
      this.evaluateMachine(opcode, vm);
    } else {
      this.evaluateSyscall(opcode, vm);
    }
  }

  evaluateMachine(opcode: RuntimeOp, vm: VM) {
    switch (opcode.type) {
      case VM_PUSH_FRAME_OP:
        return void this.pushFrame();
      case VM_POP_FRAME_OP:
        return void this.popFrame();
      case VM_INVOKE_STATIC_OP:
        return void this.call(opcode.op1);
      case VM_INVOKE_VIRTUAL_OP:
        return void vm.call(this.stack.pop());
      case VM_JUMP_OP:
        return void this.goto(opcode.op1);
      case VM_RETURN_OP:
        return void vm.return();
      case VM_RETURN_TO_OP:
        return void this.returnTo(opcode.op1);
    }
  }

  evaluateSyscall(opcode: RuntimeOp, vm: VM) {
    APPEND_OPCODES.evaluate(vm, opcode, opcode.type);
  }
}
