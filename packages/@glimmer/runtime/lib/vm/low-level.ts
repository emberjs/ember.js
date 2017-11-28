import { Heap, Opcode } from "@glimmer/program";
import { Option, Opaque } from "@glimmer/interfaces";
import { APPEND_OPCODES } from "../opcodes";
import VM from './append';
import { DEVMODE } from "@glimmer/local-debug-flags";
import { Op } from "@glimmer/vm";

export interface Stack {
  sp: number;
  fp: number;

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
    public pc = -1,
    public ra = -1
  ) {}

  // Start a new frame and save $ra and $fp on the stack
  pushFrame() {
    this.stack.pushSmi(this.ra);
    this.stack.pushSmi(this.stack.fp);
    this.stack.fp = this.stack.sp - 1;
  }

  // Restore $ra, $sp and $fp
  popFrame() {
    this.stack.sp = this.stack.fp - 1;
    this.ra = this.stack.getSmi(0);
    this.stack.fp = this.stack.getSmi(1);
  }

  // Jump to an address in `program`
  goto(offset: number) {
    let addr = (this.pc + offset) - this.currentOpSize;
    this.pc = addr;
  }

  // Save $pc into $ra, then jump to a new address in `program` (jal in MIPS)
  call(handle: number) {
    this.ra = this.pc;
    this.pc = this.heap.getaddr(handle);
  }

  // Put a specific `program` address in $ra
  returnTo(offset: number) {
    let addr = (this.pc + offset) - this.currentOpSize;
    this.ra = addr;
  }

  // Return to the `program` address stored in $ra
  return() {
    this.pc = this.ra;
  }

  nextStatement(): Option<Opcode> {
    let { pc, program } = this;

    if (pc === -1) {
      return null;
    }

    // We have to save off the current operations size so that
    // when we do a jump we can calculate the correct offset
    // to where we are going. We can't simply ask for the size
    // in a jump because we have have already incremented the
    // program counter to the next instruction prior to executing.
    let { size } = this.program.opcode(pc);
    let operationSize = this.currentOpSize = size;
    this.pc += operationSize;

    return program.opcode(pc);
  }

  evaluateOuter(opcode: Opcode, vm: VM<Opaque>) {
    let { externs: { debugBefore, debugAfter } } = this;

    if (DEVMODE) {
      let state = debugBefore(opcode);
      this.evaluateInner(opcode, vm);
      // APPEND_OPCODES.evaluate(vm, opcode, opcode.type);
      debugAfter(opcode, state);
    } else {
      this.evaluateInner(opcode, vm);
      APPEND_OPCODES.evaluate(vm, opcode, opcode.type);
    }
    // if (opcode.isMachine) {
    //   APPEND_OPCODES.evaluateMachine(this, opcode, opcode.type);
    // } else {
    //   this.nextSyscall(opcode, vm);
    // }
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
      case Op.PushFrame:
        return this.pushFrame();
      case Op.PopFrame:
        return this.popFrame();
      case Op.InvokeStatic:
        return this.call(opcode.op1);
      case Op.InvokeVirtual:
        return this.call(this.stack.popSmi());
      case Op.Jump:
        return this.goto(opcode.op1);
      case Op.Return:
        return this.return();
      case Op.ReturnTo:
        return this.returnTo(opcode.op1);
    }
  }

  evaluateSyscall(opcode: Opcode, vm: VM<Opaque>) {
    APPEND_OPCODES.evaluate(vm, opcode, opcode.type);
  }
}
