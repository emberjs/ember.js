/**
 * Registers
 *
 * For the most part, these follows MIPS naming conventions, however the
 * register numbers are different.
 */

export enum Register {
  // $0 or $pc (program counter): pointer into `program` for the next insturction; -1 means exit
  'pc',

  // $1 or $ra (return address): pointer into `program` for the return
  'ra',

  // $2 or $fp (frame pointer): pointer into the `evalStack` for the base of the stack
  'fp',

  // $3 or $sp (stack pointer): pointer into the `evalStack` for the top of the stack
  'sp',

  // $4-$5 or $s0-$s1 (saved): callee saved general-purpose registers
  's0',
  's1',

  // $6-$7 or $t0-$t1 (temporaries): caller saved general-purpose registers
  't0',
  't1'
}
