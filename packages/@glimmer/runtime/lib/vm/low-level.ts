import { Heap, Opcode } from '@glimmer/program';
import { Option, Opaque } from '@glimmer/interfaces';
import { APPEND_OPCODES } from '../opcodes';
import VM from './append';
import { DEVMODE } from '@glimmer/local-debug-flags';
import { MachineRegister, $pc, $ra, $fp, $sp, MachineOp } from '@glimmer/vm';

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

export interface Program {
  opcode(offset: number): Opcode;
}

export interface Externs {
  debugBefore(opcode: Opcode): Opaque;
  debugAfter(opcode: Opcode, state: Opaque): void;
}

export default class LowLevelVM {
  public currentOpSize = 0;

  constructor(
    public stack: Stack,
    public heap: Heap,
    public program: Program,
    public externs: Externs,
    readonly registers: LowLevelRegisters
  ) {}

  fetchRegister(register: MachineRegister): number {
    return this.registers[register];
  }

  loadRegister(register: MachineRegister, value: number) {
    this.registers[register] = value;
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
    this.registers[$pc] = this.target(offset);
  }

  target(offset: number) {
    return this.registers[$pc] + offset - this.currentOpSize;
  }

  // Save $pc into $ra, then jump to a new address in `program` (jal in MIPS)
  call(handle: number) {
    this.registers[$ra] = this.registers[$pc];
    this.registers[$pc] = this.heap.getaddr(handle);
  }

  // Put a specific `program` address in $ra
  returnTo(offset: number) {
    this.registers[$ra] = this.target(offset);
  }

  // Return to the `program` address stored in $ra
  return() {
    this.registers[$pc] = this.registers[$ra];
  }

  nextStatement(): Option<Opcode> {
    let { registers, program } = this;

    let pc = registers[$pc];

    if (pc === -1) {
      return null;
    }

    // We have to save off the current operations size so that
    // when we do a jump we can calculate the correct offset
    // to where we are going. We can't simply ask for the size
    // in a jump because we have have already incremented the
    // program counter to the next instruction prior to executing.
    let { size } = this.program.opcode(pc);
    let operationSize = (this.currentOpSize = size);
    this.registers[$pc] += operationSize;

    return program.opcode(pc);
  }

  evaluateOuter(opcode: Opcode, vm: VM<Opaque>) {
    if (DEVMODE) {
      let {
        externs: { debugBefore, debugAfter },
      } = this;
      let state = debugBefore(opcode);
      this.evaluateInner(opcode, vm);
      debugAfter(opcode, state);
    } else {
      this.evaluateInner(opcode, vm);
    }
  }

  evaluateInner(opcode: Opcode, vm: VM<Opaque>) {
    if (opcode.isMachine) {
      this.evaluateMachine(opcode);
    } else {
      this.evaluateSyscall(opcode, vm);
    }
  }

  evaluateMachine(opcode: Opcode) {
    switch (opcode.type) {
      case MachineOp.PushFrame:
        return this.pushFrame();
      case MachineOp.PopFrame:
        return this.popFrame();
      case MachineOp.PushSmallFrame:
        return this.pushSmallFrame();
      case MachineOp.PopSmallFrame:
        return this.popSmallFrame();
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

  evaluateSyscall(opcode: Opcode, vm: VM<Opaque>) {
    APPEND_OPCODES.evaluate(vm, opcode, opcode.type);
  }
}
