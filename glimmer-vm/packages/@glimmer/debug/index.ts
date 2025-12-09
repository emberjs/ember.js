export type { DebugOp, SomeDisassembledOperand } from './lib/debug';
export { debugOp, describeOpcode, logOpcodeSlice, describeOp } from './lib/debug';
export {
  buildEnum,
  buildMetas,
  buildSingleMeta,
  META_KIND,
  normalize,
  normalizeAll,
  normalizeParsed,
  OPERAND_TYPES,
  strip,
} from './lib/metadata';
export { opcodeMetadata } from './lib/opcode-metadata';
export { value as valueFragment } from './lib/render/basic';
export * as fragment from './lib/render/combinators';
export type { IntoFragment } from './lib/render/fragment';
export { as, frag, Fragment, intoFragment } from './lib/render/fragment';
export { DebugLogger } from './lib/render/logger';
export {
  check,
  CheckArray,
  CheckBlockSymbolTable,
  CheckBoolean,
  CheckDict,
  CheckDocumentFragment,
  CheckElement,
  CheckFunction,
  CheckHandle,
  CheckInstanceof,
  CheckInterface,
  CheckMachineRegister,
  CheckMaybe,
  CheckNode,
  CheckNullable,
  CheckNumber,
  CheckObject,
  CheckOr,
  CheckPrimitive,
  CheckProgramSymbolTable,
  CheckRegister,
  CheckSafeString,
  CheckString,
  CheckSyscallRegister,
  CheckUndefined,
  CheckUnknown,
  recordStackSize,
  wrap,
} from './lib/stack-check';
export { type VmDiff, VmSnapshot, type VmSnapshotValueDiff } from './lib/vm/snapshot';
// Types are optimized await automatically
export type {
  NormalizedMetadata,
  NormalizedOpcodes,
  Operand,
  OperandName,
  OperandType,
  RawOperandFormat,
  RawOperandMetadata,
  Stack,
} from './lib/metadata';
export type { Checker } from './lib/stack-check';
