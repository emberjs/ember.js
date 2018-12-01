/**
 * Registers
 *
 * For the most part, these follows MIPS naming conventions, however the
 * register numbers are different.
 */

// $0 or $pc (program counter): pointer into `program` for the next insturction; -1 means exit
export const $pc: MachineRegister.pc = 0;
// $1 or $ra (return address): pointer into `program` for the return
export const $ra: MachineRegister.ra = 1;
// $2 or $fp (frame pointer): pointer into the `evalStack` for the base of the stack
export const $fp: MachineRegister.fp = 2;
// $3 or $sp (stack pointer): pointer into the `evalStack` for the top of the stack
export const $sp: MachineRegister.sp = 3;
// $4-$5 or $s0-$s1 (saved): callee saved general-purpose registers
export const $s0: SavedRegister.s0 = 4;
export const $s1: SavedRegister.s1 = 5;
// $6-$7 or $t0-$t1 (temporaries): caller saved general-purpose registers
export const $t0: TemporaryRegister.t0 = 6;
export const $t1: TemporaryRegister.t1 = 7;
// $8 or $v0 (return value)
export const $v0 = 8;

export const enum MachineRegister {
  // These must be in sync with the computed values
  // above, but TypeScript doesn't like it

  'pc' = 0,
  'ra' = 1,
  'fp' = 2,
  'sp' = 3,
}

export function isLowLevelRegister(
  register: Register | MachineRegister
): register is Register & MachineRegister {
  return (register as number) <= $sp;
}

export enum SavedRegister {
  's0' = 4,
  's1' = 5,
}

export enum TemporaryRegister {
  't0' = 6,
  't1' = 7,
}

export type Register = MachineRegister | SavedRegister | TemporaryRegister | typeof $v0;
export type SyscallRegister = SavedRegister | TemporaryRegister | typeof $v0;
