export { isMachineOp, isOp } from './lib/opcodes';
export {
  MachineRegister,
  SyscallRegister,
  SavedRegister,
  TemporaryRegister,
  Register,
  isLowLevelRegister,
  $pc,
  $fp,
  $ra,
  $sp,
  $s0,
  $s1,
  $t0,
  $t1,
  $v0,
} from './lib/registers';
export { opcodeMetadata } from './lib/-debug-strip';
