const ContentType = {
  Component: 0,
  Helper: 1,
  String: 2,
  Empty: 3,
  SafeString: 4,
  Fragment: 5,
  Node: 6,
  Other: 8
};

const CurriedTypes = {
  Component: 0,
  Helper: 1,
  Modifier: 2
};
const InternalComponentCapabilities = {
  Empty: 0,
  dynamicLayout: 0b0000000000001,
  dynamicTag: 0b0000000000010,
  prepareArgs: 0b0000000000100,
  createArgs: 0b0000000001000,
  attributeHook: 0b0000000010000,
  elementHook: 0b0000000100000,
  dynamicScope: 0b0000001000000,
  createCaller: 0b0000010000000,
  updateHook: 0b0000100000000,
  createInstance: 0b0001000000000,
  wrapped: 0b0010000000000,
  willDestroy: 0b0100000000000,
  hasSubOwner: 0b1000000000000
};
const ARG_SHIFT = 8;
const MAX_SIZE = 0x7fffffff;
const TYPE_SIZE = 0b11111111;
const TYPE_MASK = 0b00000000000000000000000011111111;
const OPERAND_LEN_MASK = 0b00000000000000000000001100000000;
const MACHINE_MASK = 0b00000000000000000000010000000000;

const MachineOp = {
  PushFrame: 0,
  PopFrame: 1,
  InvokeVirtual: 2,
  InvokeStatic: 3,
  Jump: 4,
  Return: 5,
  ReturnTo: 6,
  Size: 7
};
const Op = {
  Helper: 16,
  SetNamedVariables: 17,
  SetBlocks: 18,
  SetVariable: 19,
  SetBlock: 20,
  GetVariable: 21,
  GetProperty: 22,
  GetBlock: 23,
  SpreadBlock: 24,
  HasBlock: 25,
  HasBlockParams: 26,
  Concat: 27,
  Constant: 28,
  ConstantReference: 29,
  Primitive: 30,
  PrimitiveReference: 31,
  ReifyU32: 32,
  Dup: 33,
  Pop: 34,
  Load: 35,
  Fetch: 36,
  RootScope: 37,
  VirtualRootScope: 38,
  ChildScope: 39,
  PopScope: 40,
  Text: 41,
  Comment: 42,
  AppendHTML: 43,
  AppendSafeHTML: 44,
  AppendDocumentFragment: 45,
  AppendNode: 46,
  AppendText: 47,
  OpenElement: 48,
  OpenDynamicElement: 49,
  PushRemoteElement: 50,
  StaticAttr: 51,
  DynamicAttr: 52,
  ComponentAttr: 53,
  FlushElement: 54,
  CloseElement: 55,
  PopRemoteElement: 56,
  Modifier: 57,
  BindDynamicScope: 58,
  PushDynamicScope: 59,
  PopDynamicScope: 60,
  CompileBlock: 61,
  PushBlockScope: 62,
  PushSymbolTable: 63,
  InvokeYield: 64,
  JumpIf: 65,
  JumpUnless: 66,
  JumpEq: 67,
  AssertSame: 68,
  Enter: 69,
  Exit: 70,
  ToBoolean: 71,
  EnterList: 72,
  ExitList: 73,
  Iterate: 74,
  Main: 75,
  ContentType: 76,
  Curry: 77,
  PushComponentDefinition: 78,
  PushDynamicComponentInstance: 79,
  ResolveDynamicComponent: 80,
  ResolveCurriedComponent: 81,
  PushArgs: 82,
  PushEmptyArgs: 83,
  PopArgs: 84,
  PrepareArgs: 85,
  CaptureArgs: 86,
  CreateComponent: 87,
  RegisterComponentDestructor: 88,
  PutComponentOperations: 89,
  GetComponentSelf: 90,
  GetComponentTagName: 91,
  GetComponentLayout: 92,
  BindEvalScope: 93,
  SetupForEval: 94,
  PopulateLayout: 95,
  InvokeComponentLayout: 96,
  BeginComponentTransaction: 97,
  CommitComponentTransaction: 98,
  DidCreateElement: 99,
  DidRenderLayout: 100,
  ResolveMaybeLocal: 102,
  Debugger: 103,
  Size: 104,
  StaticComponentAttr: 105,
  DynamicContentType: 106,
  DynamicHelper: 107,
  DynamicModifier: 108,
  IfInline: 109,
  Not: 110,
  GetDynamicVar: 111,
  Log: 112
};
function isMachineOp(value) {
  return value >= 0 && value <= 15;
}
function isOp(value) {
  return value >= 16;
}

/**
 * Registers
 *
 * For the most part, these follows MIPS naming conventions, however the
 * register numbers are different.
 */

// $0 or $pc (program counter): pointer into `program` for the next insturction; -1 means exit
const $pc = 0;
// $1 or $ra (return address): pointer into `program` for the return
const $ra = 1;
// $2 or $fp (frame pointer): pointer into the `evalStack` for the base of the stack
const $fp = 2;
// $3 or $sp (stack pointer): pointer into the `evalStack` for the top of the stack
const $sp = 3;
// $4-$5 or $s0-$s1 (saved): callee saved general-purpose registers
const $s0 = 4;
const $s1 = 5;
// $6-$7 or $t0-$t1 (temporaries): caller saved general-purpose registers
const $t0 = 6;
const $t1 = 7;
// $8 or $v0 (return value)
const $v0 = 8;
let MachineRegister = /*#__PURE__*/function (MachineRegister) {
  MachineRegister[MachineRegister["pc"] = 0] = "pc";
  MachineRegister[MachineRegister["ra"] = 1] = "ra";
  MachineRegister[MachineRegister["fp"] = 2] = "fp";
  MachineRegister[MachineRegister["sp"] = 3] = "sp";
  return MachineRegister;
}({});
function isLowLevelRegister(register) {
  return register <= $sp;
}
let SavedRegister = /*#__PURE__*/function (SavedRegister) {
  SavedRegister[SavedRegister["s0"] = 4] = "s0";
  SavedRegister[SavedRegister["s1"] = 5] = "s1";
  return SavedRegister;
}({});
let TemporaryRegister = /*#__PURE__*/function (TemporaryRegister) {
  TemporaryRegister[TemporaryRegister["t0"] = 6] = "t0";
  TemporaryRegister[TemporaryRegister["t1"] = 7] = "t1";
  return TemporaryRegister;
}({});

export { $fp, $pc, $ra, $s0, $s1, $sp, $t0, $t1, $v0, ARG_SHIFT, ContentType, CurriedTypes as CurriedType, CurriedTypes, InternalComponentCapabilities, InternalComponentCapabilities as InternalComponentCapability, MACHINE_MASK, MAX_SIZE, MachineOp, MachineRegister, OPERAND_LEN_MASK, Op, SavedRegister, TYPE_MASK, TYPE_SIZE, TemporaryRegister, isLowLevelRegister, isMachineOp, isOp };
