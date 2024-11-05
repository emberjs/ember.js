/**
 * Registers
 *
 * For the most part, these follows MIPS naming conventions, however the
 * register numbers are different.
 */

// $0 or $pc (program counter): pointer into `program` for the next insturction; -1 means exit
export type $pc = 0;
export const $pc: $pc = 0;
// $1 or $ra (return address): pointer into `program` for the return
export type $ra = 1;
export const $ra: $ra = 1;
// $2 or $fp (frame pointer): pointer into the `evalStack` for the base of the stack
export type $fp = 2;
export const $fp: $fp = 2;
// $3 or $sp (stack pointer): pointer into the `evalStack` for the top of the stack
export type $sp = 3;
export const $sp: $sp = 3;
// $4-$5 or $s0-$s1 (saved): callee saved general-purpose registers
export type $s0 = 4;
export const $s0: $s0 = 4;
export type $s1 = 5;
export const $s1: $s1 = 5;
// $6-$7 or $t0-$t1 (temporaries): caller saved general-purpose registers
export type $t0 = 6;
export const $t0: $t0 = 6;
export type $t1 = 7;
export const $t1: $t1 = 7;
// $8 or $v0 (return value)
export type $v0 = 8;
export const $v0 = 8;

export type MachineRegister = $pc | $ra | $fp | $sp;

export function isLowLevelRegister(
  register: Register | MachineRegister
): register is Register & MachineRegister {
  return (register as number) <= $sp;
}

export type SavedRegister = $s0 | $s1;
export type TemporaryRegister = $t0 | $t1;

export type Register = MachineRegister | SavedRegister | TemporaryRegister | $v0;
export type SyscallRegister = SavedRegister | TemporaryRegister | $v0;
