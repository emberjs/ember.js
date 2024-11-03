export { debug, debugSlice, logOpcode } from './lib/debug';
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
  CheckNumber,
  CheckObject,
  CheckNullable,
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

// Types are optimized await automatically
export type {
  NormalizedMetadata,
  NormalizedOpcodes,
  Operand,
  OperandList,
  OperandName,
  OperandType,
  RawOperandFormat,
  RawOperandMetadata,
  Stack,
} from './lib/metadata';
export type { Checker } from './lib/stack-check';
