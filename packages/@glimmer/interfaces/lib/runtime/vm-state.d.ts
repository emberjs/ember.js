export type SyscallRegisters = [
  $pc: null,
  $ra: null,
  $fp: null,
  $sp: null,
  $s0: unknown,
  $s1: unknown,
  $t0: unknown,
  $t1: unknown,
  $v0: unknown,
];

/**
 * Registers
 *
 * For the most part, these follows MIPS naming conventions, however the
 * register numbers are different.
 */

// $0 or $pc (program counter): pointer into `program` for the next insturction; -1 means exit
export type $pc = 0;
declare const $pc: $pc;
// $1 or $ra (return address): pointer into `program` for the return
export type $ra = 1;
declare const $ra: $ra;
// $2 or $fp (frame pointer): pointer into the `evalStack` for the base of the stack
export type $fp = 2;
declare const $fp: $fp;
// $3 or $sp (stack pointer): pointer into the `evalStack` for the top of the stack
export type $sp = 3;
declare const $sp: $sp;
// $4-$5 or $s0-$s1 (saved): callee saved general-purpose registers
export type $s0 = 4;
declare const $s0: $s0;
export type $s1 = 5;
declare const $s1: $s1;
// $6-$7 or $t0-$t1 (temporaries): caller saved general-purpose registers
export type $t0 = 6;
declare const $t0: $t0;
export type $t1 = 7;
declare const $t1: $t1;
// $8 or $v0 (return value)
export type $v0 = 8;
declare const $v0: $v0;

export type MachineRegister = $pc | $ra | $fp | $sp;

export type SavedRegister = $s0 | $s1;
export type TemporaryRegister = $t0 | $t1;

export type Register = MachineRegister | SavedRegister | TemporaryRegister | $v0;
export type SyscallRegister = SavedRegister | TemporaryRegister | $v0;
