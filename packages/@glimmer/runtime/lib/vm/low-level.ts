import {
  Option,
  RuntimeHeap,
  MachineOp,
  RuntimeProgram,
  RuntimeOp,
  JitOrAotBlock,
} from '@glimmer/interfaces';
import { APPEND_OPCODES } from '../opcodes';
import VM from './append';
import { DEVMODE } from '@glimmer/local-debug-flags';
import { MachineRegister, $pc, $ra, $fp, $sp } from '@glimmer/vm';
import { assert } from '@glimmer/util';

export interface LowLevelRegisters {
  [MachineRegister.pc]: number;
  [MachineRegister.ra]: number;
  [MachineRegister.sp]: number;
  [MachineRegister.fp]: number;
}

export function initializeRegisters(): LowLevelRegisters {
  return [0, -1, 0, 0];
}

export function initializeRegistersWithSP(sp: number): LowLevelRegisters {
  return [0, -1, sp, 0];
}

export function initializeRegistersWithPC(pc: number): LowLevelRegisters {
  return [pc, -1, 0, 0];
}

export interface Stack {
  pushSmi(value: number): void;
  pushEncodedImmediate(value: number): void;

  getSmi(position: number): number;
  peekSmi(offset?: number): number;
  popSmi(): number;
}

export interface Externs {
  debugBefore(opcode: RuntimeOp): unknown;
  debugAfter(state: unknown): void;
}

export default class LowLevelVM {
  public currentOpSize = 0;

  constructor(
    public stack: Stack,
    public heap: RuntimeHeap,
    public program: RuntimeProgram,
    public externs: Externs,
    readonly registers: LowLevelRegisters
  ) {}

  fetchRegister(register: MachineRegister): number {
    return this.registers[register];
  }

  loadRegister(register: MachineRegister, value: number) {
    this.registers[register] = value;
  }

  setPc(pc: number): void {
    assert(typeof pc === 'number' && !isNaN(pc), 'pc is set to a number');
    this.registers[$pc] = pc;
  }

  // Start a new frame and save $ra and $fp on the stack
  pushFrame() {
    this.stack.pushSmi(this.registers[$ra]);
    this.stack.pushSmi(this.registers[$fp]);
    this.registers[$fp] = this.registers[$sp] - 1;
  }

  // Restore $ra, $sp and $fp
  popFrame() {
    this.registers[$sp] = this.registers[$fp] - 1;
    this.registers[$ra] = this.stack.getSmi(0);
    this.registers[$fp] = this.stack.getSmi(1);
  }

  pushSmallFrame() {
    this.stack.pushSmi(this.registers[$ra]);
  }

  popSmallFrame() {
    this.registers[$ra] = this.stack.popSmi();
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
    assert(handle < 0b1111111111111111, `Jumping to placehoder address`);

    this.registers[$ra] = this.registers[$pc];
    this.setPc(this.heap.getaddr(handle));
  }

  // Put a specific `program` address in $ra
  returnTo(offset: number) {
    this.registers[$ra] = this.target(offset);
  }

  // Return to the `program` address stored in $ra
  return() {
    this.setPc(this.registers[$ra]);
  }

  nextStatement(): Option<RuntimeOp> {
    let { registers, program } = this;

    let pc = registers[$pc];

    assert(typeof pc === 'number', 'pc is a number');

    if (pc === -1) {
      return null;
    }

    // We have to save off the current operations size so that
    // when we do a jump we can calculate the correct offset
    // to where we are going. We can't simply ask for the size
    // in a jump because we have have already incremented the
    // program counter to the next instruction prior to executing.
    let opcode = program.opcode(pc);
    let operationSize = (this.currentOpSize = opcode.size);
    this.registers[$pc] += operationSize;

    return opcode;
  }

  evaluateOuter(opcode: RuntimeOp, vm: VM<JitOrAotBlock>) {
    if (DEVMODE) {
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

  evaluateInner(opcode: RuntimeOp, vm: VM<JitOrAotBlock>) {
    if (opcode.isMachine) {
      this.evaluateMachine(opcode);
    } else {
      this.evaluateSyscall(opcode, vm);
    }
  }

  evaluateMachine(opcode: RuntimeOp) {
    switch (opcode.type) {
      case MachineOp.PushFrame:
        return this.pushFrame();
      case MachineOp.PopFrame:
        return this.popFrame();
      case MachineOp.InvokeStatic:
        return this.call(opcode.op1);
      case MachineOp.InvokeVirtual:
        return this.call(this.stack.popSmi());
      case MachineOp.Jump:
        return this.goto(opcode.op1);
      case MachineOp.Return:
        return this.return();
      case MachineOp.ReturnTo:
        return this.returnTo(opcode.op1);
    }
  }

  evaluateSyscall(opcode: RuntimeOp, vm: VM<JitOrAotBlock>) {
    APPEND_OPCODES.evaluate(vm, opcode, opcode.type);
  }
}
