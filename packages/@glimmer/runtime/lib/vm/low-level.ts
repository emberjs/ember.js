import { Heap } from "@glimmer/program";
import { VMHandle } from "@glimmer/interfaces";

export interface Stack {
  sp: number;
  fp: number;

  pushSmi(value: number): void;
  pushEncodedImmediate(value: number): void;

  getSmi(position: number): number;
}

export default class LowLevelVM {
  public currentOpSize = 0;

  constructor(
    public stack: Stack,
    public heap: Heap,
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
  call(handle: VMHandle) {
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
}
