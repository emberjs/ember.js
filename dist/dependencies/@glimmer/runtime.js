import { DEBUG } from '@glimmer/env';
import { CheckInterface, CheckFunction, WrapCheck, CheckNullable, CheckInstanceof, CheckArray, CheckDict, CheckUnknown, CheckOr, CheckObject, CheckString, CheckNumber, CheckProgramSymbolTable, CheckHandle, CheckBlockSymbolTable, check, CheckPrimitive, CheckSyscallRegister, CheckElement, CheckMaybe, CheckNode, CheckSafeString, CheckDocumentFragment, snapshotVM, DebugLogger, DebugState, DiffState, frag } from '@glimmer/debug';
import { destroy, associateDestroyableChild, registerDestructor, _hasDestroyableChildren, isDestroying, isDestroyed, destroyChildren } from '@glimmer/destroyable';
export { destroy, isDestroyed, isDestroying, registerDestructor } from '@glimmer/destroyable';
import { managerHasCapability, setInternalComponentManager, setInternalModifierManager, hasInternalComponentManager, hasInternalHelperManager, setInternalHelperManager, getInternalHelperManager, hasValue, hasDestroyable } from '@glimmer/manager';
import { emptyArray, EMPTY_STRING_ARRAY, dict, enumerate, unwrap, decodeHandle, isHandle, decodeImmediate, decodeBoolean, assert, expect, mapResult, Results, isObject, assign, stringifyDebugLabel, debugToString, devmode, unwrapTemplate, chainResult, castToSimple, buildUntouchableThis, unreachable, EarlyError, unwrapHandle, createWithDescription, reverse, LOCAL_LOGGER, getDescription, Ok, clearElement, INSERT_AFTER_BEGIN, INSERT_BEFORE_END, castToBrowser, NS_SVG, isDict, UserException, Stack, PresentStack, BalancedStack, parentDebugFrames, COMMENT_NODE, fillNulls, INSERT_BEFORE_BEGIN } from '@glimmer/util';
import { Op, $sp, $t0, CurriedTypes, $t1, InternalComponentCapabilities, $v0, $s1, $s0, isLowLevelRegister, STRING_CONTENT, CURRIED_COMPONENT, COMPONENT_CONTENT, CURRIED_HELPER, HELPER_CONTENT, SAFE_STRING_CONTENT, FRAGMENT_CONTENT, NODE_CONTENT, OpSize, $pc, $ra, $fp, $up } from '@glimmer/vm';
import { UNDEFINED_REFERENCE, createDebugAliasRef, MutableCell, ReadonlyCell, createPrimitiveCell, ResultFormula, readReactive, isConstant, Formula, unwrapReactive, getReactiveProperty, TRUE_REFERENCE, FALSE_REFERENCE, createIteratorRef, createIteratorItemRef, writeCell, readCell, NULL_REFERENCE, isMutRef, updateReactive, Accessor, INTERNAL_REFERENCE } from '@glimmer/reference';
import { COMPUTE, CONSTANT_TAG, consumeTag, valueForTag, validateTag, CURRENT_TAG, beginTrackFrame, endTrackFrame, resetTracking, createCache, debug, INITIAL, track, updateTag, createUpdatableTag, getValue } from '@glimmer/validator';
import { toBool, assertGlobalContextWasSet, getPath, setPath, warnIfStyleNotTrusted, deprecate } from '@glimmer/global-context';
import { RuntimeProgramImpl } from '@glimmer/program';
import { getOwner } from '@glimmer/owner';

/** @internal */
function hasCustomDebugRenderTreeLifecycle(manager) {
  return 'getDebugCustomRenderTree' in manager;
}

function resolveComponent(resolver, constants, name, owner) {
  let definition = resolver.lookupComponent(name, expect(owner, 'BUG: expected owner when looking up component'));
  if (DEBUG && !definition) {
    throw new Error(`Attempted to resolve \`${name}\`, which was expected to be a component, but nothing was found.`);
  }
  return constants.resolvedComponent(definition, name);
}

const TYPE = Symbol('TYPE');
const INNER = Symbol('INNER');
const OWNER = Symbol('OWNER');
const ARGS = Symbol('ARGS');
const RESOLVED = Symbol('RESOLVED');
const CURRIED_VALUES = new WeakSet();
function isCurriedValue(value) {
  return CURRIED_VALUES.has(value);
}
function isCurried(value, type) {
  return isCurriedValue(value) && value[TYPE] === type;
}
class CurriedValue {
  [TYPE];
  [INNER];
  [OWNER];
  [ARGS];
  [RESOLVED];

  /** @internal */
  constructor(type, inner, owner, args, resolved = false) {
    CURRIED_VALUES.add(this);
    this[TYPE] = type;
    this[INNER] = inner;
    this[OWNER] = owner;
    this[ARGS] = args;
    this[RESOLVED] = resolved;
  }
}
function resolveCurriedValue(curriedValue) {
  let currentWrapper = curriedValue;
  let positional;
  let named;
  let definition, owner, resolved;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    let {
      [ARGS]: curriedArgs,
      [INNER]: inner
    } = currentWrapper;
    if (curriedArgs !== null) {
      let {
        named: curriedNamed,
        positional: curriedPositional
      } = curriedArgs;
      if (curriedPositional.length > 0) {
        positional = positional === undefined ? curriedPositional : curriedPositional.concat(positional);
      }
      if (named === undefined) {
        named = [];
      }
      named.unshift(curriedNamed);
    }
    if (!isCurriedValue(inner)) {
      // Save off the owner that this helper was curried with. Later on,
      // we'll fetch the value of this register and set it as the owner on the
      // new root scope.
      definition = inner;
      owner = currentWrapper[OWNER];
      resolved = currentWrapper[RESOLVED];
      break;
    }
    currentWrapper = inner;
  }
  return {
    definition,
    owner,
    resolved,
    positional,
    named
  };
}
function curry(type, spec, owner, args, resolved = false) {
  return new CurriedValue(type, spec, owner, args, resolved);
}

class AppendOpcodes {
  evaluateOpcode = fillNulls(OpSize).slice();
  add(name, evaluate, kind = 'syscall') {
    this.evaluateOpcode[name] = {
      syscall: kind !== 'machine',
      evaluate
    };
  }
  evaluate(vm, opcode, type) {
    let operation = expect(this.evaluateOpcode[type], `Unknown opcode ${type}`);
    if (operation.syscall) {
      assert(!opcode.isMachine, `BUG: Mismatch between operation.syscall (${operation.syscall}) and opcode.isMachine (${opcode.isMachine}) for ${opcode.type}`);
      operation.evaluate(vm, opcode);
    } else {
      assert(opcode.isMachine, `BUG: Mismatch between operation.syscall (${operation.syscall}) and opcode.isMachine (${opcode.isMachine}) for ${opcode.type}`);
      operation.evaluate(vm.lowLevel, opcode);
    }
  }
}
const APPEND_OPCODES = new AppendOpcodes();

function normalizeStringValue(value) {
  if (isEmpty$2(value)) {
    return '';
  }
  return String(value);
}
function shouldCoerce(value) {
  return isString(value) || isEmpty$2(value) || typeof value === 'boolean' || typeof value === 'number';
}
function isEmpty$2(value) {
  return value === null || value === undefined || typeof value.toString !== 'function';
}
function isSafeString(value) {
  return typeof value === 'object' && value !== null && typeof value.toHTML === 'function';
}
function isNode(value) {
  return typeof value === 'object' && value !== null && typeof value.nodeType === 'number';
}
function isFragment(value) {
  return isNode(value) && value.nodeType === 11;
}
function isString(value) {
  return typeof value === 'string';
}

function createClassListRef(list) {
  return Formula(() => {
    let ret = [];
    for (const ref of list) {
      let value = normalizeStringValue(typeof ref === 'string' ? ref : unwrapReactive(ref));
      if (value) ret.push(value);
    }
    return ret.length === 0 ? null : ret.join(' ');
  });
}

class DynamicScopeImpl {
  bucket;
  constructor(bucket) {
    if (bucket) {
      this.bucket = assign({}, bucket);
    } else {
      this.bucket = {};
    }
  }
  get(key) {
    return unwrap(this.bucket[key]);
  }
  set(key, reference) {
    return this.bucket[key] = reference;
  }
  child() {
    return new DynamicScopeImpl(this.bucket);
  }
}
class PartialScopeImpl {
  static root(self, size = 0, owner) {
    let refs = new Array(size + 1).fill(UNDEFINED_REFERENCE);
    return new PartialScopeImpl(refs, owner, null, null, null).init({
      self
    });
  }
  static sized(size = 0, owner) {
    let refs = new Array(size + 1).fill(UNDEFINED_REFERENCE);
    return new PartialScopeImpl(refs, owner, null, null, null);
  }
  constructor(
  // the 0th slot is `self`
  slots, owner, callerScope,
  // named arguments and blocks passed to a layout that uses eval
  evalScope,
  // locals in scope when the partial was invoked
  partialMap) {
    this.slots = slots;
    this.owner = owner;
    this.callerScope = callerScope;
    this.evalScope = evalScope;
    this.partialMap = partialMap;
  }
  init({
    self
  }) {
    this.slots[0] = self;
    return this;
  }
  getSelf() {
    return this.get(0);
  }
  getSymbol(symbol) {
    return this.get(symbol);
  }
  getBlock(symbol) {
    let block = this.get(symbol);
    return block === UNDEFINED_REFERENCE ? null : block;
  }
  getEvalScope() {
    return this.evalScope;
  }
  getPartialMap() {
    return this.partialMap;
  }
  bind(symbol, value) {
    this.set(symbol, value);
  }
  bindSelf(self) {
    this.set(0, self);
  }
  bindSymbol(symbol, value) {
    this.set(symbol, value);
  }
  bindBlock(symbol, value) {
    this.set(symbol, value);
  }
  bindEvalScope(map) {
    this.evalScope = map;
  }
  bindPartialMap(map) {
    this.partialMap = map;
  }
  bindCallerScope(scope) {
    this.callerScope = scope;
  }
  getCallerScope() {
    return this.callerScope;
  }
  child() {
    return new PartialScopeImpl(this.slots.slice(), this.owner, this.callerScope, this.evalScope, this.partialMap);
  }
  get(index) {
    if (index >= this.slots.length) {
      throw new RangeError(`BUG: cannot get $${index} from scope; length=${this.slots.length}`);
    }
    return this.slots[index];
  }
  set(index, value) {
    if (index >= this.slots.length) {
      throw new RangeError(`BUG: cannot get $${index} from scope; length=${this.slots.length}`);
    }
    this.slots[index] = value;
  }
}

CheckInterface({
  [COMPUTE]: CheckFunction
});
const CheckOperations = WrapCheck(() => CheckNullable(CheckInstanceof(ComponentElementOperations)));
class ReferenceChecker {
  validate(value) {
    return typeof value === 'object' || value !== null || INTERNAL_REFERENCE in value;
  }
  expected() {
    return `Reference`;
  }
}
const CheckReactive = new ReferenceChecker();
const CheckIterator = CheckInterface({
  next: CheckFunction,
  isEmpty: CheckFunction
});
const CheckArguments = WrapCheck(() => CheckInstanceof(VMArgumentsImpl));
const CheckHelper = CheckFunction;
class UndefinedReferenceChecker {
  validate(value) {
    return value === UNDEFINED_REFERENCE;
  }
  expected() {
    return `undefined`;
  }
}
const CheckUndefinedReference = new UndefinedReferenceChecker();
const CheckCapturedArguments = CheckInterface({
  positional: WrapCheck(() => CheckArray(CheckReactive)),
  named: WrapCheck(() => CheckDict(CheckReactive))
});
const CheckScope = WrapCheck(() => CheckInstanceof(PartialScopeImpl));
const CheckComponentManager = CheckInterface({
  getCapabilities: CheckFunction
});
const CheckCapabilities = CheckNumber;
const CheckComponentInstance = CheckInterface({
  definition: CheckUnknown,
  state: CheckUnknown,
  handle: CheckUnknown,
  table: CheckUnknown
});
const CheckCurriedComponentDefinition = CheckOr(CheckObject, CheckFunction);
const CheckContainingMetadata = CheckInterface({
  debugSymbols: CheckNullable(CheckArray(CheckString)),
  moduleName: CheckString
});
const CheckInvocation = CheckInterface({
  handle: CheckNumber,
  symbolTable: CheckProgramSymbolTable,
  meta: CheckNullable(CheckContainingMetadata)
});
CheckInterface({
  setAttribute: CheckFunction
});
const CheckFinishedComponentInstance = CheckInterface({
  definition: CheckUnknown,
  state: CheckUnknown,
  handle: CheckHandle,
  table: CheckProgramSymbolTable
});
const CheckCompilableBlock = CheckInterface({
  compile: CheckFunction,
  symbolTable: CheckBlockSymbolTable
});
const CheckCompilableProgram = CheckInterface({
  compile: CheckFunction,
  symbolTable: CheckProgramSymbolTable
});
const CheckScopeBlock = CheckInterface({
  0: CheckCompilableBlock,
  1: CheckScope,
  2: CheckBlockSymbolTable
});
const CheckComponentDefinition = CheckInterface({
  resolvedName: CheckNullable(CheckString),
  handle: CheckNumber,
  state: CheckOr(CheckObject, CheckFunction),
  manager: CheckComponentManager,
  capabilities: CheckCapabilities,
  compilable: CheckCompilableProgram
});

/*
  The calling convention is:

  * 0-N block arguments at the bottom
  * 0-N positional arguments next (left-to-right)
  * 0-N named arguments next
*/

class VMArgumentsImpl {
  stack = null;
  positional = new PositionalArgumentsImpl();
  named = new NamedArgumentsImpl();
  blocks = new BlockArgumentsImpl();
  empty(stack) {
    let base = stack.registers.sp + 1;
    this.named.empty(stack, base);
    this.positional.empty(stack, base);
    this.blocks.empty(stack, base);
    return this;
  }
  setup(stack, names, blockNames, positionalCount, atNames) {
    this.stack = stack;

    /*
           | ... | blocks      | positional  | named |
           | ... | b0    b1    | p0 p1 p2 p3 | n0 n1 |
     index | ... | 4/5/6 7/8/9 | 10 11 12 13 | 14 15 |
                   ^             ^             ^  ^
                 bbase         pbase       nbase  sp
    */

    let named = this.named;
    let namedCount = names.length;
    let namedBase = stack.registers.sp - namedCount + 1;
    named.setup(stack, namedBase, namedCount, names, atNames);
    let positional = this.positional;
    let positionalBase = namedBase - positionalCount;
    positional.setup(stack, positionalBase, positionalCount);
    let blocks = this.blocks;
    let blocksCount = blockNames.length;
    let blocksBase = positionalBase - blocksCount * 3;
    blocks.setup(stack, blocksBase, blocksCount, blockNames);
  }
  get base() {
    return this.blocks.base;
  }
  get length() {
    return this.positional.length + this.named.length + this.blocks.length * 3;
  }
  at(pos) {
    return this.positional.at(pos);
  }
  realloc(offset) {
    let {
      stack
    } = this;
    if (offset > 0 && stack !== null) {
      let {
        positional,
        named
      } = this;
      let newBase = positional.base + offset;
      let length = positional.length + named.length;
      for (let i = length - 1; i >= 0; i--) {
        stack.copy(i + positional.base, i + newBase);
      }
      positional.base += offset;
      named.base += offset;
      stack.registers.advanceSp(offset);
    }
  }
  capture() {
    let positional = this.positional.length === 0 ? EMPTY_POSITIONAL : this.positional.capture();
    let named = this.named.length === 0 ? EMPTY_NAMED : this.named.capture();
    return {
      named,
      positional
    };
  }
  clear() {
    let {
      stack,
      length
    } = this;
    if (length > 0 && stack !== null) stack.pop(length);
  }
}
const EMPTY_REFERENCES = emptyArray();
class PositionalArgumentsImpl {
  base = 0;
  length = 0;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  stack = null;
  _references = null;
  empty(stack, base) {
    this.stack = stack;
    this.base = base;
    this.length = 0;
    this._references = EMPTY_REFERENCES;
  }
  setup(stack, base, length) {
    this.stack = stack;
    this.base = base;
    this.length = length;
    if (length === 0) {
      this._references = EMPTY_REFERENCES;
    } else {
      this._references = null;
    }
  }
  at(position) {
    let {
      base,
      length,
      stack
    } = this;
    if (position < 0 || position >= length) {
      return UNDEFINED_REFERENCE;
    }
    return check(stack.get(position, base), CheckReactive);
  }
  capture() {
    return this.references;
  }
  prepend(other) {
    let additions = other.length;
    if (additions > 0) {
      let {
        base,
        length,
        stack
      } = this;
      this.base = base = base - additions;
      this.length = length + additions;
      for (let i = 0; i < additions; i++) {
        stack.set(other[i], i, base);
      }
      this._references = null;
    }
  }
  get references() {
    let references = this._references;
    if (!references) {
      let {
        stack,
        base,
        length
      } = this;
      references = this._references = stack.slice(base, base + length);
    }
    return references;
  }
}
class NamedArgumentsImpl {
  base = 0;
  length = 0;
  _references = null;
  _names = EMPTY_STRING_ARRAY;
  _atNames = EMPTY_STRING_ARRAY;
  empty(stack, base) {
    this.stack = stack;
    this.base = base;
    this.length = 0;
    this._references = EMPTY_REFERENCES;
    this._names = EMPTY_STRING_ARRAY;
    this._atNames = EMPTY_STRING_ARRAY;
  }
  setup(stack, base, length, names, atNames) {
    this.stack = stack;
    this.base = base;
    this.length = length;
    if (length === 0) {
      this._references = EMPTY_REFERENCES;
      this._names = EMPTY_STRING_ARRAY;
      this._atNames = EMPTY_STRING_ARRAY;
    } else {
      this._references = null;
      if (atNames) {
        this._names = null;
        this._atNames = names;
      } else {
        this._names = names;
        this._atNames = null;
      }
    }
  }
  get names() {
    let names = this._names;
    if (!names) {
      names = this._names = this._atNames.map(this.toSyntheticName);
    }
    return names;
  }
  get atNames() {
    let atNames = this._atNames;
    if (!atNames) {
      atNames = this._atNames = this._names.map(this.toAtName);
    }
    return atNames;
  }
  has(name) {
    return this.names.indexOf(name) !== -1;
  }
  get(name, atNames = false) {
    let {
      base,
      stack
    } = this;
    let names = atNames ? this.atNames : this.names;
    let idx = names.indexOf(name);
    if (idx === -1) {
      return UNDEFINED_REFERENCE;
    }
    let ref = stack.get(idx, base);
    return createDebugAliasRef(ref, () => atNames ? name : `@${name}`);
  }
  capture() {
    let {
      names,
      references
    } = this;
    let map = dict();
    for (const [i, name] of enumerate(names)) {
      if (DEBUG) {
        map[name] = createDebugAliasRef(unwrap(references[i]), () => `@${name}`);
      } else {
        map[name] = unwrap(references[i]);
      }
    }
    return map;
  }
  merge(other) {
    let keys = Object.keys(other);
    if (keys.length > 0) {
      let {
        names,
        length,
        stack
      } = this;
      let newNames = names.slice();
      for (const name of keys) {
        let idx = newNames.indexOf(name);
        if (idx === -1) {
          length = newNames.push(name);
          stack.push(other[name]);
        }
      }
      this.length = length;
      this._references = null;
      this._names = newNames;
      this._atNames = null;
    }
  }
  get references() {
    let references = this._references;
    if (!references) {
      let {
        base,
        length,
        stack
      } = this;
      references = this._references = stack.slice(base, base + length);
    }
    return references;
  }
  toSyntheticName(name) {
    return name.slice(1);
  }
  toAtName(name) {
    return `@${name}`;
  }
}
function toSymbolName(name) {
  return `&${name}`;
}
const EMPTY_BLOCK_VALUES = emptyArray();
class BlockArgumentsImpl {
  internalValues = null;
  _symbolNames = null;
  internalTag = null;
  names = EMPTY_STRING_ARRAY;
  length = 0;
  base = 0;
  empty(stack, base) {
    this.stack = stack;
    this.names = EMPTY_STRING_ARRAY;
    this.base = base;
    this.length = 0;
    this._symbolNames = null;
    this.internalTag = CONSTANT_TAG;
    this.internalValues = EMPTY_BLOCK_VALUES;
  }
  setup(stack, base, length, names) {
    this.stack = stack;
    this.names = names;
    this.base = base;
    this.length = length;
    this._symbolNames = null;
    if (length === 0) {
      this.internalTag = CONSTANT_TAG;
      this.internalValues = EMPTY_BLOCK_VALUES;
    } else {
      this.internalTag = null;
      this.internalValues = null;
    }
  }
  get values() {
    let values = this.internalValues;
    if (!values) {
      let {
        base,
        length,
        stack
      } = this;
      values = this.internalValues = stack.slice(base, base + length * 3);
    }
    return values;
  }
  has(name) {
    return this.names.indexOf(name) !== -1;
  }
  get(name) {
    let idx = this.names.indexOf(name);
    if (idx === -1) {
      return null;
    }
    let {
      base,
      stack
    } = this;
    let table = check(stack.get(idx * 3, base), CheckNullable(CheckBlockSymbolTable));
    let scope = check(stack.get(idx * 3 + 1, base), CheckNullable(CheckScope));
    let handle = check(stack.get(idx * 3 + 2, base), CheckNullable(CheckOr(CheckHandle, CheckCompilableBlock)));
    return handle === null ? null : [handle, scope, table];
  }
  capture() {
    return new CapturedBlockArgumentsImpl(this.names, this.values);
  }
  get symbolNames() {
    let symbolNames = this._symbolNames;
    if (symbolNames === null) {
      symbolNames = this._symbolNames = this.names.map(toSymbolName);
    }
    return symbolNames;
  }
}
class CapturedBlockArgumentsImpl {
  length;
  constructor(names, values) {
    this.names = names;
    this.values = values;
    this.length = names.length;
  }
  has(name) {
    return this.names.indexOf(name) !== -1;
  }
  get(name) {
    let idx = this.names.indexOf(name);
    if (idx === -1) return null;
    return [this.values[idx * 3 + 2], this.values[idx * 3 + 1], this.values[idx * 3]];
  }
}
function createCapturedArgs(named, positional) {
  return {
    named,
    positional
  };
}
function reifyNamed(named) {
  let reified = dict();
  for (const [key, value] of Object.entries(named)) {
    reified[key] = unwrapReactive(value);
  }
  return reified;
}
function reifyPositional(positional) {
  return positional.map(unwrapReactive);
}
function reifyArgs(args) {
  return {
    named: reifyNamed(args.named),
    positional: reifyPositional(args.positional)
  };
}
const EMPTY_NAMED = Object.freeze(Object.create(null));
const EMPTY_POSITIONAL = EMPTY_REFERENCES;
const EMPTY_ARGS = createCapturedArgs(EMPTY_NAMED, EMPTY_POSITIONAL);

function stackAssert(name, top) {
  return `Expected top of stack to be ${name}, was ${String(top)}`;
}

APPEND_OPCODES.add(Op.PushBegin, (vm, {
  op1: relativePc
}) => {
  const reactiveHandler = check(vm.stack.pop(), CheckNullable(CheckReactive));
  const error = MutableCell(1, 'error boundary');
  vm.stack.push(error);
  if (reactiveHandler) {
    vm.deref(reactiveHandler, handler => {
      if (handler !== null && typeof handler !== 'function') {
        throw vm.earlyError('Expected try handler %r to be a function', reactiveHandler);
      }
      vm.setupBegin(vm.target(relativePc), error, handler);
    });
  } else {
    vm.setupBegin(vm.target(relativePc), error, null);
  }
});
APPEND_OPCODES.add(Op.Begin, vm => {
  vm.begin();
});
APPEND_OPCODES.add(Op.Finally, vm => {
  vm.finally();
});
APPEND_OPCODES.add(Op.ChildScope, vm => vm.pushChildScope());
APPEND_OPCODES.add(Op.PopScope, vm => vm.popScope());
APPEND_OPCODES.add(Op.PushDynamicScope, vm => vm.pushDynamicScope());
APPEND_OPCODES.add(Op.PopDynamicScope, vm => vm.popDynamicScope());
APPEND_OPCODES.add(Op.Constant, (vm, {
  op1: other
}) => {
  vm.stack.push(vm.constants.getValue(decodeHandle(other)));
});
APPEND_OPCODES.add(Op.ConstantReference, (vm, {
  op1: other
}) => {
  vm.stack.push(ReadonlyCell(vm.constants.getValue(decodeHandle(other)), false));
});
APPEND_OPCODES.add(Op.Primitive, (vm, {
  op1: primitive
}) => {
  let stack = vm.stack;
  if (isHandle(primitive)) {
    // it is a handle which does not already exist on the stack
    let value = vm.constants.getValue(decodeHandle(primitive));
    stack.push(value);
  } else {
    // is already an encoded immediate or primitive handle
    stack.push(decodeImmediate(primitive));
  }
});
APPEND_OPCODES.add(Op.PrimitiveReference, vm => {
  let stack = vm.stack;
  let value = check(stack.pop(), CheckPrimitive);
  let ref;
  if (value === undefined) {
    ref = UNDEFINED_REFERENCE;
  } else if (value === null) {
    ref = NULL_REFERENCE;
  } else if (value === true) {
    ref = TRUE_REFERENCE;
  } else if (value === false) {
    ref = FALSE_REFERENCE;
  } else {
    ref = createPrimitiveCell(value);
  }
  stack.push(ref);
});
APPEND_OPCODES.add(Op.InvokeStatic, (vm, {
  op1: handle
}) => vm.call(handle));
APPEND_OPCODES.add(Op.InvokeVirtual, vm => vm.call(vm.stack.pop()));
APPEND_OPCODES.add(Op.Start, vm => vm.start());
APPEND_OPCODES.add(Op.Return, vm => vm.return());
APPEND_OPCODES.add(Op.Dup, (vm, {
  op1: register,
  op2: offset
}) => {
  let position = check(register === $sp ? vm.sp : vm.fp, CheckNumber) - offset;
  vm.stack.dup(position);
});
APPEND_OPCODES.add(Op.Pop, (vm, {
  op1: count
}) => {
  vm.stack.pop(count);
});
APPEND_OPCODES.add(Op.Load, (vm, {
  op1: register
}) => {
  vm.load(check(register, CheckSyscallRegister));
});
APPEND_OPCODES.add(Op.Fetch, (vm, {
  op1: register
}) => {
  vm.fetch(check(register, CheckSyscallRegister));
});
APPEND_OPCODES.add(Op.BindDynamicScope, (vm, {
  op1: _names
}) => {
  let names = vm.constants.getArray(_names);
  vm.bindDynamicScope(names);
});
APPEND_OPCODES.add(Op.Enter, (vm, {
  op1: args,
  op2: begin
}) => {
  vm.enter(args, decodeBoolean(begin));
});
APPEND_OPCODES.add(Op.Exit, vm => {
  vm.exit();
});
APPEND_OPCODES.add(Op.PushSymbolTable, (vm, {
  op1: _table
}) => {
  let stack = vm.stack;
  stack.push(vm.constants.getValue(_table));
});
APPEND_OPCODES.add(Op.PushBlockScope, vm => {
  let stack = vm.stack;
  stack.push(vm.scope);
});
APPEND_OPCODES.add(Op.CompileBlock, vm => {
  let stack = vm.stack;
  let block = stack.pop();
  if (block) {
    stack.push(vm.compile(block));
  } else {
    stack.push(null);
  }
});
APPEND_OPCODES.add(Op.InvokeYield, vm => {
  let {
    stack
  } = vm;

  // pop 3
  let handle = check(stack.pop(), CheckNullable(CheckHandle));
  let scope = check(stack.pop(), CheckNullable(CheckScope));
  let table = check(stack.pop(), CheckNullable(CheckBlockSymbolTable));
  assert(table === null || table && typeof table === 'object' && Array.isArray(table.parameters), stackAssert('Option<BlockSymbolTable>', table));

  // pop 1
  const args = check(vm.stack.pop(), CheckArguments);

  // To balance the pop{Frame,Scope}
  if (table === null) {
    // push 2
    vm.pushFrame();
    // push 0
    vm.pushScope(scope ?? vm.scope);
    return;
  }
  let invokingScope = expect(scope, 'BUG: expected scope');

  // If necessary, create a child scope
  {
    let locals = table.parameters;
    let localsCount = locals.length;
    if (localsCount > 0) {
      invokingScope = invokingScope.child();
      for (let i = 0; i < localsCount; i++) {
        invokingScope.bindSymbol(unwrap(locals[i]), args.at(i));
      }
    }
  }

  // push 2
  vm.pushFrame();
  // push 0
  vm.pushScope(invokingScope);
  vm.call(handle);
});
APPEND_OPCODES.add(Op.JumpIf, (vm, {
  op1: target
}) => {
  let reference = check(vm.stack.pop(), CheckReactive);
  vm.deref(reference, value => {
    if (value === true) vm.goto(target);
    return () => Assert.of(reference, value);
  });
});
APPEND_OPCODES.add(Op.JumpUnless, (vm, {
  op1: target
}) => {
  let reference = check(vm.stack.pop(), CheckReactive);
  vm.deref(reference, value => {
    if (!value) vm.goto(target);
    return () => Assert.of(reference, value);
  });
});
APPEND_OPCODES.add(Op.JumpEq, (vm, {
  op1: target,
  op2: comparison
}) => {
  let other = check(vm.stack.top(), CheckNumber);
  if (other === comparison) {
    vm.goto(target);
  }
});
APPEND_OPCODES.add(Op.AssertSame, vm => {
  let reference = check(vm.stack.top(), CheckReactive);
  vm.deref(reference, value => {
    return () => Assert.of(reference, value);
  });
});
APPEND_OPCODES.add(Op.ToBoolean, vm => {
  let {
    stack
  } = vm;
  let valueRef = check(stack.pop(), CheckReactive);
  stack.push(ResultFormula(() => mapResult(readReactive(valueRef), toBool)));
});
class Assert {
  static of(reactive, value) {
    return new Assert(reactive, value);
  }
  static filtered(reactive, value, filter) {
    return new Assert(reactive, value, filter);
  }
  #reactive;
  #filter;
  #last;
  constructor(reactive, value, filter) {
    this.#reactive = reactive;
    this.#filter = filter;
    this.#last = value;
  }
  evaluate(vm) {
    vm.deref(this.#reactive, value => {
      const currentValue = this.#filter ? this.#filter(value) : value;
      if (this.#last !== currentValue) {
        vm.reset();
      }
      this.#last = currentValue;
    });
  }
}
class JumpIfNotModifiedOpcode {
  tag = CONSTANT_TAG;
  lastRevision = INITIAL;
  target;
  finalize(tag, target) {
    this.target = target;
    this.didModify(tag);
  }
  evaluate(vm) {
    let {
      tag,
      target,
      lastRevision
    } = this;
    if (!vm.alwaysRevalidate && validateTag(tag, lastRevision)) {
      consumeTag(tag);
      vm.goto(expect(target, 'VM BUG: Target must be set before attempting to jump'));
    }
  }
  didModify(tag) {
    this.tag = tag;
    this.lastRevision = valueForTag(this.tag);
    consumeTag(tag);
  }
}
class BeginTrackFrameOpcode {
  constructor() {}
  evaluate() {
    beginTrackFrame(getDescription(this));
  }
}
class EndTrackFrameOpcode {
  constructor(target) {
    this.target = target;
  }
  evaluate() {
    let tag = endTrackFrame();
    this.target.didModify(tag);
  }
}

APPEND_OPCODES.add(Op.Text, (vm, {
  op1: text
}) => {
  vm.elements().appendText(vm.constants.getValue(text));
});
APPEND_OPCODES.add(Op.Comment, (vm, {
  op1: text
}) => {
  vm.elements().appendComment(vm.constants.getValue(text));
});
APPEND_OPCODES.add(Op.OpenElement, (vm, {
  op1: tag
}) => {
  vm.elements().openElement(vm.constants.getValue(tag));
});
APPEND_OPCODES.add(Op.OpenDynamicElement, vm => {
  vm.popReactive(tagName => vm.elements().openElement(tagName), CheckString);
});
APPEND_OPCODES.add(Op.PushRemoteElement, vm => {
  let [reactiveElement, element] = vm.popResult(CheckElement);
  let [reactiveInsertBefore, insertBefore] = vm.popResult(CheckMaybe(CheckNode));
  let [, guid] = vm.popResult(CheckString);
  vm.unwrap(Results([element, insertBefore, guid]), ([element, insertBefore, guid]) => {
    if (!isConstant(reactiveElement)) {
      vm.updateWith(Assert.of(reactiveElement, element));
    }
    if (insertBefore !== undefined && !isConstant(reactiveInsertBefore)) {
      vm.updateWith(Assert.of(reactiveInsertBefore, insertBefore));
    }
    let block = vm.elements().pushRemoteElement(element, guid, insertBefore);
    if (block) vm.associateDestroyable(block);
  });
});
APPEND_OPCODES.add(Op.PopRemoteElement, vm => {
  vm.elements().popRemoteElement();
});
APPEND_OPCODES.add(Op.FlushElement, vm => {
  let operations = check(vm.fetchValue($t0), CheckOperations);
  let modifiers = null;
  if (operations) {
    modifiers = operations.flush(vm);
    vm.loadValue($t0, null);
  }
  vm.elements().flushElement(modifiers);
});
APPEND_OPCODES.add(Op.CloseElement, vm => {
  let modifiers = vm.elements().closeElement();
  if (modifiers !== null) {
    modifiers.forEach(modifier => {
      vm.env.scheduleInstallModifier(modifier);
      const d = modifier.manager.getDestroyable(modifier.state);
      if (d !== null) {
        vm.associateDestroyable(d);
      }
    });
  }
});
APPEND_OPCODES.add(Op.Modifier, (vm, {
  op1: handle
}) => {
  if (vm.env.isInteractive === false) {
    return;
  }
  let owner = vm.getOwner();
  let args = check(vm.stack.pop(), CheckArguments);
  let definition = vm.constants.getValue(handle);
  let {
    manager
  } = definition;
  let {
    constructing
  } = vm.elements();
  let state = manager.create(owner, expect(constructing, 'BUG: ElementModifier could not find the element it applies to'), definition.state, args.capture());
  let instance = {
    manager,
    state,
    definition
  };
  let operations = expect(check(vm.fetchValue($t0), CheckOperations), 'BUG: ElementModifier could not find operations to append to');
  operations.addModifier(instance);
  let tag = manager.getTag(state);
  if (tag !== null) {
    consumeTag(tag);
    return vm.updateWith(new UpdateModifierOpcode(tag, instance));
  }
});
APPEND_OPCODES.add(Op.DynamicModifier, vm => {
  if (vm.env.isInteractive === false) {
    return;
  }
  let {
    stack,
    constants
  } = vm;
  let ref = check(stack.pop(), CheckReactive);
  let args = check(stack.pop(), CheckArguments).capture();
  let {
    constructing
  } = vm.elements();
  let initialOwner = vm.getOwner();
  let instanceRef = Formula(() => {
    let value = unwrapReactive(ref);
    let owner;
    if (!isObject(value)) {
      return;
    }
    let hostDefinition;
    if (isCurried(value, CurriedTypes.Modifier)) {
      let {
        definition: resolvedDefinition,
        owner: curriedOwner,
        positional,
        named
      } = resolveCurriedValue(value);
      hostDefinition = resolvedDefinition;
      owner = curriedOwner;
      if (positional !== undefined) {
        args.positional = positional.concat(args.positional);
      }
      if (named !== undefined) {
        args.named = assign({}, ...named, args.named);
      }
    } else {
      hostDefinition = value;
      owner = initialOwner;
    }
    let handle = constants.modifier(hostDefinition, null, true);
    if (DEBUG && handle === null) {
      const label = stringifyDebugLabel(ref);
      throw new Error(`Expected a dynamic modifier definition, but received an object or function that did not have a modifier manager associated with it. The dynamic invocation was \`{{${String(label)}}}\`, and the incorrect definition is the value at the path \`${label}\`, which was: ${debugToString(hostDefinition)}`);
    }
    let definition = constants.getValue(expect(handle, 'BUG: modifier handle expected'));
    let {
      manager
    } = definition;
    let state = manager.create(owner, expect(constructing, 'BUG: ElementModifier could not find the element it applies to'), definition.state, args);
    return {
      manager,
      state,
      definition
    };
  });
  let result = readReactive(instanceRef);
  if (vm.unwrapResult(result)) {
    const instance = result.value;
    let tag = null;
    if (instance !== undefined) {
      let operations = expect(check(vm.fetchValue($t0), CheckOperations), 'BUG: ElementModifier could not find operations to append to');
      operations.addModifier(instance);
      tag = instance.manager.getTag(instance.state);
      if (tag !== null) {
        consumeTag(tag);
      }
    }
    if (!isConstant(ref) || tag) {
      return vm.updateWith(new UpdateDynamicModifierOpcode(tag, instance, instanceRef));
    }
  }
});
class UpdateModifierOpcode {
  lastUpdated;
  constructor(tag, modifier) {
    this.tag = tag;
    this.modifier = modifier;
    this.lastUpdated = valueForTag(tag);
  }
  evaluate(vm) {
    let {
      modifier,
      tag,
      lastUpdated
    } = this;
    consumeTag(tag);
    if (!validateTag(tag, lastUpdated)) {
      vm.env.scheduleUpdateModifier(modifier);
      this.lastUpdated = valueForTag(tag);
    }
  }
}
class UpdateDynamicModifierOpcode {
  lastUpdated;
  constructor(tag, instance, instanceRef) {
    this.tag = tag;
    this.instance = instance;
    this.instanceRef = instanceRef;
    this.lastUpdated = valueForTag(tag ?? CURRENT_TAG);
  }
  evaluate(vm) {
    let {
      tag,
      lastUpdated,
      instance,
      instanceRef
    } = this;
    let newInstance = unwrapReactive(instanceRef);
    if (newInstance !== instance) {
      if (instance !== undefined) {
        let destroyable = instance.manager.getDestroyable(instance.state);
        if (destroyable !== null) {
          destroy(destroyable);
        }
      }
      if (newInstance !== undefined) {
        let {
          manager,
          state
        } = newInstance;
        let destroyable = manager.getDestroyable(state);
        if (destroyable !== null) {
          associateDestroyableChild(this, destroyable);
        }
        tag = manager.getTag(state);
        if (tag !== null) {
          this.lastUpdated = valueForTag(tag);
        }
        this.tag = tag;
        vm.env.scheduleInstallModifier(newInstance);
      }
      this.instance = newInstance;
    } else if (tag !== null && !validateTag(tag, lastUpdated)) {
      vm.env.scheduleUpdateModifier(instance);
      this.lastUpdated = valueForTag(tag);
    }
    if (tag !== null) {
      consumeTag(tag);
    }
  }
}
APPEND_OPCODES.add(Op.StaticAttr, (vm, {
  op1: _name,
  op2: _value,
  op3: _namespace
}) => {
  let name = vm.constants.getValue(_name);
  let value = vm.constants.getValue(_value);
  let namespace = _namespace ? vm.constants.getValue(_namespace) : null;
  vm.elements().setStaticAttribute(name, value, namespace);
});
APPEND_OPCODES.add(Op.DynamicAttr, (vm, {
  op1: _name,
  op2: _trusting,
  op3: _namespace
}) => {
  let name = vm.constants.getValue(_name);
  let trusting = vm.constants.getValue(_trusting);
  let reference = check(vm.stack.pop(), CheckReactive);
  vm.deref(reference, value => {
    let namespace = _namespace ? vm.constants.getValue(_namespace) : null;
    let attribute = vm.elements().setDynamicAttribute(name, value, trusting, namespace);
    if (!isConstant(reference)) {
      vm.updateWith(new UpdateDynamicAttributeOpcode(reference, attribute, vm.env));
    }
  });
});
class UpdateDynamicAttributeOpcode {
  updateRef;
  constructor(reference, attribute, env) {
    let initialized = false;
    this.updateRef = Formula(() => {
      let value = unwrapReactive(reference);
      if (initialized === true) {
        attribute.update(value, env);
      } else {
        initialized = true;
      }
    });
    unwrapReactive(this.updateRef);
  }
  evaluate(vm) {
    const result = readReactive(this.updateRef);
    if (result.type === 'err') {
      vm.unwind();
    }
  }
}

/**
 * The VM creates a new ComponentInstance data structure for every component
 * invocation it encounters.
 *
 * Similar to how a ComponentDefinition contains state about all components of a
 * particular type, a ComponentInstance contains state specific to a particular
 * instance of a component type. It also contains a pointer back to its
 * component type's ComponentDefinition.
 */

APPEND_OPCODES.add(Op.PushComponentDefinition, (vm, {
  op1: handle
}) => {
  let definition = vm.constants.getValue(handle);
  assert(!!definition, `Missing component for ${handle}`);
  let {
    manager,
    capabilities
  } = definition;
  let instance = {
    definition,
    manager,
    capabilities,
    state: null,
    handle: null,
    table: null,
    lookup: null
  };
  vm.stack.push(instance);
});
APPEND_OPCODES.add(Op.ResolveDynamicComponent, (vm, {
  op1: _isStrict
}) => {
  let stack = vm.stack;
  const reactive = check(stack.pop(), CheckReactive);
  vm.deref(reactive, value => {
    const component = check(value, CheckOr(CheckString, CheckCurriedComponentDefinition));
    let constants = vm.constants;
    let owner = vm.getOwner();
    let isStrict = constants.getValue(_isStrict);
    vm.loadValue($t1, null); // Clear the temp register

    let definition;
    if (typeof component === 'string') {
      if (DEBUG && isStrict) {
        throw new Error(`Attempted to resolve a dynamic component with a string definition, \`${component}\` in a strict mode template. In strict mode, using strings to resolve component definitions is prohibited. You can instead import the component definition and use it directly.`);
      }
      let resolvedDefinition = resolveComponent(vm.runtime.resolver, constants, component, owner);
      definition = expect(resolvedDefinition, `Could not find a component named "${component}"`);
    } else if (isCurriedValue(component)) {
      definition = component;
    } else {
      definition = constants.component(component, owner);
    }
    stack.push(definition);
  });
});
APPEND_OPCODES.add(Op.ResolveCurriedComponent, vm => {
  let stack = vm.stack;
  let ref = check(stack.pop(), CheckReactive);
  vm.deref(ref, value => {
    let constants = vm.constants;
    let definition;
    if (DEBUG && !(typeof value === 'function' || typeof value === 'object' && value !== null)) {
      const label = stringifyDebugLabel(ref);
      throw new Error(`Expected a component definition, but received ${value}. You may have accidentally done <${String(label)}>, where "${label}" was a string instead of a curried component definition. You must either use the component definition directly, or use the {{component}} helper to create a curried component definition when invoking dynamically.`);
    }
    if (isCurriedValue(value)) {
      definition = value;
    } else {
      definition = constants.component(value, vm.getOwner(), true);
      if (DEBUG && definition === null) {
        const label = stringifyDebugLabel(ref);
        throw new Error(`Expected a dynamic component definition, but received an object or function that did not have a component manager associated with it. The dynamic invocation was \`<${label}>\` or \`{{${label}}}\`, and the incorrect definition is the value at the path \`${label}\`, which was: ${debugToString(value)}`);
      }
    }
    stack.push(definition);
  });
});
APPEND_OPCODES.add(Op.PushDynamicComponentInstance, vm => {
  let {
    stack
  } = vm;
  let definition = stack.pop();
  let capabilities, manager;
  if (isCurriedValue(definition)) {
    manager = capabilities = null;
  } else {
    manager = definition.manager;
    capabilities = definition.capabilities;
  }
  stack.push({
    definition,
    capabilities,
    manager,
    state: null,
    handle: null,
    table: null
  });
});
APPEND_OPCODES.add(Op.PushArgs, (vm, {
  op1: _names,
  op2: _blockNames,
  op3: flags
}) => {
  let stack = vm.argumentsStack;
  let names = vm.constants.getArray(_names);
  let positionalCount = flags >> 4;
  let atNames = flags & 0b1000;
  let blockNames = flags & 0b0111 ? vm.constants.getArray(_blockNames) : EMPTY_STRING_ARRAY;
  vm.args.setup(stack, names, blockNames, positionalCount, !!atNames);
  stack.push(vm.args);
});
APPEND_OPCODES.add(Op.PushEmptyArgs, vm => {
  let {
    argumentsStack
  } = vm;
  argumentsStack.push(vm.args.empty(argumentsStack));
});
APPEND_OPCODES.add(Op.CaptureArgs, vm => {
  let stack = vm.stack;
  let args = check(stack.pop(), CheckInstanceof(VMArgumentsImpl));
  let capturedArgs = args.capture();
  stack.push(capturedArgs);
});
APPEND_OPCODES.add(Op.PrepareArgs, (vm, {
  op1: _state
}) => {
  let stack = vm.argumentsStack;
  let instance = vm.fetchValue(check(_state, CheckSyscallRegister));
  let args = check(stack.pop(), CheckInstanceof(VMArgumentsImpl));
  let {
    definition
  } = instance;
  if (isCurried(definition, CurriedTypes.Component)) {
    assert(!definition.manager, "If the component definition was curried, we don't yet have a manager");
    let constants = vm.constants;
    let {
      definition: resolvedDefinition,
      owner,
      resolved,
      positional,
      named
    } = resolveCurriedValue(definition);
    if (resolved === true) {
      definition = resolvedDefinition;
    } else if (typeof resolvedDefinition === 'string') {
      let resolvedValue = vm.runtime.resolver.lookupComponent(resolvedDefinition, owner);
      definition = constants.resolvedComponent(expect(resolvedValue, 'BUG: expected resolved component'), resolvedDefinition);
    } else {
      definition = constants.component(resolvedDefinition, owner);
    }
    if (named !== undefined) {
      args.named.merge(assign({}, ...named));
    }
    if (positional !== undefined) {
      args.realloc(positional.length);
      args.positional.prepend(positional);
    }
    let {
      manager
    } = definition;
    assert(instance.manager === null, 'component instance manager should not be populated yet');
    assert(instance.capabilities === null, 'component instance manager should not be populated yet');
    instance.definition = definition;
    instance.manager = manager;
    instance.capabilities = definition.capabilities;

    // Save off the owner that this component was curried with. Later on,
    // we'll fetch the value of this register and set it as the owner on the
    // new root scope.
    vm.loadValue($t1, owner);
  }
  let {
    manager,
    state
  } = definition;
  let capabilities = instance.capabilities;
  if (!managerHasCapability(manager, capabilities, InternalComponentCapabilities.prepareArgs)) {
    stack.push(args);
    return;
  }
  let blocks = args.blocks.values;
  let blockNames = args.blocks.names;
  let preparedArgs = manager.prepareArgs(state, args);
  if (preparedArgs) {
    args.clear();
    for (let i = 0; i < blocks.length; i++) {
      stack.push(blocks[i]);
    }
    let {
      positional,
      named
    } = preparedArgs;
    let positionalCount = positional.length;
    for (let i = 0; i < positionalCount; i++) {
      stack.push(positional[i]);
    }
    let names = Object.keys(named);
    for (let i = 0; i < names.length; i++) {
      stack.push(named[unwrap(names[i])]);
    }
    args.setup(stack, names, blockNames, positionalCount, false);
  }
  stack.push(args);
});
APPEND_OPCODES.add(Op.CreateComponent, (vm, {
  op1: flags,
  op2: _state
}) => {
  let instance = check(vm.fetchValue(check(_state, CheckSyscallRegister)), CheckComponentInstance);
  let {
    definition,
    manager,
    capabilities
  } = instance;
  if (!managerHasCapability(manager, capabilities, InternalComponentCapabilities.createInstance)) {
    // TODO: Closure and Main components are always invoked dynamically, so this
    // opcode may run even if this capability is not enabled. In the future we
    // should handle this in a better way.
    return;
  }
  let dynamicScope = null;
  if (managerHasCapability(manager, capabilities, InternalComponentCapabilities.dynamicScope)) {
    dynamicScope = vm.dynamicScope;
  }
  let hasDefaultBlock = flags & 1;
  let args = null;
  if (managerHasCapability(manager, capabilities, InternalComponentCapabilities.createArgs)) {
    args = check(vm.stack.top(), CheckArguments);
  }
  let self = null;
  if (managerHasCapability(manager, capabilities, InternalComponentCapabilities.createCaller)) {
    self = vm.getSelf();
  }
  let state = manager.create(vm.getOwner(), definition.state, args, vm.env, dynamicScope, self, !!hasDefaultBlock);

  // We want to reuse the `state` POJO here, because we know that the opcodes
  // only transition at exactly one place.
  instance.state = state;
  if (managerHasCapability(manager, capabilities, InternalComponentCapabilities.updateHook)) {
    vm.updateWith(new UpdateComponentOpcode(state, manager, dynamicScope));
  }
});
APPEND_OPCODES.add(Op.RegisterComponentDestructor, (vm, {
  op1: _state
}) => {
  let {
    manager,
    state,
    capabilities
  } = check(vm.fetchValue(check(_state, CheckSyscallRegister)), CheckComponentInstance);
  let d = manager.getDestroyable(state);
  if (DEBUG && !managerHasCapability(manager, capabilities, InternalComponentCapabilities.willDestroy) && d !== null && typeof 'willDestroy' in d) {
    throw new Error('BUG: Destructor has willDestroy, but the willDestroy capability was not enabled for this component. Pre-destruction hooks must be explicitly opted into');
  }
  if (d) vm.associateDestroyable(d);
});
APPEND_OPCODES.add(Op.BeginComponentTransaction, (vm, {
  op1: _state
}) => {
  const description = devmode(() => {
    let {
      definition,
      manager
    } = check(vm.fetchValue(check(_state, CheckSyscallRegister)), CheckComponentInstance);
    return {
      reason: 'component',
      label: [definition.resolvedName ?? manager.getDebugName(definition.state)]
    };
  });
  vm.beginCacheGroup(description);
  vm.elements().pushSimpleBlock();
});
APPEND_OPCODES.add(Op.PutComponentOperations, vm => {
  vm.loadValue($t0, new ComponentElementOperations());
});
APPEND_OPCODES.add(Op.ComponentAttr, (vm, {
  op1: _name,
  op2: _trusting,
  op3: _namespace
}) => {
  let name = vm.constants.getValue(_name);
  let trusting = vm.constants.getValue(_trusting);
  let reference = check(vm.stack.pop(), CheckReactive);
  let namespace = _namespace ? vm.constants.getValue(_namespace) : null;
  check(vm.fetchValue($t0), CheckInstanceof(ComponentElementOperations)).setAttribute(name, reference, trusting, namespace);
});
APPEND_OPCODES.add(Op.StaticComponentAttr, (vm, {
  op1: _name,
  op2: _value,
  op3: _namespace
}) => {
  let name = vm.constants.getValue(_name);
  let value = vm.constants.getValue(_value);
  let namespace = _namespace ? vm.constants.getValue(_namespace) : null;
  check(vm.fetchValue($t0), CheckInstanceof(ComponentElementOperations)).setStaticAttribute(name, value, namespace);
});
class ComponentElementOperations {
  attributes = dict();
  classes = [];
  modifiers = [];
  setAttribute(name, value, trusting, namespace) {
    let deferred = {
      value,
      namespace,
      trusting
    };
    if (name === 'class') {
      this.classes.push(value);
    }
    this.attributes[name] = deferred;
  }
  setStaticAttribute(name, value, namespace) {
    let deferred = {
      value,
      namespace
    };
    if (name === 'class') {
      this.classes.push(value);
    }
    this.attributes[name] = deferred;
  }
  addModifier(modifier) {
    this.modifiers.push(modifier);
  }
  flush(vm) {
    let type;
    let attributes = this.attributes;
    for (let name in this.attributes) {
      if (name === 'type') {
        type = attributes[name];
        continue;
      }
      let attr = unwrap(this.attributes[name]);
      if (name === 'class') {
        setDeferredAttr(vm, 'class', mergeClasses(this.classes), attr.namespace, attr.trusting);
      } else {
        setDeferredAttr(vm, name, attr.value, attr.namespace, attr.trusting);
      }
    }
    if (type !== undefined) {
      setDeferredAttr(vm, 'type', type.value, type.namespace, type.trusting);
    }
    return this.modifiers;
  }
}
function mergeClasses(classes) {
  if (classes.length === 0) {
    return '';
  }
  if (classes.length === 1) {
    return unwrap(classes[0]);
  }
  if (allStringClasses(classes)) {
    return classes.join(' ');
  }
  return createClassListRef(classes);
}
function allStringClasses(classes) {
  return classes.every(c => typeof c === 'string');
}
function setDeferredAttr(vm, name, reactiveValue, namespace, trusting = false) {
  if (typeof reactiveValue === 'string') {
    vm.elements().setStaticAttribute(name, reactiveValue, namespace);
  } else {
    vm.deref(reactiveValue, value => {
      let attribute = vm.elements().setDynamicAttribute(name, value, trusting, namespace);
      return reactive => new UpdateDynamicAttributeOpcode(reactive, attribute, vm.env);
    });
  }
}
APPEND_OPCODES.add(Op.DidCreateElement, (vm, {
  op1: _state
}) => {
  let {
    definition,
    state
  } = check(vm.fetchValue(check(_state, CheckSyscallRegister)), CheckComponentInstance);
  let {
    manager
  } = definition;
  let operations = check(vm.fetchValue($t0), CheckInstanceof(ComponentElementOperations));
  manager.didCreateElement(state, expect(vm.elements().constructing, `Expected a constructing element in DidCreateOpcode`), operations);
});
APPEND_OPCODES.add(Op.GetComponentSelf, (vm, {
  op1: _state,
  op2: _names
}) => {
  let instance = check(vm.fetchValue(check(_state, CheckSyscallRegister)), CheckComponentInstance);
  let {
    definition,
    state
  } = instance;
  let {
    manager
  } = definition;
  let selfRef = manager.getSelf(state);
  vm.env.withDebug(renderTree => {
    let instance = check(vm.fetchValue(check(_state, CheckSyscallRegister)), CheckComponentInstance);
    let {
      definition,
      manager
    } = instance;
    let args;
    if (vm.stack.top() === vm.args) {
      args = vm.args.capture();
    } else {
      let names = vm.constants.getArray(_names);
      vm.args.setup(vm.argumentsStack, names, [], 0, true);
      args = vm.args.capture();
    }
    let moduleName;
    let compilable = definition.compilable;
    if (compilable === null) {
      assert(managerHasCapability(manager, instance.capabilities, InternalComponentCapabilities.dynamicLayout), 'BUG: No template was found for this component, and the component did not have the dynamic layout capability');
      compilable = manager.getDynamicLayout(state, vm.runtime.resolver);
      if (compilable !== null) {
        moduleName = compilable.moduleName;
      } else {
        moduleName = '__default__.hbs';
      }
    } else {
      moduleName = compilable.moduleName;
    }

    // For tearing down the debugRenderTree
    vm.associateDestroyable(instance);
    if (hasCustomDebugRenderTreeLifecycle(manager)) {
      let nodes = manager.getDebugCustomRenderTree(instance.definition.state, instance.state, args, moduleName);
      nodes.forEach(node => {
        let {
          bucket
        } = node;
        renderTree.create(bucket, node);
        registerDestructor(instance, () => {
          renderTree.willDestroy(bucket);
        });
        vm.updateWith(new DebugRenderTreeUpdateOpcode(bucket));
      });
    } else {
      let name = definition.resolvedName ?? manager.getDebugName(definition.state);
      vm.deref(selfRef, self => {
        renderTree.create(instance, {
          type: 'component',
          name,
          args,
          template: moduleName,
          instance: self
        });
        vm.associateDestroyable(instance);
        registerDestructor(instance, () => {
          renderTree.willDestroy(instance);
        });
        vm.updateWith(new DebugRenderTreeUpdateOpcode(instance));
      });
    }
  });
  vm.stack.push(selfRef);
});
APPEND_OPCODES.add(Op.GetComponentTagName, (vm, {
  op1: _state
}) => {
  let {
    definition,
    state
  } = check(vm.fetchValue(check(_state, CheckSyscallRegister)), CheckComponentInstance);
  let {
    manager
  } = definition;
  let tagName = manager.getTagName(state);

  // User provided value from JS, so we don't bother to encode
  vm.stack.push(tagName);
});

// Dynamic Invocation Only
APPEND_OPCODES.add(Op.GetComponentLayout, (vm, {
  op1: _state
}) => {
  let instance = check(vm.fetchValue(check(_state, CheckSyscallRegister)), CheckComponentInstance);
  let {
    manager,
    definition
  } = instance;
  let {
    stack
  } = vm;
  let {
    compilable
  } = definition;
  if (compilable === null) {
    let {
      capabilities
    } = instance;
    assert(managerHasCapability(manager, capabilities, InternalComponentCapabilities.dynamicLayout), 'BUG: No template was found for this component, and the component did not have the dynamic layout capability');
    compilable = manager.getDynamicLayout(instance.state, vm.runtime.resolver);
    if (compilable === null) {
      if (managerHasCapability(manager, capabilities, InternalComponentCapabilities.wrapped)) {
        compilable = unwrapTemplate(vm.constants.defaultTemplate).asWrappedLayout();
      } else {
        compilable = unwrapTemplate(vm.constants.defaultTemplate).asLayout();
      }
    }
  }
  let handle = vm.compile(compilable);
  stack.push(compilable.symbolTable);
  stack.push(handle);
});
APPEND_OPCODES.add(Op.Main, (vm, {
  op1: register
}) => {
  let definition = check(vm.stack.pop(), CheckComponentDefinition);
  let invocation = check(vm.stack.pop(), CheckInvocation);
  let {
    manager,
    capabilities
  } = definition;
  let state = {
    definition,
    manager,
    capabilities,
    state: null,
    handle: invocation.handle,
    table: invocation.symbolTable,
    lookup: null
  };
  vm.loadValue(check(register, CheckSyscallRegister), state);
});
APPEND_OPCODES.add(Op.PopulateLayout, (vm, {
  op1: register
}) => {
  let {
    stack
  } = vm;

  // In DEBUG handles could be ErrHandle objects
  let handle = check(stack.pop(), CheckHandle);
  let table = check(stack.pop(), CheckProgramSymbolTable);
  let state = check(vm.fetchValue(check(register, CheckSyscallRegister)), CheckComponentInstance);
  state.handle = handle;
  state.table = table;
});
APPEND_OPCODES.add(Op.VirtualRootScope, (vm, {
  op1: register
}) => {
  let {
    table,
    manager,
    capabilities,
    state
  } = check(vm.fetchValue(check(register, CheckSyscallRegister)), CheckFinishedComponentInstance);
  let owner;
  if (managerHasCapability(manager, capabilities, InternalComponentCapabilities.hasSubOwner)) {
    owner = manager.getOwner(state);
    vm.loadValue($t1, null); // Clear the temp register
  } else {
    // Check the temp register to see if an owner was resolved from currying
    owner = vm.fetchValue($t1);
    if (owner === null) {
      // If an owner wasn't found, default to using the current owner. This
      // will happen for normal dynamic component invocation,
      // e.g. <SomeClassicEmberComponent/>
      owner = vm.getOwner();
    } else {
      // Else the owner was found, so clear the temp register. This will happen
      // if we are loading a curried component, e.g. <@someCurriedComponent/>
      vm.loadValue($t1, null);
    }
  }
  vm.pushRootScope(table.symbols.length + 1, owner);
});
APPEND_OPCODES.add(Op.SetupForEval, (vm, {
  op1: register
}) => {
  let state = check(vm.fetchValue(check(register, CheckSyscallRegister)), CheckFinishedComponentInstance);
  if (state.table.hasDebug) {
    let lookup = state.lookup = dict();
    vm.scope.bindEvalScope(lookup);
  }
});
APPEND_OPCODES.add(Op.SetNamedVariables, (vm, {
  op1: register
}) => {
  let state = check(vm.fetchValue(check(register, CheckSyscallRegister)), CheckFinishedComponentInstance);
  let scope = vm.scope;
  let args = check(vm.stack.top(), CheckArguments);
  let callerNames = args.named.atNames;
  for (let i = callerNames.length - 1; i >= 0; i--) {
    let atName = unwrap(callerNames[i]);
    let symbol = state.table.symbols.indexOf(atName);
    let value = args.named.get(atName, true);
    if (symbol !== -1) scope.bindSymbol(symbol + 1, value);
    if (state.lookup) state.lookup[atName] = value;
  }
});
function bindBlock(symbolName, blockName, state, blocks, vm) {
  let symbol = state.table.symbols.indexOf(symbolName);
  let block = blocks.get(blockName);
  if (symbol !== -1) vm.scope.bindBlock(symbol + 1, block);
  if (state.lookup) state.lookup[symbolName] = block;
}
APPEND_OPCODES.add(Op.SetBlocks, (vm, {
  op1: register
}) => {
  let state = check(vm.fetchValue(check(register, CheckSyscallRegister)), CheckFinishedComponentInstance);
  let {
    blocks
  } = check(vm.stack.top(), CheckArguments);
  for (const [i] of enumerate(blocks.names)) {
    bindBlock(unwrap(blocks.symbolNames[i]), unwrap(blocks.names[i]), state, blocks, vm);
  }
});
// Dynamic Invocation Only
APPEND_OPCODES.add(Op.InvokeComponentLayout, (vm, {
  op1: register
}) => {
  let state = check(vm.fetchValue(check(register, CheckSyscallRegister)), CheckFinishedComponentInstance);
  vm.call(state.handle);
});
APPEND_OPCODES.add(Op.DidRenderLayout, (vm, {
  op1: register
}) => {
  let instance = check(vm.fetchValue(check(register, CheckSyscallRegister)), CheckComponentInstance);
  let {
    manager,
    state,
    capabilities
  } = instance;
  let bounds = vm.elements().popBlock();
  vm.env.withDebug(renderTree => {
    if (hasCustomDebugRenderTreeLifecycle(manager)) {
      let nodes = manager.getDebugCustomRenderTree(instance.definition.state, state, EMPTY_ARGS);
      nodes.reverse().forEach(node => {
        let {
          bucket
        } = node;
        renderTree.didRender(bucket, bounds);
        vm.updateWith(new DebugRenderTreeDidRenderOpcode(bucket, bounds));
      });
    } else {
      renderTree.didRender(instance, bounds);
      vm.updateWith(new DebugRenderTreeDidRenderOpcode(instance, bounds));
    }
  });
  if (managerHasCapability(manager, capabilities, InternalComponentCapabilities.createInstance)) {
    let mgr = check(manager, CheckInterface({
      didRenderLayout: CheckFunction
    }));
    mgr.didRenderLayout(state, bounds);
    vm.env.didCreate(instance);
    vm.updateWith(new DidUpdateLayoutOpcode(instance, bounds));
  }
});
APPEND_OPCODES.add(Op.CommitComponentTransaction, vm => {
  vm.commitCacheGroup();
});
class UpdateComponentOpcode {
  constructor(component, manager, dynamicScope) {
    this.component = component;
    this.manager = manager;
    this.dynamicScope = dynamicScope;
  }
  evaluate(_vm) {
    let {
      component,
      manager,
      dynamicScope
    } = this;
    manager.update(component, dynamicScope);
  }
}
class DidUpdateLayoutOpcode {
  constructor(component, bounds) {
    this.component = component;
    this.bounds = bounds;
  }
  evaluate(vm) {
    let {
      component,
      bounds
    } = this;
    let {
      manager,
      state
    } = component;
    manager.didUpdateLayout(state, bounds);
    vm.env.didUpdate(component);
  }
}
class DebugRenderTreeUpdateOpcode {
  constructor(bucket) {
    this.bucket = bucket;
  }
  evaluate(vm) {
    vm.env.withDebug(renderTree => renderTree.update(this.bucket));
  }
}
class DebugRenderTreeDidRenderOpcode {
  constructor(bucket, bounds) {
    this.bucket = bucket;
    this.bounds = bounds;
  }
  evaluate(vm) {
    vm.env.withDebug(renderTree => renderTree.didRender(this.bucket, this.bounds));
  }
}

/* eslint-disable no-console */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const LOCAL_DEBUG = false ;
const LOCAL_TRACE_LOGGING = hasFlag();
const LOCAL_EXPLAIN_LOGGING = hasFlag();
const LOCAL_INTERNALS_LOGGING = hasFlag();
const LOCAL_SUBTLE_LOGGING = hasFlag();
if (LOCAL_INTERNALS_LOGGING || LOCAL_EXPLAIN_LOGGING) {
  console.group('%cLogger Flags:', 'font-weight: normal; color: teal');
  log('LOCAL_DEBUG', LOCAL_DEBUG, 'Enables debug logging for people working on this repository. If this is off, none of the other flags will do anything.');
  log('LOCAL_TRACE_LOGGING', LOCAL_TRACE_LOGGING, `Enables trace logging. This is most useful if you're working on the internals, and includes a trace of compiled templates and a trace of VM execution that includes state changes. If you want to see all of the state, enable LOCAL_SUBTLE_LOGGING.`);
  log('LOCAL_EXPLAIN_LOGGING', LOCAL_EXPLAIN_LOGGING, 'Enables trace explanations (like this one!)');
  log('LOCAL_INTERNALS_LOGGING', LOCAL_INTERNALS_LOGGING, `Enables logging of internal state. This is most useful if you're working on the debug infrastructure itself.`);
  log('LOCAL_SUBTLE_LOGGING', LOCAL_SUBTLE_LOGGING, 'Enables more complete logging, even when the result would be extremely verbose and not usually necessary. Subtle logs are dimmed when enabled.');
  log('audit_logging', getFlag(), 'Enables specific audit logs. These logs are useful during an internal refactor and can help pinpoint exactly where legacy code is being used (e.g. infallible_deref and throwing_deref).');
  log('focus_highlight', getFlag(), `Enables focus highlighting of specific trace logs. This makes it easy to see specific aspects of the trace at a glance.`);
  console.log();
  console.groupEnd();
  function log(flag, value, explanation) {
    const {
      formatted,
      style
    } = format(value);
    const header = [`%c[${flag}]%c %c${formatted}`, `font-weight: normal; background-color: ${style}; color: white`, ``, `font-weight: normal; color: ${style}`];
    if (LOCAL_EXPLAIN_LOGGING) {
      console.group(...header);
      console.log(`%c${explanation}`, 'color: grey');
      console.groupEnd();
    } else {
      console.log(...header);
    }
  }
  function format(flagValue) {
    if (flagValue === undefined || flagValue === false) {
      return {
        formatted: 'off',
        style: 'grey'
      };
    } else if (flagValue === true) {
      return {
        formatted: 'on',
        style: 'green'
      };
    } else if (typeof flagValue === 'string') {
      return {
        formatted: flagValue,
        style: 'blue'
      };
    } else if (Array.isArray(flagValue)) {
      if (flagValue.length === 0) {
        return {
          formatted: 'none',
          style: 'grey'
        };
      }
      return {
        formatted: `[${flagValue.join(', ')}]`,
        style: 'teal'
      };
    } else {
      assertNever();
    }
  }
  function assertNever(_never) {
    throw new Error('unreachable');
  }
}

// This function should turn into a constant `return false` in `!DEBUG`,
// which should inline properly via terser, swc and esbuild.
//
// https://tiny.katz.zone/BNqN3F
function hasFlag(flag) {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  {
    return false;
  }
}
function getFlag(flag) {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  {
    return undefined;
  }
}

class DynamicTextContent {
  constructor(node, reference, lastValue) {
    this.node = node;
    this.reference = reference;
    this.lastValue = lastValue;
  }
  evaluate() {
    let value = unwrapReactive(this.reference);
    let {
      lastValue
    } = this;
    if (value === lastValue) return;
    let normalized;
    if (isEmpty$2(value)) {
      normalized = '';
    } else if (isString(value)) {
      normalized = value;
    } else {
      normalized = String(value);
    }
    if (normalized !== lastValue) {
      let textNode = this.node;
      textNode.nodeValue = this.lastValue = normalized;
    }
  }
}

function toContentType(value) {
  if (shouldCoerce(value)) {
    return STRING_CONTENT;
  } else if (isCurried(value, CURRIED_COMPONENT) || hasInternalComponentManager(value)) {
    return COMPONENT_CONTENT;
  } else if (isCurried(value, CURRIED_HELPER) || hasInternalHelperManager(value)) {
    return HELPER_CONTENT;
  } else if (isSafeString(value)) {
    return SAFE_STRING_CONTENT;
  } else if (isFragment(value)) {
    return FRAGMENT_CONTENT;
  } else if (isNode(value)) {
    return NODE_CONTENT;
  } else {
    return STRING_CONTENT;
  }
}
function toDynamicContentType(value) {
  if (!isObject(value)) {
    return STRING_CONTENT;
  }
  if (isCurried(value, CurriedTypes.Component) || hasInternalComponentManager(value)) {
    return COMPONENT_CONTENT;
  } else {
    if (DEBUG && !isCurried(value, CurriedTypes.Helper) && !hasInternalHelperManager(value)) {
      if (LOCAL_TRACE_LOGGING) {
        LOCAL_LOGGER.error(`Attempted use a dynamic value as a component or helper, but that value did not have an associated component or helper manager. The value was:`, value);
      }
      throw new Error(`Attempted use a dynamic value as a component or helper, but that value did not have an associated component or helper manager.`);
    }
    return HELPER_CONTENT;
  }
}
APPEND_OPCODES.add(Op.ContentType, vm => {
  let reference = check(vm.stack.top(), CheckReactive);
  vm.deref(reference, value => {
    const contentType = toContentType(value);
    vm.stack.push(contentType);
    if (!isConstant(reference)) {
      vm.updateWith(Assert.filtered(reference, contentType, toContentType));
    }
  });
});
APPEND_OPCODES.add(Op.DynamicContentType, vm => {
  let reference = check(vm.stack.top(), CheckReactive);
  vm.deref(reference, value => {
    const contentType = toDynamicContentType(value);
    vm.stack.push(contentType);
    if (!isConstant(reference)) {
      vm.updateWith(Assert.filtered(reference, contentType, toDynamicContentType));
    }
  });
});
APPEND_OPCODES.add(Op.AppendHTML, vm => {
  let reference = check(vm.stack.pop(), CheckReactive);
  vm.deref(reference, html => {
    const string = isEmpty$2(html) ? '' : String(html);
    vm.elements().appendDynamicHTML(check(string, CheckString));
  });
});
APPEND_OPCODES.add(Op.AppendSafeHTML, vm => {
  let reference = check(vm.stack.pop(), CheckReactive);
  vm.deref(reference, value => {
    const html = check(value, CheckSafeString).toHTML();
    const string = isEmpty$2(html) ? '' : check(html, CheckString);
    vm.elements().appendDynamicHTML(string);
  });
});
APPEND_OPCODES.add(Op.AppendText, vm => {
  let reference = check(vm.stack.pop(), CheckReactive);
  vm.deref(reference, value => {
    const string = isEmpty$2(value) ? '' : String(value);
    let node = vm.elements().appendDynamicText(string);
    if (!isConstant(reference)) {
      vm.updateWith(new DynamicTextContent(node, reference, string));
    }
  });
});
APPEND_OPCODES.add(Op.AppendDocumentFragment, vm => {
  let reference = check(vm.stack.pop(), CheckReactive);
  vm.deref(reference, value => {
    vm.elements().appendDynamicFragment(check(value, CheckDocumentFragment));
  });
});
APPEND_OPCODES.add(Op.AppendNode, vm => {
  let reference = check(vm.stack.pop(), CheckReactive);
  vm.deref(reference, value => {
    vm.elements().appendDynamicNode(check(value, CheckNode));
  });
});

function debugCallback(context, get) {
  // eslint-disable-next-line no-console
  console.info('Use `context`, and `get(<path>)` to debug this template.');

  // for example...
  context === get('this');

  // eslint-disable-next-line no-debugger
  debugger;
}
let callback = debugCallback;

// For testing purposes
function setDebuggerCallback(cb) {
  callback = cb;
}
function resetDebuggerCallback() {
  callback = debugCallback;
}
class ScopeInspector {
  locals = dict();
  constructor(scope, symbols, debugInfo) {
    this.scope = scope;
    for (const slot of debugInfo) {
      let name = unwrap(symbols[slot - 1]);
      let ref = scope.getSymbol(slot);
      this.locals[name] = ref;
    }
  }
  get(path) {
    let {
      scope,
      locals
    } = this;
    let parts = path.split('.');
    let [head, ...tail] = path.split('.');
    let evalScope = scope.getEvalScope();
    let ref;
    if (head === 'this') {
      ref = scope.getSelf();
    } else if (locals[head]) {
      ref = unwrap(locals[head]);
    } else if (head.indexOf('@') === 0 && evalScope[head]) {
      ref = evalScope[head];
    } else {
      ref = this.scope.getSelf();
      tail = parts;
    }
    return tail.reduce((r, part) => getReactiveProperty(r, part), ref);
  }
}
APPEND_OPCODES.add(Op.Debugger, (vm, {
  op1: _symbols,
  op2: _debugInfo
}) => {
  let symbols = vm.constants.getArray(_symbols);
  let debugInfo = vm.constants.getArray(decodeHandle(_debugInfo));
  let inspector = new ScopeInspector(vm.scope, symbols, debugInfo);

  // @todo how should {{debugger}} handle errors?
  callback(unwrapReactive(vm.getSelf()), path => unwrapReactive(inspector.get(path)));
});

function createCurryRef(type, inner, owner, args, resolver, isStrict) {
  let lastValue;
  let curriedDefinition;
  return Formula(() => {
    let value = unwrapReactive(inner);
    if (value === lastValue) {
      return curriedDefinition;
    }
    if (isCurried(value, type)) {
      curriedDefinition = args ? curry(type, value, owner, args) : args;
    } else if (type === CurriedTypes.Component && typeof value === 'string' && value) {
      // Only components should enter this path, as helpers and modifiers do not
      // support string based resolution

      if (DEBUG) {
        if (isStrict) {
          throw new Error(`Attempted to resolve a dynamic component with a string definition, \`${value}\` in a strict mode template. In strict mode, using strings to resolve component definitions is prohibited. You can instead import the component definition and use it directly.`);
        }
        let resolvedDefinition = expect(resolver, 'BUG: expected resolver for curried component definitions').lookupComponent(value, owner);
        if (!resolvedDefinition) {
          throw new Error(`Attempted to resolve \`${value}\`, which was expected to be a component, but nothing was found.`);
        }
      }
      curriedDefinition = curry(type, value, owner, args);
    } else if (isObject(value)) {
      curriedDefinition = curry(type, value, owner, args);
    } else {
      curriedDefinition = null;
    }
    lastValue = value;
    return curriedDefinition;
  });
}

function createConcatRef(partsRefs) {
  return ResultFormula(() => {
    const parts = [];
    for (const ref of partsRefs) {
      let result = readReactive(ref);
      if (result.type === 'err') {
        return result;
      }
      const value = result.value;
      if (value !== null && value !== undefined) {
        parts.push(castToString(value));
      }
    }
    return Ok(parts.length > 0 ? parts.join('') : null);
  }, DEBUG ? concatLabel(partsRefs) : undefined);
}
function concatLabel(parts) {
  const body = parts.map(reactive => `{${stringifyDebugLabel(reactive)}}`).join(' + ');
  return `(concat ${body})`;
}
function castToString(value) {
  if (typeof value === 'string') {
    return value;
  } else if (typeof value.toString !== 'function') {
    return '';
  }
  return String(value);
}

APPEND_OPCODES.add(Op.Curry, (vm, {
  op1: type,
  op2: _isStrict
}) => {
  let stack = vm.stack;
  let definition = check(stack.pop(), CheckReactive);
  let capturedArgs = check(stack.pop(), CheckCapturedArguments);
  let owner = vm.getOwner();
  let resolver = vm.runtime.resolver;
  let isStrict = false;
  if (DEBUG) {
    // strict check only happens in DEBUG builds, no reason to load it otherwise
    isStrict = vm.constants.getValue(decodeHandle(_isStrict));
  }
  vm.loadValue($v0, createCurryRef(type, definition, owner, capturedArgs, resolver, isStrict));
});
APPEND_OPCODES.add(Op.DynamicHelper, vm => {
  let stack = vm.stack;
  let ref = check(stack.pop(), CheckReactive);
  let args = check(stack.pop(), CheckArguments).capture();
  let helperRef;
  let initialOwner = vm.getOwner();
  let helperInstanceRef = Formula(() => {
    if (helperRef !== undefined) {
      destroy(helperRef);
    }
    let definition = unwrapReactive(ref);
    if (isCurried(definition, CurriedTypes.Helper)) {
      let {
        definition: resolvedDef,
        owner,
        positional,
        named
      } = resolveCurriedValue(definition);
      let helper = resolveHelper(vm.constants, resolvedDef, ref);
      if (named !== undefined) {
        args.named = assign({}, ...named, args.named);
      }
      if (positional !== undefined) {
        args.positional = positional.concat(args.positional);
      }
      helperRef = helper(args, owner);
      associateDestroyableChild(helperInstanceRef, helperRef);
    } else if (isObject(definition)) {
      let helper = resolveHelper(vm.constants, definition, ref);
      helperRef = helper(args, initialOwner);
      if (_hasDestroyableChildren(helperRef)) {
        associateDestroyableChild(helperInstanceRef, helperRef);
      }
    } else {
      helperRef = UNDEFINED_REFERENCE;
    }
  });
  let helperValueRef = Formula(() => {
    unwrapReactive(helperInstanceRef);
    return unwrapReactive(helperRef);
  });
  vm.associateDestroyable(helperInstanceRef);
  vm.loadValue($v0, helperValueRef);
});
function resolveHelper(constants, definition, ref) {
  let handle = constants.helper(definition, null, true);
  if (DEBUG && handle === null) {
    const label = stringifyDebugLabel(ref);
    throw new Error(`Expected a dynamic helper definition, but received an object or function that did not have a helper manager associated with it. The dynamic invocation was \`{{${String(label)}}}\` or \`(${label})\`, and the incorrect definition is the value at the path \`${label}\`, which was: ${debugToString(definition)}`);
  }
  return constants.getValue(handle);
}
APPEND_OPCODES.add(Op.Helper, (vm, {
  op1: handle
}) => {
  let stack = vm.stack;
  let helper = check(vm.constants.getValue(handle), CheckHelper);
  let args = check(stack.pop(), CheckArguments);

  // @premerge throws but isn't a deref
  let value = helper(args.capture(), vm.getOwner(), vm.dynamicScope);
  if (_hasDestroyableChildren(value)) {
    vm.associateDestroyable(value);
  }
  vm.loadValue($v0, value);
});
APPEND_OPCODES.add(Op.GetVariable, (vm, {
  op1: symbol
}) => {
  let expr = vm.referenceForSymbol(symbol);
  vm.stack.push(expr);
});
APPEND_OPCODES.add(Op.SetVariable, (vm, {
  op1: symbol
}) => {
  let expr = check(vm.stack.pop(), CheckReactive);
  vm.scope.bindSymbol(symbol, expr);
});
APPEND_OPCODES.add(Op.SetBlock, (vm, {
  op1: symbol
}) => {
  let handle = check(vm.stack.pop(), CheckCompilableBlock);
  let scope = check(vm.stack.pop(), CheckScope);
  let table = check(vm.stack.pop(), CheckBlockSymbolTable);
  vm.scope.bindBlock(symbol, [handle, scope, table]);
});
APPEND_OPCODES.add(Op.RootScope, (vm, {
  op1: symbols
}) => {
  vm.pushRootScope(symbols, vm.getOwner());
});
APPEND_OPCODES.add(Op.GetProperty, (vm, {
  op1: _key
}) => {
  let key = vm.constants.getValue(_key);
  let expr = check(vm.stack.pop(), CheckReactive);
  vm.stack.push(getReactiveProperty(expr, key));
});
APPEND_OPCODES.add(Op.GetBlock, (vm, {
  op1: _block
}) => {
  let {
    stack
  } = vm;
  let block = vm.scope.getBlock(_block);
  stack.push(block);
});
APPEND_OPCODES.add(Op.SpreadBlock, vm => {
  let {
    stack
  } = vm;
  let block = check(stack.pop(), CheckNullable(CheckOr(CheckScopeBlock, CheckUndefinedReference)));
  if (block && !isUndefinedReference(block)) {
    let [handleOrCompilable, scope, table] = block;
    stack.push(table);
    stack.push(scope);
    stack.push(handleOrCompilable);
  } else {
    stack.push(null);
    stack.push(null);
    stack.push(null);
  }
});
function isUndefinedReference(input) {
  assert(Array.isArray(input) || input === UNDEFINED_REFERENCE, 'a reference other than UNDEFINED_REFERENCE is illegal here');
  return input === UNDEFINED_REFERENCE;
}
APPEND_OPCODES.add(Op.HasBlock, vm => {
  let {
    stack
  } = vm;
  let block = check(stack.pop(), CheckNullable(CheckOr(CheckScopeBlock, CheckUndefinedReference)));
  if (block && !isUndefinedReference(block)) {
    stack.push(TRUE_REFERENCE);
  } else {
    stack.push(FALSE_REFERENCE);
  }
});
APPEND_OPCODES.add(Op.HasBlockParams, vm => {
  // FIXME(mmun): should only need to push the symbol table
  let block = vm.stack.pop();
  let scope = vm.stack.pop();
  check(block, CheckMaybe(CheckOr(CheckHandle, CheckCompilableBlock)));
  check(scope, CheckMaybe(CheckScope));
  let table = check(vm.stack.pop(), CheckMaybe(CheckBlockSymbolTable));
  let hasBlockParams = table && table.parameters.length;
  vm.stack.push(hasBlockParams ? TRUE_REFERENCE : FALSE_REFERENCE);
});
APPEND_OPCODES.add(Op.Concat, (vm, {
  op1: count
}) => {
  let out = new Array(count);
  for (let i = count; i > 0; i--) {
    let offset = i - 1;
    out[offset] = check(vm.stack.pop(), CheckReactive);
  }
  vm.stack.push(createConcatRef(out));
});
APPEND_OPCODES.add(Op.IfInline, vm => {
  let condition = check(vm.stack.pop(), CheckReactive);
  let truthy = check(vm.stack.pop(), CheckReactive);
  let falsy = check(vm.stack.pop(), CheckReactive);
  vm.stack.push(ResultFormula(() => {
    return chainResult(readReactive(condition), condition => {
      return toBool(condition) ? readReactive(truthy) : readReactive(falsy);
    });
  }));
});
APPEND_OPCODES.add(Op.Not, vm => {
  let ref = check(vm.stack.pop(), CheckReactive);
  vm.stack.push(ResultFormula(() => {
    return mapResult(readReactive(ref), value => !toBool(value));
  }));
});
APPEND_OPCODES.add(Op.GetDynamicVar, vm => {
  let scope = vm.dynamicScope;
  let stack = vm.stack;
  let nameRef = check(stack.pop(), CheckReactive);
  stack.push(ResultFormula(() => {
    return chainResult(readReactive(nameRef), name => {
      return readReactive(scope.get(check(name, CheckString)));
    });
  }));
});
APPEND_OPCODES.add(Op.Log, vm => {
  let {
    positional
  } = check(vm.stack.pop(), CheckArguments).capture();
  vm.loadValue($v0, Formula(() => {
    // eslint-disable-next-line no-console
    console.log(...reifyPositional(positional));
  }));
});

APPEND_OPCODES.add(Op.EnterList, (vm, {
  op1: relativeStart,
  op2: elseTarget
}) => {
  const stack = vm.stack;
  const listRef = check(stack.pop(), CheckReactive);
  const keyRef = check(stack.pop(), CheckReactive);
  vm.deref(keyRef, keyValue => {
    const key = keyValue === null ? '@identity' : String(keyValue);
    const iteratorRef = createIteratorRef(listRef, key);
    vm.deref(iteratorRef, iterator => {
      const isEmpty = iterator.isEmpty();
      vm.updateWith(Assert.filtered(iteratorRef, isEmpty, iterator => iterator.isEmpty()));
      if (isEmpty) {
        vm.goto(elseTarget + 1);
      } else {
        vm.enterList(iteratorRef, relativeStart);
        vm.stack.push(iterator);
      }
    });
  });
});
APPEND_OPCODES.add(Op.ExitList, vm => {
  vm.exitList();
});
APPEND_OPCODES.add(Op.Iterate, (vm, {
  op1: breaks
}) => {
  let stack = vm.stack;
  let iterator = check(stack.top(), CheckIterator);
  let item = iterator.next();
  if (item !== null) {
    vm.registerItem(vm.enterItem(item));
  } else {
    vm.goto(breaks);
  }
});

class CursorImpl {
  constructor(element, nextSibling) {
    this.element = element;
    this.nextSibling = nextSibling;
  }
}
class ConcreteBounds {
  constructor(parentNode, first, last) {
    this.parentNode = parentNode;
    this.first = first;
    this.last = last;
  }
  parentElement() {
    return this.parentNode;
  }
  firstNode() {
    return this.first;
  }
  lastNode() {
    return this.last;
  }
}
function move(bounds, reference) {
  let parent = bounds.parentElement();
  let first = bounds.firstNode();
  let last = bounds.lastNode();
  let current = first;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    let next = current.nextSibling;
    parent.insertBefore(current, reference);
    if (current === last) {
      return next;
    }
    current = expect(next, 'invalid bounds');
  }
}
function clear(bounds) {
  let parent = bounds.parentElement();
  let first = bounds.firstNode();
  let last = bounds.lastNode();
  return clearRange({
    parent,
    first,
    last
  });
}
function clearRange({
  parent,
  first,
  last
}) {
  let current = first ?? parent.firstChild;
  if (!current) {
    return null;
  }
  while (current) {
    const next = current.nextSibling;
    parent.removeChild(current);
    if (current === last) {
      return next;
    }
    current = next;
  }
  return null;
}

const CAPABILITIES = {
  dynamicLayout: false,
  dynamicTag: false,
  prepareArgs: false,
  createArgs: false,
  attributeHook: false,
  elementHook: false,
  createCaller: false,
  dynamicScope: false,
  updateHook: false,
  createInstance: false,
  wrapped: false,
  willDestroy: false,
  hasSubOwner: false
};
class TemplateOnlyComponentManager {
  getCapabilities() {
    return CAPABILITIES;
  }
  getDebugName({
    name
  }) {
    return name;
  }
  getSelf() {
    return NULL_REFERENCE;
  }
  getDestroyable() {
    return null;
  }
}
const TEMPLATE_ONLY_COMPONENT_MANAGER = new TemplateOnlyComponentManager();

// This is only exported for types, don't use this class directly
class TemplateOnlyComponentDefinition {
  constructor(moduleName = '@glimmer/component/template-only', name = '(unknown template-only component)') {
    this.moduleName = moduleName;
    this.name = name;
  }
  toString() {
    return this.moduleName;
  }
}
setInternalComponentManager(TEMPLATE_ONLY_COMPONENT_MANAGER, TemplateOnlyComponentDefinition.prototype);

/**
  This utility function is used to declare a given component has no backing class. When the rendering engine detects this it
  is able to perform a number of optimizations. Templates that are associated with `templateOnly()` will be rendered _as is_
  without adding a wrapping `<div>` (or any of the other element customization behaviors of [@ember/component](/ember/release/classes/Component)).
  Specifically, this means that the template will be rendered as "outer HTML".

  In general, this method will be used by build time tooling and would not be directly written in an application. However,
  at times it may be useful to use directly to leverage the "outer HTML" semantics mentioned above. For example, if an addon would like
  to use these semantics for its templates but cannot be certain it will only be consumed by applications that have enabled the
  `template-only-glimmer-components` optional feature.

  @example

  ```js
  import { templateOnlyComponent } from '@glimmer/runtime';

  export default templateOnlyComponent();
  ```

  @public
  @method templateOnly
  @param {String} moduleName the module name that the template only component represents, this will be used for debugging purposes
  @category EMBER_GLIMMER_SET_COMPONENT_TEMPLATE
*/

function templateOnlyComponent(moduleName, name) {
  return new TemplateOnlyComponentDefinition(moduleName, name);
}

// http://www.w3.org/TR/html/syntax.html#html-integration-point
const SVG_INTEGRATION_POINTS = {
  foreignObject: 1,
  desc: 1,
  title: 1
};

// http://www.w3.org/TR/html/syntax.html#adjust-svg-attributes
// TODO: Adjust SVG attributes

// http://www.w3.org/TR/html/syntax.html#parsing-main-inforeign
// TODO: Adjust SVG elements

// http://www.w3.org/TR/html/syntax.html#parsing-main-inforeign
const BLACKLIST_TABLE = Object.create(null);
class DOMOperations {
  // Set by this.setupUselessElement() in constructor

  constructor(document) {
    this.document = document;
    this.setupUselessElement();
  }

  // split into separate method so that NodeDOMTreeConstruction
  // can override it.
  setupUselessElement() {
    this.uselessElement = this.document.createElement('div');
  }
  createElement(tag, context) {
    let isElementInSVGNamespace, isHTMLIntegrationPoint;
    if (context) {
      isElementInSVGNamespace = context.namespaceURI === NS_SVG || tag === 'svg';
      isHTMLIntegrationPoint = !!SVG_INTEGRATION_POINTS[context.tagName];
    } else {
      isElementInSVGNamespace = tag === 'svg';
      isHTMLIntegrationPoint = false;
    }
    if (isElementInSVGNamespace && !isHTMLIntegrationPoint) {
      // FIXME: This does not properly handle <font> with color, face, or
      // size attributes, which is also disallowed by the spec. We should fix
      // this.
      if (BLACKLIST_TABLE[tag]) {
        throw new Error(`Cannot create a ${tag} inside an SVG context`);
      }
      return this.document.createElementNS(NS_SVG, tag);
    } else {
      return this.document.createElement(tag);
    }
  }
  insertBefore(parent, node, reference) {
    parent.insertBefore(node, reference);
  }
  insertHTMLBefore(parent, nextSibling, html) {
    if (html === '') {
      const comment = this.createComment('');
      parent.insertBefore(comment, nextSibling);
      return new ConcreteBounds(parent, comment, comment);
    }
    const prev = nextSibling ? nextSibling.previousSibling : parent.lastChild;
    let last;
    if (nextSibling === null) {
      parent.insertAdjacentHTML(INSERT_BEFORE_END, html);
      last = expect(parent.lastChild, 'bug in insertAdjacentHTML?');
    } else if (nextSibling instanceof HTMLElement) {
      nextSibling.insertAdjacentHTML('beforebegin', html);
      last = expect(nextSibling.previousSibling, 'bug in insertAdjacentHTML?');
    } else {
      // Non-element nodes do not support insertAdjacentHTML, so add an
      // element and call it on that element. Then remove the element.
      //
      // This also protects Edge, IE and Firefox w/o the inspector open
      // from merging adjacent text nodes. See ./compat/text-node-merging-fix.ts
      const {
        uselessElement
      } = this;
      parent.insertBefore(uselessElement, nextSibling);
      uselessElement.insertAdjacentHTML(INSERT_BEFORE_BEGIN, html);
      last = expect(uselessElement.previousSibling, 'bug in insertAdjacentHTML?');
      parent.removeChild(uselessElement);
    }
    const first = expect(prev ? prev.nextSibling : parent.firstChild, 'bug in insertAdjacentHTML?');
    return new ConcreteBounds(parent, first, last);
  }
  createTextNode(text) {
    return this.document.createTextNode(text);
  }
  createComment(data) {
    return this.document.createComment(data);
  }
}
function moveNodesBefore(source, target, nextSibling) {
  const first = expect(source.firstChild, 'source is empty');
  let last = first;
  let current = first;
  while (current) {
    const next = current.nextSibling;
    target.insertBefore(current, nextSibling);
    last = current;
    current = next;
  }
  return new ConcreteBounds(target, first, last);
}

// Patch:    insertAdjacentHTML on SVG Fix
// Browsers: Safari, IE, Edge, Firefox ~33-34
// Reason:   insertAdjacentHTML does not exist on SVG elements in Safari. It is
//           present but throws an exception on IE and Edge. Old versions of
//           Firefox create nodes in the incorrect namespace.
// Fix:      Since IE and Edge silently fail to create SVG nodes using
//           innerHTML, and because Firefox may create nodes in the incorrect
//           namespace using innerHTML on SVG elements, an HTML-string wrapping
//           approach is used. A pre/post SVG tag is added to the string, then
//           that whole string is added to a div. The created nodes are plucked
//           out and applied to the target location on DOM.
function applySVGInnerHTMLFix(document, DOMClass, svgNamespace) {
  if (!document) return DOMClass;
  if (!shouldApplyFix$1(document, svgNamespace)) {
    return DOMClass;
  }
  const div = document.createElement('div');
  return class DOMChangesWithSVGInnerHTMLFix extends DOMClass {
    insertHTMLBefore(parent, nextSibling, html) {
      if (html === '') {
        return super.insertHTMLBefore(parent, nextSibling, html);
      }
      if (parent.namespaceURI !== svgNamespace) {
        return super.insertHTMLBefore(parent, nextSibling, html);
      }
      return fixSVG(parent, div, html, nextSibling);
    }
  };
}
function fixSVG(parent, div, html, reference) {
  assert(html !== '', 'html cannot be empty');
  let source;

  // This is important, because descendants of the <foreignObject> integration
  // point are parsed in the HTML namespace
  if (parent.tagName.toUpperCase() === 'FOREIGNOBJECT') {
    // IE, Edge: also do not correctly support using `innerHTML` on SVG
    // namespaced elements. So here a wrapper is used.
    const wrappedHtml = '<svg><foreignObject>' + html + '</foreignObject></svg>';
    clearElement(div);
    div.insertAdjacentHTML(INSERT_AFTER_BEGIN, wrappedHtml);
    source = div.firstChild.firstChild;
  } else {
    // IE, Edge: also do not correctly support using `innerHTML` on SVG
    // namespaced elements. So here a wrapper is used.
    const wrappedHtml = '<svg>' + html + '</svg>';
    clearElement(div);
    div.insertAdjacentHTML(INSERT_AFTER_BEGIN, wrappedHtml);
    source = div.firstChild;
  }
  return moveNodesBefore(source, parent, reference);
}
function shouldApplyFix$1(document, svgNamespace) {
  const svg = document.createElementNS(svgNamespace, 'svg');
  try {
    svg.insertAdjacentHTML(INSERT_BEFORE_END, '<circle></circle>');
  } catch (e) {
    // IE, Edge: Will throw, insertAdjacentHTML is unsupported on SVG
    // Safari: Will throw, insertAdjacentHTML is not present on SVG
  } finally {
    // FF: Old versions will create a node in the wrong namespace
    if (svg.childNodes.length === 1 && castToBrowser(unwrap(svg.firstChild), 'SVG').namespaceURI === NS_SVG) {
      // The test worked as expected, no fix required
      // eslint-disable-next-line no-unsafe-finally
      return false;
    }

    // eslint-disable-next-line no-unsafe-finally
    return true;
  }
}

// Patch:    Adjacent text node merging fix
// Browsers: IE, Edge, Firefox w/o inspector open
// Reason:   These browsers will merge adjacent text nodes. For example given
//           <div>Hello</div> with div.insertAdjacentHTML(' world') browsers
//           with proper behavior will populate div.childNodes with two items.
//           These browsers will populate it with one merged node instead.
// Fix:      Add these nodes to a wrapper element, then iterate the childNodes
//           of that wrapper and move the nodes to their target location. Note
//           that potential SVG bugs will have been handled before this fix.
//           Note that this fix must only apply to the previous text node, as
//           the base implementation of `insertHTMLBefore` already handles
//           following text nodes correctly.
function applyTextNodeMergingFix(document, DOMClass) {
  if (!document) return DOMClass;
  if (!shouldApplyFix(document)) {
    return DOMClass;
  }
  return class DOMChangesWithTextNodeMergingFix extends DOMClass {
    uselessComment;
    constructor(document) {
      super(document);
      this.uselessComment = document.createComment('');
    }
    insertHTMLBefore(parent, nextSibling, html) {
      if (html === '') {
        return super.insertHTMLBefore(parent, nextSibling, html);
      }
      let didSetUselessComment = false;
      const nextPrevious = nextSibling ? nextSibling.previousSibling : parent.lastChild;
      if (nextPrevious && nextPrevious instanceof Text) {
        didSetUselessComment = true;
        parent.insertBefore(this.uselessComment, nextSibling);
      }
      const bounds = super.insertHTMLBefore(parent, nextSibling, html);
      if (didSetUselessComment) {
        parent.removeChild(this.uselessComment);
      }
      return bounds;
    }
  };
}
function shouldApplyFix(document) {
  const mergingTextDiv = document.createElement('div');
  mergingTextDiv.appendChild(document.createTextNode('first'));
  mergingTextDiv.insertAdjacentHTML(INSERT_BEFORE_END, 'second');
  if (mergingTextDiv.childNodes.length === 2) {
    // It worked as expected, no fix required
    return false;
  }
  return true;
}

const doc$1 = typeof document === 'undefined' ? null : castToSimple(document);
class TreeConstruction extends DOMOperations {
  createElementNS(namespace, tag) {
    return this.document.createElementNS(namespace, tag);
  }
  setAttribute(element, name, value, namespace = null) {
    if (namespace) {
      element.setAttributeNS(namespace, name, value);
    } else {
      element.setAttribute(name, value);
    }
  }
}
let appliedTreeConstruction = TreeConstruction;
appliedTreeConstruction = applyTextNodeMergingFix(doc$1, appliedTreeConstruction);
appliedTreeConstruction = applySVGInnerHTMLFix(doc$1, appliedTreeConstruction, NS_SVG);
const DOMTreeConstruction = appliedTreeConstruction;

['b', 'big', 'blockquote', 'body', 'br', 'center', 'code', 'dd', 'div', 'dl', 'dt', 'em', 'embed', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'head', 'hr', 'i', 'img', 'li', 'listing', 'main', 'meta', 'nobr', 'ol', 'p', 'pre', 'ruby', 's', 'small', 'span', 'strong', 'strike', 'sub', 'sup', 'table', 'tt', 'u', 'ul', 'var'].forEach(tag => BLACKLIST_TABLE[tag] = 1);
const WHITESPACE = /[\t\n\v\f\r \xA0\u{1680}\u{180e}\u{2000}-\u{200a}\u{2028}\u{2029}\u{202f}\u{205f}\u{3000}\u{feff}]/u;
const doc = typeof document === 'undefined' ? null : castToSimple(document);
function isWhitespace(string) {
  return WHITESPACE.test(string);
}
class DOMChangesImpl extends DOMOperations {
  namespace;
  constructor(document) {
    super(document);
    this.document = document;
    this.namespace = null;
  }
  setAttribute(element, name, value) {
    element.setAttribute(name, value);
  }
  removeAttribute(element, name) {
    element.removeAttribute(name);
  }
  insertAfter(element, node, reference) {
    this.insertBefore(element, node, reference.nextSibling);
  }
}
let helper = DOMChangesImpl;
helper = applyTextNodeMergingFix(doc, helper);
helper = applySVGInnerHTMLFix(doc, helper, NS_SVG);
const DOMChanges = helper;

/*
 * @method normalizeProperty
 * @param element {HTMLElement}
 * @param slotName {String}
 * @returns {Object} { name, type }
 */
function normalizeProperty(element, slotName) {
  let type, normalized;
  if (slotName in element) {
    normalized = slotName;
    type = 'prop';
  } else {
    let lower = slotName.toLowerCase();
    if (lower in element) {
      type = 'prop';
      normalized = lower;
    } else {
      type = 'attr';
      normalized = slotName;
    }
  }
  if (type === 'prop' && (normalized.toLowerCase() === 'style' || preferAttr(element.tagName, normalized))) {
    type = 'attr';
  }
  return {
    normalized,
    type
  };
}

// properties that MUST be set as attributes, due to:
// * browser bug
// * strange spec outlier
const ATTR_OVERRIDES = {
  INPUT: {
    form: true,
    // Chrome 46.0.2464.0: 'autocorrect' in document.createElement('input') === false
    // Safari 8.0.7: 'autocorrect' in document.createElement('input') === false
    // Mobile Safari (iOS 8.4 simulator): 'autocorrect' in document.createElement('input') === true
    autocorrect: true,
    // Chrome 54.0.2840.98: 'list' in document.createElement('input') === true
    // Safari 9.1.3: 'list' in document.createElement('input') === false
    list: true
  },
  // element.form is actually a legitimate readOnly property, that is to be
  // mutated, but must be mutated by setAttribute...
  SELECT: {
    form: true
  },
  OPTION: {
    form: true
  },
  TEXTAREA: {
    form: true
  },
  LABEL: {
    form: true
  },
  FIELDSET: {
    form: true
  },
  LEGEND: {
    form: true
  },
  OBJECT: {
    form: true
  },
  OUTPUT: {
    form: true
  },
  BUTTON: {
    form: true
  }
};
function preferAttr(tagName, propName) {
  let tag = ATTR_OVERRIDES[tagName.toUpperCase()];
  return tag && tag[propName.toLowerCase()] || false;
}

let GUID = 0;
class Ref {
  id = GUID++;
  value;
  constructor(value) {
    this.value = value;
  }
  get() {
    return this.value;
  }
  release() {
    if (DEBUG && this.value === null) {
      throw new Error('BUG: double release?');
    }
    this.value = null;
  }
  toString() {
    let label = `Ref ${this.id}`;
    if (this.value === null) {
      return `${label} (released)`;
    } else {
      try {
        // eslint-disable-next-line @typescript-eslint/no-base-to-string -- @todo
        return `${label}: ${this.value}`;
      } catch {
        return label;
      }
    }
  }
}
class DebugRenderTreeImpl {
  stack = Stack.empty();
  refs = new WeakMap();
  roots = new Set();
  nodes = new WeakMap();
  begin() {
    this.#reset();
  }
  create(state, node) {
    let internalNode = assign({}, node, {
      bounds: null,
      refs: new Set()
    });
    this.nodes.set(state, internalNode);
    this.#appendChild(internalNode, state);
    this.#enter(state);
  }
  update(state) {
    this.#enter(state);
  }
  didRender(state, bounds) {
    if (DEBUG && this.stack.current !== state) {
      // @todo
      // eslint-disable-next-line @typescript-eslint/no-base-to-string
      throw new Error(`BUG: expecting ${this.stack.current}, got ${state}`);
    }
    this.#nodeFor(state).bounds = bounds;
    this.#exit();
  }
  willDestroy(state) {
    expect(this.refs.get(state), 'BUG: missing ref').release();
  }
  commit() {
    this.#reset();
  }
  capture() {
    return this.#captureRefs(this.roots);
  }
  #reset() {
    if (this.stack.size !== 0) {
      // We probably encountered an error during the rendering loop. This will
      // likely trigger undefined behavior and memory leaks as the error left
      // things in an inconsistent state. It is recommended that the user
      // refresh the page.

      // TODO: We could warn here? But this happens all the time in our tests?

      // Clean up the root reference to prevent errors from happening if we
      // attempt to capture the render tree (Ember Inspector may do this)
      let root = expect(this.stack.toArray()[0], 'expected root state when resetting render tree');
      let ref = this.refs.get(root);
      if (ref !== undefined) {
        this.roots.delete(ref);
      }
      while (this.stack.size !== 0) {
        this.stack.pop();
      }
    }
  }
  #enter(state) {
    this.stack.push(state);
  }
  #exit() {
    if (DEBUG && this.stack.size === 0) {
      throw new Error('BUG: unbalanced pop');
    }
    this.stack.pop();
  }
  #nodeFor(state) {
    return expect(this.nodes.get(state), 'BUG: missing node');
  }
  #appendChild(node, state) {
    if (DEBUG && this.refs.has(state)) {
      throw new Error('BUG: child already appended');
    }
    let parent = this.stack.current;
    let ref = new Ref(state);
    this.refs.set(state, ref);
    if (parent) {
      let parentNode = this.#nodeFor(parent);
      parentNode.refs.add(ref);
      node.parent = parentNode;
    } else {
      this.roots.add(ref);
    }
  }
  #captureRefs(refs) {
    let captured = [];
    refs.forEach(ref => {
      let state = ref.get();
      if (state) {
        captured.push(this.#captureNode(`render-node:${ref.id}`, state));
      } else {
        refs.delete(ref);
      }
    });
    return captured;
  }
  #captureNode(id, state) {
    let node = this.#nodeFor(state);
    let {
      type,
      name,
      args,
      instance,
      refs
    } = node;
    let template = this.#captureTemplate(node);
    let bounds = this.#captureBounds(node);
    let children = this.#captureRefs(refs);
    return {
      id,
      type,
      name,
      args: reifyArgs(args),
      instance,
      template,
      bounds,
      children
    };
  }
  #captureTemplate({
    template
  }) {
    return template || null;
  }
  #captureBounds(node) {
    let bounds = expect(node.bounds, 'BUG: missing bounds');
    let parentElement = bounds.parentElement();
    let firstNode = bounds.firstNode();
    let lastNode = bounds.lastNode();
    return {
      parentElement,
      firstNode,
      lastNode
    };
  }
}

const TRANSACTION = Symbol('TRANSACTION');
class TransactionImpl {
  scheduledInstallModifiers = [];
  scheduledUpdateModifiers = [];
  scheduledAfterRender = [];
  createdComponents = [];
  updatedComponents = [];
  didCreate(component) {
    this.createdComponents.push(component);
  }
  didUpdate(component) {
    this.updatedComponents.push(component);
  }
  scheduleInstallModifier(modifier) {
    this.scheduledInstallModifiers.push(modifier);
  }
  scheduleUpdateModifier(modifier) {
    this.scheduledUpdateModifiers.push(modifier);
  }
  scheduleAfterRender(callback) {
    this.scheduledAfterRender.push(callback);
  }
  commit() {
    let {
      createdComponents,
      updatedComponents
    } = this;
    for (const {
      manager,
      state
    } of createdComponents) {
      manager.didCreate(state);
    }
    for (const {
      manager,
      state
    } of updatedComponents) {
      manager.didUpdate(state);
    }
    let {
      scheduledInstallModifiers,
      scheduledUpdateModifiers
    } = this;
    for (const {
      manager,
      state,
      definition
    } of scheduledInstallModifiers) {
      let modifierTag = manager.getTag(state);
      if (modifierTag !== null) {
        let tag = track(() => manager.install(state), devmode(() => {
          return {
            reason: 'modifier',
            label: [`- While rendering:\n  (instance of a \`${definition.resolvedName || manager.getDebugName(definition.state)}\` modifier)`]
          };
        }));
        updateTag(modifierTag, tag);
      } else {
        manager.install(state);
      }
    }
    for (const {
      manager,
      state,
      definition
    } of scheduledUpdateModifiers) {
      let modifierTag = manager.getTag(state);
      if (modifierTag !== null) {
        let tag = track(() => manager.update(state), devmode(() => ({
          kind: 'modifier',
          label: [`- While rendering:\n  (instance of a \`${definition.resolvedName || manager.getDebugName(definition.state)}\` modifier)`]
        })));
        updateTag(modifierTag, tag);
      } else {
        manager.update(state);
      }
    }
    for (const callback of this.scheduledAfterRender) {
      callback();
    }
  }
}
class EnvironmentImpl {
  [TRANSACTION] = null;
  updateOperations;

  // Delegate methods and values
  isInteractive;
  debugRenderTree;
  constructor(options, delegate) {
    this.delegate = delegate;
    this.isInteractive = delegate.isInteractive;
    this.debugRenderTree = this.delegate.enableDebugTooling ? new DebugRenderTreeImpl() : undefined;
    if (options.appendOperations) {
      this.appendOperations = options.appendOperations;
      this.updateOperations = options.updateOperations;
    } else if (options.document) {
      this.appendOperations = new DOMTreeConstruction(options.document);
      this.updateOperations = new DOMChangesImpl(options.document);
    } else if (DEBUG) {
      throw new Error('you must pass document or appendOperations to a new runtime');
    }
  }
  withDebug(debug) {
    if (this.debugRenderTree) {
      debug(this.debugRenderTree);
    }
  }
  getAppendOperations() {
    return this.appendOperations;
  }
  getDOM() {
    return expect(this.updateOperations, 'Attempted to get DOM updateOperations, but they were not provided by the environment. You may be attempting to rerender in an environment which does not support rerendering, such as SSR.');
  }
  begin() {
    assert(!this[TRANSACTION], 'A glimmer transaction was begun, but one already exists. You may have a nested transaction, possibly caused by an earlier runtime exception while rendering. Please check your console for the stack trace of any prior exceptions.');
    this.debugRenderTree?.begin();
    this[TRANSACTION] = new TransactionImpl();
  }
  get transaction() {
    return expect(this[TRANSACTION], 'must be in a transaction');
  }
  didCreate(component) {
    this.transaction.didCreate(component);
  }
  didUpdate(component) {
    this.transaction.didUpdate(component);
  }
  scheduleInstallModifier(modifier) {
    if (this.isInteractive) {
      this.transaction.scheduleInstallModifier(modifier);
    }
  }
  scheduleUpdateModifier(modifier) {
    if (this.isInteractive) {
      this.transaction.scheduleUpdateModifier(modifier);
    }
  }
  scheduleAfterRender(callback) {
    this.transaction.scheduleAfterRender(callback);
  }
  commit() {
    let transaction = this.transaction;
    this[TRANSACTION] = null;
    transaction.commit();
    this.debugRenderTree?.commit();
    this.delegate.onTransactionCommit();
  }
}
function runtimeContext(options, delegate, artifacts, resolver) {
  return {
    env: new EnvironmentImpl(options, delegate),
    program: new RuntimeProgramImpl(artifacts.constants, artifacts.heap),
    resolver: resolver
  };
}
function inTransaction(env, block) {
  if (!env[TRANSACTION]) {
    env.begin();
    try {
      block();
    } finally {
      env.commit();
    }
  } else {
    block();
  }
}

function internalHelper(helper) {
  return setInternalHelperManager(helper, {});
}

/**
   Use the `{{array}}` helper to create an array to pass as an option to your
   components.

   ```handlebars
   <MyComponent @people={{array
     'Tom Dale'
     'Yehuda Katz'
     this.myOtherPerson}}
   />
   ```
    or
   ```handlebars
   {{my-component people=(array
     'Tom Dale'
     'Yehuda Katz'
     this.myOtherPerson)
   }}
   ```

   Would result in an object such as:

   ```js
   ['Tom Dale', 'Yehuda Katz', this.get('myOtherPerson')]
   ```

   Where the 3rd item in the array is bound to updates of the `myOtherPerson` property.

   @method array
   @param {Array} options
   @return {Array} Array
   @public
 */

const array = internalHelper(({
  positional
}) => {
  return Formula(() => reifyPositional(positional), 'array');
});

const isEmpty$1 = value => {
  return value === null || value === undefined || typeof value.toString !== 'function';
};
const normalizeTextValue = value => {
  if (isEmpty$1(value)) {
    return '';
  }
  return String(value);
};

/**
  Concatenates the given arguments into a string.

  Example:

  ```handlebars
  {{some-component name=(concat firstName " " lastName)}}

  {{! would pass name="<first name value> <last name value>" to the component}}
  ```

  or for angle bracket invocation, you actually don't need concat at all.

  ```handlebars
  <SomeComponent @name="{{firstName}} {{lastName}}" />
  ```

  @public
  @method concat
*/
const concat = internalHelper(({
  positional
}) => {
  return Formula(() => reifyPositional(positional).map(normalizeTextValue).join(''), 'concat');
});

const context = buildUntouchableThis('`fn` helper');

/**
  The `fn` helper allows you to ensure a function that you are passing off
  to another component, helper, or modifier has access to arguments that are
  available in the template.

  For example, if you have an `each` helper looping over a number of items, you
  may need to pass a function that expects to receive the item as an argument
  to a component invoked within the loop. Here's how you could use the `fn`
  helper to pass both the function and its arguments together:

    ```app/templates/components/items-listing.hbs
  {{#each @items as |item|}}
    <DisplayItem @item=item @select={{fn this.handleSelected item}} />
  {{/each}}
  ```

  ```app/components/items-list.js
  import Component from '@glimmer/component';
  import { action } from '@ember/object';

  export default class ItemsList extends Component {
    handleSelected = (item) => {
      // ...snip...
    }
  }
  ```

  In this case the `display-item` component will receive a normal function
  that it can invoke. When it invokes the function, the `handleSelected`
  function will receive the `item` and any arguments passed, thanks to the
  `fn` helper.

  Let's take look at what that means in a couple circumstances:

  - When invoked as `this.args.select()` the `handleSelected` function will
    receive the `item` from the loop as its first and only argument.
  - When invoked as `this.args.select('foo')` the `handleSelected` function
    will receive the `item` from the loop as its first argument and the
    string `'foo'` as its second argument.

  In the example above, we used an arrow function to ensure that
  `handleSelected` is properly bound to the `items-list`, but let's explore what
  happens if we left out the arrow function:

  ```app/components/items-list.js
  import Component from '@glimmer/component';

  export default class ItemsList extends Component {
    handleSelected(item) {
      // ...snip...
    }
  }
  ```

  In this example, when `handleSelected` is invoked inside the `display-item`
  component, it will **not** have access to the component instance. In other
  words, it will have no `this` context, so please make sure your functions
  are bound (via an arrow function or other means) before passing into `fn`!

  See also [partial application](https://en.wikipedia.org/wiki/Partial_application).

  @method fn
  @public
*/
const fn = internalHelper(({
  positional
}) => {
  let callbackRef = check(positional[0], assertCallbackIsFn);
  return Formula(() => {
    return (...invocationArgs) => {
      let [fn, ...args] = reifyPositional(positional);
      if (DEBUG) assertCallbackIsFn(callbackRef);
      if (isMutRef(callbackRef)) {
        let value = args.length > 0 ? args[0] : invocationArgs[0];
        return updateReactive(callbackRef, value);
      } else {
        return fn.call(context, ...args, ...invocationArgs);
      }
    };
  }, 'fn');
});
function assertCallbackIsFn(callbackRef) {
  if (!(callbackRef && (isMutRef(callbackRef) || typeof unwrapReactive(callbackRef) === 'function'))) {
    throw new Error(`You must pass a function as the \`fn\` helper's first argument, you passed ${callbackRef ? unwrapReactive(callbackRef) : callbackRef}. While rendering${callbackRef ? `:\n\n${stringifyDebugLabel(callbackRef)}` : ''}`);
  }
}

/**
  Dynamically look up a property on an object. The second argument to `{{get}}`
  should have a string value, although it can be bound.

  For example, these two usages are equivalent:

  ```app/components/developer-detail.js
  import Component from '@glimmer/component';
  import { tracked } from '@glimmer/tracking';

  export default class extends Component {
    @tracked developer = {
      name: "Sandi Metz",
      language: "Ruby"
    }
  }
  ```

  ```handlebars
  {{this.developer.name}}
  {{get this.developer "name"}}
  ```

  If there were several facts about a person, the `{{get}}` helper can dynamically
  pick one:

  ```app/templates/application.hbs
  <DeveloperDetail @factName="language" />
  ```

  ```handlebars
  {{get this.developer @factName}}
  ```

  For a more complex example, this template would allow the user to switch
  between showing the user's height and weight with a click:

  ```app/components/developer-detail.js
  import Component from '@glimmer/component';
  import { tracked } from '@glimmer/tracking';

  export default class extends Component {
    @tracked developer = {
      name: "Sandi Metz",
      language: "Ruby"
    }

    @tracked currentFact = 'name'

    showFact = (fact) => {
      this.currentFact = fact;
    }
  }
  ```

  ```app/components/developer-detail.js
  {{get this.developer this.currentFact}}

  <button {{on 'click' (fn this.showFact "name")}}>Show name</button>
  <button {{on 'click' (fn this.showFact "language")}}>Show language</button>
  ```

  The `{{get}}` helper can also respect mutable values itself. For example:

  ```app/components/developer-detail.js
  <Input @value={{mut (get this.person this.currentFact)}} />

  <button {{on 'click' (fn this.showFact "name")}}>Show name</button>
  <button {{on 'click' (fn this.showFact "language")}}>Show language</button>
  ```

  Would allow the user to swap what fact is being displayed, and also edit
  that fact via a two-way mutable binding.

  @public
  @method get
 */
const get = internalHelper(({
  positional
}) => {
  let sourceRef = positional[0] ?? UNDEFINED_REFERENCE;
  let pathRef = positional[1] ?? UNDEFINED_REFERENCE;
  return Accessor({
    get: () => {
      let source = unwrapReactive(sourceRef);
      if (isDict(source)) {
        return getPath(source, String(unwrapReactive(pathRef)));
      }
    },
    set: value => {
      let source = unwrapReactive(sourceRef);
      if (isDict(source)) {
        return setPath(source, String(unwrapReactive(pathRef)), value);
      }
    }
  }, 'get');
});

let wrapHashProxy;
if (DEBUG) {
  wrapHashProxy = hash => {
    return new Proxy(hash, {
      set(target, key, value) {
        deprecate(`You set the '${String(key)}' property on a {{hash}} object. Setting properties on objects generated by {{hash}} is deprecated. Please update to use an object created with a tracked property or getter, or with a custom helper.`, false, {
          id: 'setting-on-hash'
        });
        target[key] = value;
        return true;
      }
    });
  };
}

/**
   Use the `{{hash}}` helper to create a hash to pass as an option to your
   components. This is specially useful for contextual components where you can
   just yield a hash:

   ```handlebars
   {{yield (hash
      name='Sarah'
      title=office
   )}}
   ```

   Would result in an object such as:

   ```js
   { name: 'Sarah', title: this.get('office') }
   ```

   Where the `title` is bound to updates of the `office` property.

   Note that the hash is an empty object with no prototype chain, therefore
   common methods like `toString` are not available in the resulting hash.
   If you need to use such a method, you can use the `call` or `apply`
   approach:

   ```js
   function toString(obj) {
     return Object.prototype.toString.apply(obj);
   }
   ```

   @method hash
   @param {Object} options
   @return {Object} Hash
   @public
 */
const hash = internalHelper(({
  named
}) => {
  let ref = Formula(() => {
    let hash = reifyNamed(named);
    if (DEBUG) {
      hash = wrapHashProxy(hash);
    }
    return hash;
  }, 'hash');

  // Setup the children so that templates can bypass getting the value of
  // the reference and treat children lazily
  let children = new Map();
  for (let name in named) {
    children.set(name, named[name]);
  }
  ref.properties = children;
  return ref;
});

let ARGS_CACHES = DEBUG ? new WeakMap() : undefined;
function getArgs(proxy) {
  return getValue(DEBUG ? ARGS_CACHES.get(proxy) : proxy.argsCache);
}
class SimpleArgsProxy {
  argsCache;
  constructor(context, computeArgs = () => EMPTY_ARGS) {
    let argsCache = createCache(() => computeArgs(context));
    if (DEBUG) {
      ARGS_CACHES.set(this, argsCache);
      Object.freeze(this);
    } else {
      this.argsCache = argsCache;
    }
  }
  get named() {
    return getArgs(this).named || EMPTY_NAMED;
  }
  get positional() {
    return getArgs(this).positional || EMPTY_POSITIONAL;
  }
}

////////////

function invokeHelper(context, definition, computeArgs) {
  if (DEBUG && (typeof context !== 'object' || context === null)) {
    throw new Error(`Expected a context object to be passed as the first parameter to invokeHelper, got ${context}`);
  }
  const owner = getOwner(context);
  const internalManager = getInternalHelperManager(definition);

  // TODO: figure out why assert isn't using the TS assert thing
  if (DEBUG && !internalManager) {
    throw new Error(`Expected a helper definition to be passed as the second parameter to invokeHelper, but no helper manager was found. The definition value that was passed was \`${debugToString(definition)}\`. Did you use setHelperManager to associate a helper manager with this value?`);
  }
  if (DEBUG && typeof internalManager === 'function') {
    throw new Error('Found a helper manager, but it was an internal built-in helper manager. `invokeHelper` does not support internal helpers yet.');
  }
  const manager = internalManager.getDelegateFor(owner);
  let args = new SimpleArgsProxy(context, computeArgs);
  let bucket = manager.createHelper(definition, args);
  let cache;
  if (hasValue(manager)) {
    cache = createCache(() => {
      if (DEBUG && (isDestroying(cache) || isDestroyed(cache))) {
        throw new Error(`You attempted to get the value of a helper after the helper was destroyed, which is not allowed`);
      }
      return manager.getValue(bucket);
    });
    associateDestroyableChild(context, cache);
  } else {
    throw new Error('TODO: unreachable, to be implemented with hasScheduledEffect');
  }
  if (hasDestroyable(manager)) {
    let destroyable = manager.getDestroyable(bucket);
    associateDestroyableChild(cache, destroyable);
  }
  return cache;
}

const untouchableContext = buildUntouchableThis('`on` modifier');

/*
  Internet Explorer 11 does not support `once` and also does not support
  passing `eventOptions`. In some situations it then throws a weird script
  error, like:

  ```
  Could not complete the operation due to error 80020101
  ```

  This flag determines, whether `{ once: true }` and thus also event options in
  general are supported.
*/
const SUPPORTS_EVENT_OPTIONS = (() => {
  try {
    const div = document.createElement('div');
    let counter = 0;
    div.addEventListener('click', () => counter++, {
      once: true
    });
    let event;
    if (typeof Event === 'function') {
      event = new Event('click');
    } else {
      event = document.createEvent('Event');
      event.initEvent('click', true, true);
    }
    div.dispatchEvent(event);
    div.dispatchEvent(event);
    return counter === 1;
  } catch (error) {
    return false;
  }
})();
class OnModifierState {
  tag = createUpdatableTag(devmode(() => ({
    label: ['{{on}}'],
    fallible: true,
    readonly: true
  })));
  element;
  args;
  once;
  passive;
  capture;
  options;
  shouldUpdate = true;
  constructor(element, args) {
    this.element = element;
    this.args = args;
  }
  updateFromArgs() {
    let {
      args
    } = this;
    let {
      once,
      passive,
      capture
    } = reifyNamed(args.named);
    if (once !== this.once) {
      this.once = once;
      this.shouldUpdate = true;
    }
    if (passive !== this.passive) {
      this.passive = passive;
      this.shouldUpdate = true;
    }
    if (capture !== this.capture) {
      this.capture = capture;
      this.shouldUpdate = true;
    }
    let options;
    // we want to handle both `true` and `false` because both have a meaning:
    // https://bugs.chromium.org/p/chromium/issues/detail?id=770208
    if (once !== undefined || passive !== undefined || capture !== undefined) {
      options = this.options = {
        once,
        passive,
        capture
      };
    } else {
      this.options = undefined;
    }
    let first = expect(args.positional[0], 'You must pass a valid DOM event name as the first argument to the `on` modifier');
    let eventName = check(unwrapReactive(first), CheckString, () => 'You must pass a valid DOM event name as the first argument to the `on` modifier');
    if (eventName !== this.eventName) {
      this.eventName = eventName;
      this.shouldUpdate = true;
    }
    const userProvidedCallbackReference = expect(args.positional[1], 'You must pass a function as the second argument to the `on` modifier');
    const userProvidedCallback = check(unwrapReactive(userProvidedCallbackReference), CheckFunction, actual => {
      return `You must pass a function as the second argument to the \`on\` modifier; you passed ${actual === null ? 'null' : typeof actual}. While rendering:\n\n${stringifyDebugLabel(userProvidedCallbackReference) ?? `{unlabeled value}`}`;
    });
    if (userProvidedCallback !== this.userProvidedCallback) {
      this.userProvidedCallback = userProvidedCallback;
      this.shouldUpdate = true;
    }
    if (DEBUG && args.positional.length !== 2) {
      throw new Error(`You can only pass two positional arguments (event name and callback) to the \`on\` modifier, but you provided ${args.positional.length}. Consider using the \`fn\` helper to provide additional arguments to the \`on\` callback.`);
    }
    let needsCustomCallback = SUPPORTS_EVENT_OPTIONS === false && once /* needs manual once implementation */ || DEBUG && passive; /* needs passive enforcement */

    if (this.shouldUpdate) {
      if (needsCustomCallback) {
        let callback = this.callback = function (event) {
          if (DEBUG && passive) {
            event.preventDefault = () => {
              throw new Error(`You marked this listener as 'passive', meaning that you must not call 'event.preventDefault()': \n\n${userProvidedCallback.name ?? `{anonymous function}`}`);
            };
          }
          if (!SUPPORTS_EVENT_OPTIONS && once) {
            removeEventListener(this, eventName, callback, options);
          }
          return userProvidedCallback.call(untouchableContext, event);
        };
      } else if (DEBUG) {
        // prevent the callback from being bound to the element
        this.callback = userProvidedCallback.bind(untouchableContext);
      } else {
        this.callback = userProvidedCallback;
      }
    }
  }
}
let adds = 0;
let removes = 0;
function removeEventListener(element, eventName, callback, options) {
  removes++;
  if (SUPPORTS_EVENT_OPTIONS) {
    // when options are supported, use them across the board
    element.removeEventListener(eventName, callback, options);
  } else if (options !== undefined && options.capture) {
    // used only in the following case:
    //
    // `{ once: true | false, passive: true | false, capture: true }
    //
    // `once` is handled via a custom callback that removes after first
    // invocation so we only care about capture here as a boolean
    element.removeEventListener(eventName, callback, true);
  } else {
    // used only in the following cases:
    //
    // * where there is no options
    // * `{ once: true | false, passive: true | false, capture: false }
    element.removeEventListener(eventName, callback);
  }
}
function addEventListener(element, eventName, callback, options) {
  adds++;
  if (SUPPORTS_EVENT_OPTIONS) {
    // when options are supported, use them across the board
    element.addEventListener(eventName, callback, options);
  } else if (options !== undefined && options.capture) {
    // used only in the following case:
    //
    // `{ once: true | false, passive: true | false, capture: true }
    //
    // `once` is handled via a custom callback that removes after first
    // invocation so we only care about capture here as a boolean
    element.addEventListener(eventName, callback, true);
  } else {
    // used only in the following cases:
    //
    // * where there is no options
    // * `{ once: true | false, passive: true | false, capture: false }
    element.addEventListener(eventName, callback);
  }
}

/**
  The `{{on}}` modifier lets you easily add event listeners (it uses
  [EventTarget.addEventListener](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener)
  internally).

  For example, if you'd like to run a function on your component when a `<button>`
  in the components template is clicked you might do something like:

  ```app/components/like-post.hbs
  <button {{on 'click' this.saveLike}}>Like this post!</button>
  ```

  ```app/components/like-post.js
  import Component from '@glimmer/component';
  import { action } from '@ember/object';

  export default class LikePostComponent extends Component {
    saveLike = () => {
      // someone likes your post!
      // better send a request off to your server...
    }
  }
  ```

  ### Arguments

  `{{on}}` accepts two positional arguments, and a few named arguments.

  The positional arguments are:

  - `event` -- the name to use when calling `addEventListener`
  - `callback` -- the function to be passed to `addEventListener`

  The named arguments are:

  - capture -- a `true` value indicates that events of this type will be dispatched
    to the registered listener before being dispatched to any EventTarget beneath it
    in the DOM tree.
  - once -- indicates that the listener should be invoked at most once after being
    added. If true, the listener would be automatically removed when invoked.
  - passive -- if `true`, indicates that the function specified by listener will never
    call preventDefault(). If a passive listener does call preventDefault(), the user
    agent will do nothing other than generate a console warning. See
    [Improving scrolling performance with passive listeners](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener#Improving_scrolling_performance_with_passive_listeners)
    to learn more.

  The callback function passed to `{{on}}` will receive any arguments that are passed
  to the event handler. Most commonly this would be the `event` itself.

  If you would like to pass additional arguments to the function you should use
  the `{{fn}}` helper.

  For example, in our example case above if you'd like to pass in the post that
  was being liked when the button is clicked you could do something like:

  ```app/components/like-post.hbs
  <button {{on 'click' (fn this.saveLike @post)}}>Like this post!</button>
  ```

  In this case, the `saveLike` function will receive two arguments: the click event
  and the value of `@post`.

  ### Function Context

  In the example above, we used an arrow function to ensure that `likePost` is
  properly bound to the `items-list`, but let's explore what happens if we
  left out the arrow function:

  ```app/components/like-post.js
  import Component from '@glimmer/component';

  export default class LikePostComponent extends Component {
    saveLike() {
      // ...snip...
    }
  }
  ```

  In this example, when the button is clicked `saveLike` will be invoked,
  it will **not** have access to the component instance. In other
  words, it will have no `this` context, so please make sure your functions
  are bound (via an arrow function or other means) before passing into `on`!

  @method on
  @public
*/
class OnModifierManager {
  SUPPORTS_EVENT_OPTIONS = SUPPORTS_EVENT_OPTIONS;
  getDebugName() {
    return 'on';
  }
  get counters() {
    return {
      adds,
      removes
    };
  }
  create(_owner, element, _state, args) {
    return new OnModifierState(element, args);
  }
  getTag(state) {
    if (state === null) {
      return null;
    }
    return state.tag;
  }
  install(state) {
    if (state === null) {
      return;
    }
    state.updateFromArgs();
    let {
      element,
      eventName,
      callback,
      options
    } = state;
    addEventListener(element, eventName, callback, options);
    registerDestructor(state, () => removeEventListener(element, eventName, callback, options));
    state.shouldUpdate = false;
  }
  update(state) {
    if (state === null) {
      return;
    }

    // stash prior state for el.removeEventListener
    let {
      element,
      eventName,
      callback,
      options
    } = state;
    state.updateFromArgs();
    if (!state.shouldUpdate) {
      return;
    }

    // use prior state values for removal
    removeEventListener(element, eventName, callback, options);

    // read updated values from the state object
    addEventListener(state.element, state.eventName, state.callback, state.options);
    state.shouldUpdate = false;
  }
  getDestroyable(state) {
    return state;
  }
}
const on = setInternalModifierManager(new OnModifierManager(), {});

let lastState;
function debugInit(vm) {
  if (LOCAL_TRACE_LOGGING) {
    lastState = snapshotVM(vm);
    const options = {
      showSubtle: LOCAL_SUBTLE_LOGGING
    };
    const logger = new DebugLogger(LOCAL_LOGGER, options);
    const state = new DebugState(lastState);
    const diff = new DiffState(undefined, undefined, state);
    const done = logger.group(frag`Initial VM State`).expanded();
    diff.log(logger);
    done();
  }
}

class UnwindTarget {
  static root(error) {
    return new UnwindTarget(null, {
      // initial ra
      ip: -1,
      // initial sp
      ra: -1,
      // initial fp
      fp: -1,
      handler: null,
      error
    });
  }
  #parent;
  #target;
  #error = {
    type: 'ok',
    value: undefined
  };
  constructor(parent, target) {
    this.#parent = parent;
    this.#target = target;
  }
  get error() {
    return this.#target.error;
  }
  get handler() {
    return this.#target.handler;
  }
  catchState(isTryFrame) {
    return {
      isTryFrame,
      handler: this.handler,
      error: this.error
    };
  }
  child(state) {
    return new UnwindTarget(this, state);
  }
  finally() {
    return this.#parent;
  }
  catch(error) {
    this.#error = {
      type: 'err',
      value: error
    };
    return this.#target;
  }

  /**
   * Returns the error caught by the VM, but only if it hasn't been handled.
   */
  get unhandled() {
    // If the error is already handled, don't return it.
    if (this.#target.handler) return Ok(undefined);
    return this.#error;
  }
}

function PackedRegisters(...registers) {
  assert(registers.length === 5, `Invalid registers: ${JSON.stringify(registers)}`);
  assert(registers.slice(0, -1).every(register => typeof register === 'number'), `Invalid registers: ${JSON.stringify(registers)} ($pc, $ra, $fp, and $sp should be numbers)`);
  assert(registers.at(-1) instanceof UnwindTarget, `Invalid $up register: Should be a UnwindTarget`);
  return registers;
}
class Registers {
  #packed;
  constructor(packed) {
    this.#packed = PackedRegisters(...packed);
  }
  get debug() {
    return {
      pc: this.#packed[$pc],
      ra: this.#packed[$ra],
      fp: this.#packed[$fp],
      sp: this.#packed[$sp],
      up: this.#packed[$up]
    };
  }

  // @premerge consolidate
  goto(pc) {
    assert(typeof pc === 'number', `Invalid pc: ${typeof pc}`);
    assert(!isNaN(pc), `Invalid pc: NaN`);
    this.#packed[$pc] = pc;
  }

  // @premerge consolidate
  call(pc) {
    this.#packed[$ra] = this.#packed[$pc];
    this.goto(pc);
  }

  // @premerge consolidate
  returnTo(pc) {
    this.#packed[$ra] = check(pc, CheckNumber);
  }

  // @premerge consolidate
  return() {
    this.#packed[$pc] = this.#packed[$ra];
  }

  // @premerge consolidate
  advance(size) {
    this.#packed[$pc] += size;
    check(this.#packed[$pc], CheckNumber);
    return size;
  }

  // @premerge consolidate
  advanceSp(size) {
    this.#packed[$sp] += size;
    check(this.#packed[$sp], CheckNumber);
    return size;
  }

  // @premerge consolidate
  push() {
    return ++this.#packed[$sp];
  }

  // @premerge consolidate
  pop(n = 1) {
    return this.#packed[$sp] -= check(n, CheckNumber);
  }

  // @premerge consolidate
  peek(offset = 0) {
    return this.#packed[$sp] - check(offset, CheckNumber);
  }

  // @premerge consolidate
  /**
   * Remember the previous $fp, then update $fp to point to $sp. Return the previous $fp so it can
   * be pushed onto the stack.
   *
   * This creates a linked list of $fps on the stack.
   */
  pushFp() {
    let prevFp = this.#packed[$fp];
    // the current $sp contains the $ra we already pushed, so the $fp will point to the tuple of
    // $ra and $fp
    this.#packed[$fp] = this.#packed[$sp];
    return prevFp;
  }

  // @premerge consolidate
  popTo(ra, fp) {
    // when popping a frame, we want to restore the $sp to the position immediately before we pushed
    // the $ra and $fp onto the stack, which will effectively continue execution at that point.
    let to = this.#packed[$fp] - 1;
    this.#packed[$ra] = check(ra, CheckNumber);
    this.#packed[$fp] = check(fp, CheckNumber);
    this.#packed[$sp] = check(to, CheckNumber);
  }

  /**
   * @deprecated Direct access to .packed will be removed once all use-cases are handled via
   * semantic methods.
   */
  get packed() {
    return this.#packed;
  }
  get pc() {
    return this.#packed[$pc];
  }
  get ra() {
    return this.#packed[$ra];
  }
  get sp() {
    return this.#packed[$sp];
  }
  get fp() {
    return this.#packed[$fp];
  }
  get up() {
    return this.#packed[$up];
  }
  try(catchPc, error, handler) {
    this.#packed[$up] = this.#packed[$up].child({
      ip: catchPc,
      ra: this.#packed[$ra],
      fp: this.#packed[$fp],
      error,
      handler
    });
  }
  catch(error) {
    return this.#packed[$up].catch(error);
  }
  finally() {
    this.#packed[$up] = expect(this.#packed[$up].finally(), "Since the $up starts initialized, and finally() is always paired with try(), it shouldn't be possible to pop the last $up.");
  }
}
let THROWN;
if (DEBUG) {
  let MARKER = undefined;
  THROWN = {
    unset: () => {
      MARKER = undefined;
    },
    set: error => {
      MARKER = error;
    },
    check: () => MARKER
  };
}
class LowLevelVM {
  static create(stack, heap, program, externs, registers) {
    return new LowLevelVM(stack, heap, program, externs, registers);
  }
  #currentOpSize = 0;
  #registers;
  #heap;
  #program;
  #stack;
  constructor(stack, heap, program, externs, registers) {
    this.externs = externs;
    this.#stack = stack;
    this.#heap = heap;
    this.#program = program;
    this.#registers = registers;
    if (DEBUG) {
      Object.defineProperty(this, 'threw', () => THROWN?.check());
    }
  }
  get result() {
    return this.#registers.up.unhandled;
  }
  capture() {
    return {
      unwind: this.#registers.up
    };
  }

  // @premerge consolidate
  get stack() {
    return this.#stack;
  }

  // @premerge consolidate
  get internalStack() {
    return this.#stack;
  }

  // @premerge consolidate
  get forArguments() {
    return this.#stack;
  }

  /**
   * @mutable
   */
  get debug() {
    return {
      currentPc: this.#registers.pc - this.#currentOpSize,
      registers: this.#registers,
      stack: this.#stack,
      threw: THROWN?.check()
    };
  }
  get pc() {
    return this.#registers.pc;
  }
  get sp() {
    return this.#registers.sp;
  }
  get fp() {
    return this.#registers.fp;
  }
  get up() {
    return this.#registers.up;
  }

  /**
   * `begin` takes an absolute instruction.
   */
  begin(instruction, error, handler) {
    this.#registers.try(instruction, error, handler);
  }
  catch(error) {
    if (DEBUG) {
      THROWN?.set(UserException.from(error, `A user exception occurred`));
    }
    const target = this.#registers.catch(error);
    this.#registers.popTo(target.ra, target.fp);
    this.#registers.goto(target.ip);
    return target;
  }
  finally() {
    this.#registers.finally();
  }

  // Start a new frame and save $ra and $fp on the stack
  pushFrame() {
    this.#stack.push(this.#registers.ra);
    this.#stack.push(this.#registers.pushFp());
  }

  // Restore $ra, $sp and $fp
  popFrame() {
    let fp = this.#registers.fp;
    // get the previous $ra and $fp from the stack (relative to the *current* $fp), and restore them
    // to the registers.
    this.#registers.popTo(this.#stack.get(0, fp), this.#stack.get(1, fp));
  }

  // Jump to an address in `program`
  goto(offset) {
    let pc = this.target(offset);
    assert(typeof pc === 'number', `expected pc to be a number, but it was ${typeof pc}`);
    assert(!isNaN(pc), 'expected pc to not be NaN, but it was');
    this.#registers.goto(pc);
  }
  target(offset) {
    return this.#registers.pc + offset - this.#currentOpSize;
  }

  // Save $pc into $ra, then jump to a new address in `program` (jal in MIPS)
  call(handle) {
    assert(handle < 0xffffffff, `Jumping to placeholder address`);
    this.#registers.call(this.#heap.getaddr(handle));
  }

  // Put a specific `program` address in $ra
  returnTo(offset) {
    this.#registers.returnTo(this.target(offset));
  }

  // Return to the `program` address stored in $ra
  return() {
    this.#registers.return();
  }
  nextStatement() {
    if (DEBUG) {
      THROWN?.unset();
    }
    let program = this.#program;
    let registers = this.#registers;
    let pc = registers.pc;
    assert(typeof pc === 'number', 'pc is a number');
    if (pc === -1) {
      return null;
    }

    // We have to save off the current operations size so that
    // when we do a jump we can calculate the correct offset
    // to where we are going. We can't simply ask for the size
    // in a jump because we have have already incremented the
    // program counter to the next instruction prior to executing.
    let opcode = program.opcode(pc);
    this.#currentOpSize = this.#registers.advance(opcode.size);
    return opcode;
  }
  evaluateOuter(opcode, vm) {
    {
      this.#evaluateInner(opcode, vm);
    }
  }
  #evaluateInner(opcode, vm) {
    if (opcode.isMachine) {
      this.#evaluateMachine(opcode);
    } else {
      this.#evaluateSyscall(opcode, vm);
    }
  }
  #evaluateMachine(opcode) {
    switch (opcode.type) {
      case Op.PushFrame:
        return this.pushFrame();
      case Op.PopFrame:
        return this.popFrame();
      case Op.Jump:
        return this.goto(opcode.op1);
      case Op.ReturnTo:
        return this.returnTo(opcode.op1);
    }
  }
  #evaluateSyscall(opcode, vm) {
    APPEND_OPCODES.evaluate(vm, opcode, opcode.type);
  }
}

const badProtocols = ['javascript:', 'vbscript:'];
const badTags = ['A', 'BODY', 'LINK', 'IMG', 'IFRAME', 'BASE', 'FORM'];
const badTagsForDataURI = ['EMBED'];
const badAttributes = ['href', 'src', 'background', 'action'];
const badAttributesForDataURI = ['src'];
function has(array, item) {
  return array.indexOf(item) !== -1;
}
function checkURI(tagName, attribute) {
  return (tagName === null || has(badTags, tagName)) && has(badAttributes, attribute);
}
function checkDataURI(tagName, attribute) {
  if (tagName === null) return false;
  return has(badTagsForDataURI, tagName) && has(badAttributesForDataURI, attribute);
}
function requiresSanitization(tagName, attribute) {
  return checkURI(tagName, attribute) || checkDataURI(tagName, attribute);
}
let protocolForUrl;
if (typeof URL === 'object' && URL !== null &&
// this is super annoying, TS thinks that URL **must** be a function so `URL.parse` check
// thinks it is `never` without this `as unknown as any`
typeof URL.parse === 'function') {
  // In Ember-land the `fastboot` package sets the `URL` global to `require('url')`
  // ultimately, this should be changed (so that we can either rely on the natural `URL` global
  // that exists) but for now we have to detect the specific `FastBoot` case first
  //
  // a future version of `fastboot` will detect if this legacy URL setup is required (by
  // inspecting Ember version) and if new enough, it will avoid shadowing the `URL` global
  // constructor with `require('url')`.
  let nodeURL = URL;
  protocolForUrl = url => {
    let protocol = null;
    if (typeof url === 'string') {
      protocol = nodeURL.parse(url).protocol;
    }
    return protocol === null ? ':' : protocol;
  };
} else if (typeof URL === 'function') {
  protocolForUrl = _url => {
    try {
      let url = new URL(_url);
      return url.protocol;
    } catch (error) {
      // any non-fully qualified url string will trigger an error (because there is no
      // baseURI that we can provide; in that case we **know** that the protocol is
      // "safe" because it isn't specifically one of the `badProtocols` listed above
      // (and those protocols can never be the default baseURI)
      return ':';
    }
  };
} else {
  // fallback for IE11 support
  let parsingNode = document.createElement('a');
  protocolForUrl = url => {
    parsingNode.href = url;
    return parsingNode.protocol;
  };
}
function sanitizeAttributeValue(element, attribute, value) {
  let tagName = null;
  if (value === null || value === undefined) {
    return value;
  }
  if (isSafeString(value)) {
    return value.toHTML();
  }
  if (!element) {
    tagName = null;
  } else {
    tagName = element.tagName.toUpperCase();
  }
  let str = normalizeStringValue(value);
  if (checkURI(tagName, attribute)) {
    let protocol = protocolForUrl(str);
    if (has(badProtocols, protocol)) {
      return `unsafe:${str}`;
    }
  }
  if (checkDataURI(tagName, attribute)) {
    return `unsafe:${str}`;
  }
  return str;
}

function dynamicAttribute(element, attr, namespace, isTrusting = false) {
  const {
    tagName,
    namespaceURI
  } = element;
  const attribute = {
    element,
    name: attr,
    namespace
  };
  if (DEBUG && attr === 'style' && !isTrusting) {
    return new DebugStyleAttributeManager(attribute);
  }
  if (namespaceURI === NS_SVG) {
    return buildDynamicAttribute(tagName, attr, attribute);
  }
  const {
    type,
    normalized
  } = normalizeProperty(element, attr);
  if (type === 'attr') {
    return buildDynamicAttribute(tagName, normalized, attribute);
  } else {
    return buildDynamicProperty(tagName, normalized, attribute);
  }
}
function buildDynamicAttribute(tagName, name, attribute) {
  if (requiresSanitization(tagName, name)) {
    return new SafeDynamicAttribute(attribute);
  } else {
    return new SimpleDynamicAttribute(attribute);
  }
}
function buildDynamicProperty(tagName, name, attribute) {
  if (requiresSanitization(tagName, name)) {
    return new SafeDynamicProperty(name, attribute);
  }
  if (isUserInputValue(tagName, name)) {
    return new InputValueDynamicAttribute(name, attribute);
  }
  if (isOptionSelected(tagName, name)) {
    return new OptionSelectedDynamicAttribute(name, attribute);
  }
  return new DefaultDynamicProperty(name, attribute);
}
class DynamicAttribute {
  constructor(attribute) {
    this.attribute = attribute;
  }
}
class SimpleDynamicAttribute extends DynamicAttribute {
  set(dom, value, _env) {
    const normalizedValue = normalizeValue(value);
    if (normalizedValue !== null) {
      const {
        name,
        namespace
      } = this.attribute;
      dom.__setAttribute(name, normalizedValue, namespace);
    }
  }
  update(value, _env) {
    const normalizedValue = normalizeValue(value);
    const {
      element,
      name
    } = this.attribute;
    if (normalizedValue === null) {
      element.removeAttribute(name);
    } else {
      element.setAttribute(name, normalizedValue);
    }
  }
}
class DefaultDynamicProperty extends DynamicAttribute {
  constructor(normalizedName, attribute) {
    super(attribute);
    this.normalizedName = normalizedName;
  }
  value;
  set(dom, value, _env) {
    if (value !== null && value !== undefined) {
      this.value = value;
      dom.__setProperty(this.normalizedName, value);
    }
  }
  update(value, _env) {
    const {
      element
    } = this.attribute;
    if (this.value !== value) {
      element[this.normalizedName] = this.value = value;
      if (value === null || value === undefined) {
        this.removeAttribute();
      }
    }
  }
  removeAttribute() {
    // TODO this sucks but to preserve properties first and to meet current
    // semantics we must do this.
    const {
      element,
      namespace
    } = this.attribute;
    if (namespace) {
      element.removeAttributeNS(namespace, this.normalizedName);
    } else {
      element.removeAttribute(this.normalizedName);
    }
  }
}
class SafeDynamicProperty extends DefaultDynamicProperty {
  set(dom, value, env) {
    const {
      element,
      name
    } = this.attribute;
    const sanitized = sanitizeAttributeValue(element, name, value);
    super.set(dom, sanitized, env);
  }
  update(value, env) {
    const {
      element,
      name
    } = this.attribute;
    const sanitized = sanitizeAttributeValue(element, name, value);
    super.update(sanitized, env);
  }
}
class SafeDynamicAttribute extends SimpleDynamicAttribute {
  set(dom, value, env) {
    const {
      element,
      name
    } = this.attribute;
    const sanitized = sanitizeAttributeValue(element, name, value);
    super.set(dom, sanitized, env);
  }
  update(value, env) {
    const {
      element,
      name
    } = this.attribute;
    const sanitized = sanitizeAttributeValue(element, name, value);
    super.update(sanitized, env);
  }
}
class InputValueDynamicAttribute extends DefaultDynamicProperty {
  set(dom, value) {
    dom.__setProperty('value', normalizeStringValue(value));
  }
  update(value) {
    const input = castToBrowser(this.attribute.element, ['input', 'textarea']);
    const currentValue = input.value;
    const normalizedValue = normalizeStringValue(value);
    if (currentValue !== normalizedValue) {
      input.value = normalizedValue;
    }
  }
}
class OptionSelectedDynamicAttribute extends DefaultDynamicProperty {
  set(dom, value) {
    if (value !== null && value !== undefined && value !== false) {
      dom.__setProperty('selected', true);
    }
  }
  update(value) {
    const option = castToBrowser(this.attribute.element, 'option');
    if (value) {
      option.selected = true;
    } else {
      option.selected = false;
    }
  }
}
function isOptionSelected(tagName, attribute) {
  return tagName === 'OPTION' && attribute === 'selected';
}
function isUserInputValue(tagName, attribute) {
  return (tagName === 'INPUT' || tagName === 'TEXTAREA') && attribute === 'value';
}
function normalizeValue(value) {
  if (value === false || value === undefined || value === null || typeof value.toString === 'undefined') {
    return null;
  }
  if (value === true) {
    return '';
  }
  // onclick function etc in SSR
  if (typeof value === 'function') {
    return null;
  }
  return String(value);
}
let DebugStyleAttributeManager;
if (DEBUG) {
  DebugStyleAttributeManager = class extends SimpleDynamicAttribute {
    set(dom, value, env) {
      warnIfStyleNotTrusted(value);
      super.set(dom, value, env);
    }
    update(value, env) {
      warnIfStyleNotTrusted(value);
      super.update(value, env);
    }
  };
}

class First {
  first;
  debug;
  constructor(node) {
    this.first = node;
    if (DEBUG) {
      this.debug = () => ({
        type: 'first',
        node: this.first
      });
    }
  }
  firstNode() {
    return this.first;
  }
}
class Last {
  last;
  debug;
  constructor(node) {
    this.last = node;
    if (DEBUG) {
      this.debug = () => ({
        type: 'last',
        node: this.last
      });
    }
  }
  lastNode() {
    return this.last;
  }
}
class ElementBuilderState {
  static initial(cursor) {
    return new ElementBuilderState({
      inserting: PresentStack.initial(cursor, 'cursor stack'),
      modifiers: BalancedStack.empty('modifier stack'),
      blocks: BalancedStack.empty('block stack'),
      constructing: BalancedStack.empty('constructing stack')
    });
  }
  debug;
  #inserting;
  #modifiers;
  #blocks;
  #constructing;
  constructor({
    inserting,
    modifiers,
    blocks,
    constructing
  }) {
    this.#inserting = inserting;
    this.#modifiers = modifiers;
    this.#blocks = blocks;
    this.#constructing = constructing;
    if (DEBUG) {
      Object.defineProperty(this, 'debug', {
        configurable: true,
        get: function () {
          return parentDebugFrames('element builder', {
            inserting: this.#inserting,
            modifiers: this.#modifiers,
            blocks: this.#blocks,
            constructing: this.#constructing
          });
        }
      });
    }
  }
  get inserting() {
    return this.#inserting;
  }
  get modifiers() {
    return this.#modifiers;
  }
  get blocks() {
    return this.#blocks;
  }
  get block() {
    return this.#blocks.present;
  }
  get cursor() {
    return this.#inserting.current;
  }
  begin() {
    this.#inserting = this.#inserting.begin();
    this.#modifiers = this.#modifiers.begin();
    this.#blocks = this.#blocks.begin();
    this.#constructing = this.#constructing.begin();
    return this;
  }
  catch() {
    this.#inserting = this.#inserting.catch();
    this.#modifiers = this.#modifiers.catch();
    this.#blocks = this.#blocks.catch();
    this.#constructing = this.#constructing.catch();
    return this;
  }
  finally() {
    this.#inserting = this.#inserting.finally();
    this.#modifiers = this.#modifiers.finally();
    this.#blocks = this.#blocks.finally();
    this.#constructing = this.#constructing.finally();
    return this;
  }
}
class AbstractElementBuilder {
  static forInitialRender(env, cursor) {
    return new this(env, cursor.element, cursor.nextSibling).initialize();
  }
  #state;
  dom;
  updateOperations;
  constructing = null;
  operations = null;
  env;
  constructor(env, parentNode, nextSibling) {
    this.#state = ElementBuilderState.initial(this.createCursor(parentNode, nextSibling));
    this.env = env;
    this.dom = env.getAppendOperations();
    this.updateOperations = env.getDOM();
  }
  debugBlocks() {
    throw new Error('Method not implemented.');
  }
  get currentCursor() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.#state.cursor;
  }
  begin() {
    const block = this.pushUpdatableBlock();
    this.#state.begin();
    return block;
  }
  finally() {
    this.#state.finally();
    return this.popBlock();
  }
  catch() {
    this.#state.catch();
    return this.catchBlock();
  }
  pushCursor(cursor) {
    this.#state.inserting.push(cursor);
  }
  initialize() {
    this.pushSimpleBlock();
    return this;
  }
  get debug() {
    return {
      blocks: this.#state.blocks.toArray(),
      constructing: this.constructing,
      inserting: this.#state.inserting.toArray()
    };
  }
  get element() {
    return this.#state.cursor.element;
  }
  get nextSibling() {
    return this.#state.cursor.nextSibling;
  }
  get hasBlocks() {
    return this.#state.blocks.size > 0;
  }
  get block() {
    return this.#state.block;
  }
  popElement() {
    this.#state.inserting.pop();
  }
  pushSimpleBlock() {
    return this.pushLiveBlock(new SimpleLiveBlock(this.element));
  }
  pushUpdatableBlock() {
    return this.pushLiveBlock(new UpdatableBlockImpl(this.element));
  }
  pushBlockList(list) {
    return this.pushLiveBlock(new LiveBlockList(this.element, list));
  }
  pushLiveBlock(block, _isRemote) {
    this.__openBlock();
    this.#state.blocks.push(block);
    return block;
  }
  catchBlock() {
    this.block.catch(this);
    const block = this.#closeBlock();
    const current = this.#state.blocks.current;
    if (current !== null) {
      current.didAppendBounds(block);
    }
    return block;
  }
  popBlock() {
    this.block.finalize(this);
    const block = this.#closeBlock();
    const current = this.#state.blocks.current;
    if (current !== null && !block.isRemote) {
      current.didAppendBounds(block);
    }
    return block;
  }
  #closeBlock() {
    this.__closeBlock();
    return this.#state.blocks.pop();
  }
  __openBlock() {}
  __closeBlock() {}

  // todo return seems unused
  openElement(tag) {
    let element = this.__openElement(tag);
    this.constructing = element;
    return element;
  }
  __openElement(tag) {
    return this.dom.createElement(tag, this.element);
  }
  flushElement(modifiers) {
    let parent = this.element;
    let element = expect(this.constructing, `flushElement should only be called when constructing an element`);
    this.__flushElement(parent, element);
    this.constructing = null;
    this.operations = null;
    this.pushModifiers(modifiers);
    this.pushElement(element, null);
    this.didOpenElement(element);
  }
  __flushElement(parent, constructing) {
    this.dom.insertBefore(parent, constructing, this.nextSibling);
  }
  closeElement() {
    this.willCloseElement();
    this.popElement();
    return this.popModifiers();
  }
  pushRemoteElement(element, guid, insertBefore) {
    return this.__pushRemoteElement(element, guid, insertBefore);
  }
  __pushRemoteElement(element, _guid, insertBefore) {
    this.pushElement(element, insertBefore);
    if (insertBefore === undefined) {
      while (element.lastChild) {
        element.removeChild(element.lastChild);
      }
    }
    let block = new RemoteLiveBlock(element);
    return this.pushLiveBlock(block, true);
  }
  popRemoteElement() {
    this.popBlock();
    this.popElement();
  }
  pushElement(element, nextSibling = null) {
    this.#state.inserting.push(this.createCursor(element, nextSibling));
  }
  pushModifiers(modifiers) {
    this.#state.modifiers.push(modifiers);
  }
  popModifiers() {
    return this.#state.modifiers.pop();
  }
  didAppendBounds(bounds) {
    this.block.didAppendBounds(bounds);
    return bounds;
  }
  didAppendNode(node) {
    this.block.didAppendNode(node);
    return node;
  }
  didOpenElement(element) {
    this.block.openElement(element);
    return element;
  }
  willCloseElement() {
    this.block.closeElement();
  }
  appendText(string) {
    return this.didAppendNode(this.__appendText(string));
  }
  __appendText(text) {
    let {
      dom,
      element,
      nextSibling
    } = this;
    let node = dom.createTextNode(text);
    dom.insertBefore(element, node, nextSibling);
    return node;
  }
  __appendNode(node) {
    this.dom.insertBefore(this.element, node, this.nextSibling);
    return node;
  }
  __appendFragment(fragment) {
    let first = fragment.firstChild;
    if (first) {
      let ret = new ConcreteBounds(this.element, first, fragment.lastChild);
      this.dom.insertBefore(this.element, fragment, this.nextSibling);
      return ret;
    } else {
      const comment = this.__appendComment('');
      return new ConcreteBounds(this.element, comment, comment);
    }
  }
  __appendHTML(html) {
    return this.dom.insertHTMLBefore(this.element, this.nextSibling, html);
  }
  appendDynamicHTML(value) {
    let bounds = this.trustedContent(value);
    this.didAppendBounds(bounds);
  }
  appendDynamicText(value) {
    let node = this.untrustedContent(value);
    this.didAppendNode(node);
    return node;
  }
  appendDynamicFragment(value) {
    let bounds = this.__appendFragment(value);
    this.didAppendBounds(bounds);
  }
  appendDynamicNode(value) {
    let node = this.__appendNode(value);
    let bounds = new ConcreteBounds(this.element, node, node);
    this.didAppendBounds(bounds);
  }
  trustedContent(value) {
    return this.__appendHTML(value);
  }
  untrustedContent(value) {
    return this.__appendText(value);
  }
  appendComment(string) {
    return this.didAppendNode(this.__appendComment(string));
  }
  __appendComment(string) {
    let {
      dom,
      element,
      nextSibling
    } = this;
    let node = dom.createComment(string);
    dom.insertBefore(element, node, nextSibling);
    return node;
  }
  __setAttribute(name, value, namespace) {
    this.dom.setAttribute(this.constructing, name, value, namespace);
  }
  __setProperty(name, value) {
    Reflect.set(this.constructing, name, value);
  }
  setStaticAttribute(name, value, namespace) {
    this.__setAttribute(name, value, namespace);
  }
  setDynamicAttribute(name, value, trusting, namespace) {
    let element = this.constructing;
    let attribute = dynamicAttribute(element, name, namespace, trusting);
    attribute.set(this, value, this.env);
    return attribute;
  }
}
class NewElementBuilder extends AbstractElementBuilder {
  static resume(env, block) {
    let parentNode = block.parentElement();
    let nextSibling = block.reset(env);
    let stack = new this(env, parentNode, nextSibling).initialize();
    stack.pushLiveBlock(block);
    return stack;
  }
  createCursor(element, nextSibling) {
    return new CursorImpl(element, nextSibling);
  }
}
class SimpleLiveBlock {
  #first = null;
  #last = null;
  nesting = 0;
  constructor(parent, isRemote = false) {
    this.parent = parent;
    this.isRemote = isRemote;
    ifDev(() => {
      this.debug = () => {
        return liveBlockDebug('SimpleLiveBlock', this.first, this.last, parent);
      };
    });
  }
  get first() {
    return this.#first?.first ?? null;
  }
  set first(first) {
    this.#first = first ? new First(first) : null;
  }
  get last() {
    return this.#last?.last ?? null;
  }
  set last(last) {
    this.#last = last ? new Last(last) : null;
  }
  parentElement() {
    return this.parent;
  }
  isEmpty() {
    return this.first === null;
  }
  firstNode() {
    let first = expect(this.first, 'cannot call `firstNode()` while `SimpleLiveBlock` is still initializing');
    return first;
  }
  lastNode() {
    let last = expect(this.last, 'cannot call `lastNode()` while `SimpleLiveBlock` is still initializing');
    return last;
  }
  openElement(element) {
    this.didAppendNode(element);
    this.nesting++;
  }
  closeElement() {
    this.nesting--;
  }
  didAppendNode(node) {
    if (this.nesting !== 0) return;
    if (!this.first) {
      this.#first = new First(node);
    }
    this.#last = new Last(node);
  }
  didAppendBounds(bounds) {
    if (this.nesting !== 0) return;
    assert(bounds.last !== null, `only append bounds with content`);
    if (!this.first) {
      this.#first = bounds;
    }
    this.#last = bounds;
  }
  catch(stack) {
    const {
      first,
      last,
      parent
    } = this;
    if (first && last) {
      clearRange({
        parent,
        first,
        last
      });
    }
    this.first = this.last = stack.appendComment('');
  }
  finalize(stack) {
    if (this.first === null) {
      stack.appendComment('');
    }
  }
}
class RemoteLiveBlock extends SimpleLiveBlock {
  isRemote = true;
  constructor(parent) {
    super(parent, true);
    registerDestructor(this, () => {
      // In general, you only need to clear the root of a hierarchy, and should never need to clear
      // any child nodes. This is an important constraint that gives us a strong guarantee that
      // clearing a subtree is a single DOM operation.
      //
      // Because remote blocks are not normally physically nested inside of the tree that they are
      // logically nested inside, we manually clear remote blocks when a logical parent is cleared.
      //
      // HOWEVER, it is currently possible for a remote block to be physically nested inside of the
      // block it is logically contained inside of. This happens when the remote block is appended
      // to the end of the application's entire element.
      //
      // The problem with that scenario is that Glimmer believes that it owns more of the DOM than
      // it actually does. The code is attempting to write past the end of the Glimmer-managed root,
      // but Glimmer isn't aware of that.
      //
      // The correct solution to that problem is for Glimmer to be aware of the end of the bounds
      // that it owns, and once we make that change, this check could be removed.
      //
      // For now, a more targeted fix is to check whether the node was already removed and avoid
      // clearing the node if it was. In most cases this shouldn't happen, so this might hide bugs
      // where the code clears nested nodes unnecessarily, so we should eventually try to do the
      // correct fix.
      if (this.parentElement() === this.firstNode().parentNode) {
        clear(this);
      }
    });
    ifDev(() => {
      this.debug = () => {
        return liveBlockDebug('RemoteLiveBlock', this.first, this.last, parent);
      };
    });
  }
}
class UpdatableBlockImpl extends SimpleLiveBlock {
  constructor(parent) {
    super(parent);
    ifDev(() => {
      this.debug = () => {
        return liveBlockDebug('UpdatableBlock', this.first, this.last, parent);
      };
    });
  }
  reset() {
    destroy(this);
    let nextSibling = clear(this);
    this.first = null;
    this.last = null;
    this.nesting = 0;
    return nextSibling;
  }
}

// FIXME: All the noops in here indicate a modelling problem
class LiveBlockList {
  isRemote = false;
  debug;
  constructor(parent, boundList) {
    this.parent = parent;
    this.boundList = boundList;
    this.parent = parent;
    this.boundList = boundList;
    if (DEBUG) {
      this.debug = () => {
        const bounds = this.boundList;
        const parent = this.parent;
        return joinRange('LiveBlockList', this.boundList.at(0)?.debug?.(), bounds.at(-1)?.debug?.(), parent);
      };
    }
  }
  get first() {
    const [first] = this.boundList;
    return first?.first ?? null;
  }
  get last() {
    const last = this.boundList.at(-1);
    return last?.last ?? null;
  }
  catch(stack) {
    let {
      first,
      last
    } = this;
    if (first && last) {
      clearRange({
        parent: this.parent,
        first,
        last
      });
    }
    const comment = stack.appendComment('');
    this.boundList = [new ConcreteBounds(this.parent, comment, comment)];
  }
  parentElement() {
    return this.parent;
  }
  firstNode() {
    let head = expect(this.boundList[0], 'cannot call `firstNode()` while `LiveBlockList` is still initializing');
    return head.firstNode();
  }
  lastNode() {
    let boundList = this.boundList;
    let tail = expect(boundList[boundList.length - 1], 'cannot call `lastNode()` while `LiveBlockList` is still initializing');
    return tail.lastNode();
  }
  openElement(_element) {
    assert(false, 'Cannot openElement directly inside a block list');
  }
  closeElement() {
    assert(false, 'Cannot closeElement directly inside a block list');
  }
  didAppendNode(_node) {
    assert(false, 'Cannot create a new node directly inside a block list');
  }
  didAppendBounds(_bounds) {}
  finalize(_stack) {
    assert(this.boundList.length > 0, 'boundsList cannot be empty');
  }
}
function clientBuilder(env, cursor) {
  return NewElementBuilder.forInitialRender(env, cursor);
}
function ifDev(callback) {
  if (DEBUG) {
    callback();
  }
}
function getFirstNodeFromDebug(debug) {
  switch (debug?.type) {
    case undefined:
    case 'empty':
    case 'last':
      return;
    case 'range':
      return debug.range[0];
    case 'first':
      return debug.node;
  }
}
function getLastNodeFromDebug(debug) {
  switch (debug?.type) {
    case undefined:
    case 'empty':
    case 'first':
      return;
    case 'range':
      return debug.range[1];
  }
}
function joinRange(kind, firstBlock, lastBlock, parent) {
  const firstNode = getFirstNodeFromDebug(firstBlock);
  const lastNode = getLastNodeFromDebug(lastBlock);
  if (firstNode && lastNode) {
    return debugRange(kind, [firstNode, lastNode]);
  } else if (firstBlock?.type === 'range') {
    return firstBlock;
  } else if (lastBlock?.type === 'range') {
    return lastBlock;
  } else {
    return empty(kind, parent);
  }
}
function empty(kind, parent) {
  return {
    type: 'empty',
    kind,
    parent
  };
}
function debugRange(kind, [first, last]) {
  return {
    type: 'range',
    kind,
    range: [first, last],
    collapsed: first === last
  };
}
function liveBlockDebug(kind, first, last, parent) {
  if (first && last) {
    return {
      type: 'range',
      kind,
      range: [first, last],
      collapsed: first === last
    };
  } else {
    return {
      type: 'empty',
      kind,
      parent
    };
  }
}

class UpdatingVM {
  env;
  dom;
  alwaysRevalidate;
  #frameStack = Stack.empty();
  constructor(env, {
    alwaysRevalidate = false
  }) {
    this.env = env;
    this.dom = env.getDOM();
    this.alwaysRevalidate = alwaysRevalidate;
  }
  execute(opcodes, handler) {
    if (!DEBUG) {
      this.#execute(opcodes, handler);
    } else {
      let hasErrored = true;
      try {
        debug.runInTrackingTransaction(() => this.#execute(opcodes, handler), {
          reason: 'updating',
          label: ['- While rendering:']
        });

        // using a boolean here to avoid breaking ergonomics of "pause on uncaught exceptions" which
        // would happen with a `catch` + `throw`
        hasErrored = false;
      } finally {
        if (hasErrored) {
          // eslint-disable-next-line no-console
          console.error(`\n\nError occurred:\n\n${resetTracking()}\n\n`);
        }
      }
    }
  }
  #execute(opcodes, handler) {
    let frameStack = this.#frameStack;
    this.try(opcodes, {
      handler,
      unwind: {
        isTryFrame: false,
        error: MutableCell(1),
        handler: () => {
          throw Error(`unwind target not found`);
        }
      }
    });
    while (frameStack.size !== 0) {
      let opcode = this.#frame.nextStatement();
      if (opcode === undefined) {
        frameStack.pop();
        continue;
      }
      opcode.evaluate(this);
    }
  }
  get #frame() {
    return expect(this.#frameStack.current, 'bug: expected a frame');
  }
  deref(reactive, then) {
    const result = readReactive(reactive);
    switch (result.type) {
      case 'ok':
        then(result.value);
        break;
      case 'err':
        this.unwind();
    }
  }
  goto(index) {
    this.#frame.goto(index);
  }
  try(ops, handle) {
    this.#frameStack.push(new UpdatingVMFrame(ops, handle));
  }

  /**
   * Attempt to unwind the stack until a target is found. This will continue unwinding to the
   * nearest `TryOpcode` error boundary, which will then handle the error.
   *
   * When the `TryOpcode` handles the error, it clears its child DOM, destroys all descendant
   * destructors, and re-renders itself.
   */
  unwind() {
    while (this.#frameStack.current) {
      const unwound = this.#frame.unwind();
      this.#frameStack.pop();
      if (unwound) return;
    }

    // @fixme something more rationalized here
    throw Error(`unwind target not found`);
  }
  reset() {
    this.#frame.handleException();
    this.#frameStack.pop();
  }
}

/**
 * This state is used to initialize the VM, both on initial render and when resuming due to an
 * assertion.
 */

class AbstractBlockOpcode {
  #children;
  bounds;
  debug;
  constructor(state, runtime, bounds, children = []) {
    this.state = state;
    this.runtime = runtime;
    this.#children = children;
    this.bounds = bounds;
    if (DEBUG) {
      if (bounds.debug) this.debug = bounds.debug;
    }
  }
  get children() {
    return this.#children;
  }
  updateChildren(children) {
    this.#children = children;
    return children;
  }
  parentElement() {
    return this.bounds.parentElement();
  }
  get first() {
    return this.bounds.first;
  }
  get last() {
    return this.bounds.last;
  }
  firstNode() {
    return this.bounds.firstNode();
  }
  lastNode() {
    return this.bounds.lastNode();
  }
  evaluate(vm) {
    vm.try(this.children, null);
  }
}
class TryOpcode extends AbstractBlockOpcode {
  type = 'try';
  // Hides property on base class

  evaluate(vm) {
    vm.try(this.children, {
      handler: this,
      unwind: this.#catchState
    });
  }
  get #catchState() {
    return this.state.unwind.catchState(this.state.isTryFrame);
  }
  unwind() {
    if (this.state.isTryFrame) {
      this.handleException();
      return true;
    } else {
      return false;
    }
  }
  handleException() {
    let {
      state,
      bounds,
      runtime
    } = this;
    destroyChildren(this);
    let elementStack = NewElementBuilder.resume(runtime.env, bounds);
    let vm = VM.resume(runtime, state, elementStack);
    let result = vm.execute(vm => {
      if (this.state.isTryFrame) {
        vm.setupBegin(-1, this.#catchState.error, this.#catchState.handler);
      }
    });
    associateDestroyableChild(this, result.drop);
    this.updateChildren(result.children);
  }
}
class ListItemOpcode extends TryOpcode {
  retained = false;
  index = -1;
  #memo;
  constructor(state, runtime, bounds, key, memo, value) {
    super(state, runtime, bounds, []);
    this.key = key;
    this.value = value;
    this.#memo = memo;
  }
  updateReferences(item) {
    this.retained = true;
    updateReactive(this.value, item.value);
    updateReactive(this.#memo, item.memo);
  }
  shouldRemove() {
    return !this.retained;
  }
  reset() {
    this.retained = false;
  }
}
class ListBlockOpcode extends AbstractBlockOpcode {
  type = 'list-block';
  #opcodeMap = new Map();
  #marker = null;
  #lastIterator;
  constructor(state, runtime, bounds, children, iterableRef) {
    super(state, runtime, bounds, children);
    this.iterableRef = iterableRef;
    this.#lastIterator = readReactive(iterableRef);
  }
  initializeChild(opcode) {
    opcode.index = this.children.length - 1;
    this.#opcodeMap.set(opcode.key, opcode);
  }
  evaluate(vm) {
    let iterator = readReactive(this.iterableRef);
    if (this.#lastIterator.type !== iterator.type || this.#lastIterator.value !== iterator.value) {
      let {
        bounds
      } = this;
      let {
        dom
      } = vm;
      let marker = this.#marker = dom.createComment('');
      dom.insertAfter(bounds.parentElement(), marker, expect(bounds.lastNode(), "can't insert after an empty bounds"));
      if (iterator.type === 'err') {
        // @fixme
        throw Error('unimplemented: list block iterator error');
      }
      this.#sync(iterator.value);
      this.parentElement().removeChild(marker);
      this.#marker = null;
      this.#lastIterator = iterator;
    }

    // Run now-updated updating opcodes
    super.evaluate(vm);
  }
  #sync(iterator) {
    const itemMap = this.#opcodeMap;
    let currentOpcodeIndex = 0;
    let seenIndex = 0;
    const children = this.children;
    this.bounds.boundList = this.updateChildren([]);

    // eslint-disable-next-line no-constant-condition
    while (true) {
      let item = iterator.next();
      if (item === null) break;
      let opcode = children[currentOpcodeIndex];
      let {
        key
      } = item;

      // Items that have already been found and moved will already be retained, we can continue
      // until we find the next unretained item
      while (opcode !== undefined && opcode.retained === true) {
        opcode = children[++currentOpcodeIndex];
      }
      if (opcode !== undefined && opcode.key === key) {
        this.retainItem(opcode, item);
        currentOpcodeIndex++;
      } else if (itemMap.has(key)) {
        let itemOpcode = itemMap.get(key);

        // The item opcode was seen already, so we should move it.
        if (itemOpcode.index < seenIndex) {
          this.moveItem(itemOpcode, item, opcode);
        } else {
          // Update the seen index, we are going to be moving this item around so any other items
          // that come before it will likely need to move as well.
          seenIndex = itemOpcode.index;
          let seenUnretained = false;

          // iterate through all of the opcodes between the current position and the position of the
          // item's opcode, and determine if they are all retained.
          for (let i = currentOpcodeIndex + 1; i < seenIndex; i++) {
            if (unwrap(children[i]).retained === false) {
              seenUnretained = true;
              break;
            }
          }

          // If we have seen only retained opcodes between this and the matching opcode, it means
          // that all the opcodes in between have been moved already, and we can safely retain this
          // item's opcode.
          if (seenUnretained === false) {
            this.retainItem(itemOpcode, item);
            currentOpcodeIndex = seenIndex + 1;
          } else {
            this.moveItem(itemOpcode, item, opcode);
            currentOpcodeIndex++;
          }
        }
      } else {
        this.insertItem(item, opcode);
      }
    }
    for (const opcode of children) {
      if (opcode.retained === false) {
        this.deleteItem(opcode);
      } else {
        opcode.reset();
      }
    }
  }
  retainItem(opcode, item) {
    let {
      children
    } = this;
    opcode.updateReferences(item);
    opcode.index = children.length;
    children.push(opcode);
  }
  insertItem(item, before) {
    const opcodeMap = this.#opcodeMap;
    let {
      bounds,
      state,
      runtime,
      children
    } = this;
    let {
      key
    } = item;
    let nextSibling = before === undefined ? this.#marker : before.firstNode();
    let elementStack = NewElementBuilder.forInitialRender(runtime.env, {
      element: bounds.parentElement(),
      nextSibling
    });
    let vm = VM.resume(runtime, state, elementStack);
    vm.execute(vm => {
      let opcode = vm.enterItem(item);
      opcode.index = children.length;
      children.push(opcode);
      opcodeMap.set(key, opcode);
      associateDestroyableChild(this, opcode);
    });
  }
  moveItem(opcode, item, before) {
    let {
      children
    } = this;
    opcode.updateReferences(item);
    let currentSibling, nextSibling;
    if (before === undefined) {
      move(opcode, this.#marker);
    } else {
      currentSibling = opcode.lastNode().nextSibling;
      nextSibling = before.firstNode();

      // Items are moved throughout the algorithm, so there are cases where the the items already
      // happen to be siblings (e.g. an item in between was moved before this move happened). Check
      // to see if they are siblings first before doing the move.
      if (currentSibling !== nextSibling) {
        move(opcode, nextSibling);
      }
    }
    opcode.index = children.length;
    children.push(opcode);
  }
  deleteItem(opcode) {
    destroy(opcode);
    clear(opcode);
    this.#opcodeMap.delete(opcode.key);
  }
}
class UpdatingVMFrame {
  #current = 0;
  #ops;
  #error;
  constructor(ops, handleException) {
    this.#ops = ops;
    this.#error = handleException;
  }
  goto(index) {
    this.#current = index;
  }
  nextStatement() {
    return this.#ops[this.#current++];
  }

  /**
   * unwind returns true if the frame is an unwind target (and therefore unwinding should stop at
   * this frame).
   */
  unwind() {
    if (this.#error && this.#error.handler.unwind()) {
      return true;
    } else {
      return false;
    }
  }
  handleException() {
    if (this.#error) {
      this.#error.handler.handleException();
    }
  }
}

class RenderResultImpl {
  updating;
  drop;
  constructor(env, block) {
    this.env = env;
    this.block = block;
    associateDestroyableChild(this, block);
    registerDestructor(this, () => clear(block));
    this.updating = [block];
    this.drop = block;
  }
  get children() {
    return this.updating;
  }
  evaluate(vm) {
    vm.execute(this.updating, this);
  }
  rerender({
    alwaysRevalidate = false
  } = {
    alwaysRevalidate: false
  }) {
    let {
      env,
      updating
    } = this;
    let vm = new UpdatingVM(env, {
      alwaysRevalidate
    });
    vm.execute(updating, this);
  }
  parentElement() {
    return this.block.parentElement();
  }
  get first() {
    return this.block.first;
  }
  firstNode() {
    return this.block.firstNode();
  }
  get last() {
    return this.block.last;
  }
  lastNode() {
    return this.block.lastNode();
  }
  handleException() {
    // @fixme
  }
  unwind() {
    return false;
  }
}

class EvaluationStackImpl {
  static restore(snapshot, pc, unwind) {
    return new this(snapshot.slice(), PackedRegisters(pc, -1, -1, snapshot.length - 1, unwind));
  }
  registers;

  // fp -> sp
  constructor(stack = [], registers) {
    this.stack = stack;
    this.registers = new Registers(registers);
  }
  get size() {
    return this.stack.length;
  }
  push(...values) {
    for (let value of values) {
      this.stack[this.registers.push()] = value;
    }
  }
  dup(position = this.registers.sp) {
    this.stack[this.registers.push()] = this.stack[position];
  }
  copy(from, to) {
    this.stack[to] = this.stack[from];
  }
  pop(n = 1) {
    let top = this.stack[this.registers.sp];
    this.registers.pop(n);
    return top;
  }
  top(offset = 0) {
    return this.stack[this.registers.peek(offset)];
  }
  get(offset, base = this.registers.fp) {
    return this.stack[base + offset];
  }
  set(value, offset, base = this.registers.fp) {
    this.stack[base + offset] = value;
  }
  slice(start, end) {
    return this.stack.slice(start, end);
  }
  capture(items) {
    let end = this.registers.sp + 1;
    let start = end - items;
    return this.stack.slice(start, end);
  }
  reset() {
    this.stack.length = 0;
  }

  /**
   * @snapshots
   */
  frame() {
    return this.stack.slice(this.registers.fp === -1 ? 0 : this.registers.fp, this.registers.sp + 1);
  }

  /**
   * @snapshots
   */
  all() {
    let before = this.stack.slice(0, this.registers.fp === -1 ? 0 : this.registers.fp);
    return {
      before,
      frame: this.frame()
    };
  }
}

class TemplateDebug {
  #templates = new Map();
  #active = [];
  willCall(handle) {
    this.#active.push(handle);
  }
  return() {
    this.#active.pop();
  }
  get active() {
    const current = this.#active.at(-1);
    return current ? this.#templates.get(current) ?? null : null;
  }
  register(handle, metadata) {
    this.#templates.set(handle, metadata);
  }
}
class VMState {
  static initial(options) {
    return new VMState(PresentStack.initial(options.scope, 'scope stack'), PresentStack.initial(options.dynamicScope, 'dynamic scope stack'), Stack.empty('cache stack'), Stack.empty('list stack'), BalancedStack.empty('updating stack'), BalancedStack.empty('destructor stack'));
  }
  #scope;
  #dynamicScope;
  #cache;
  #list;
  #updating;
  #destructors;
  constructor(scope, dynamicScope, cache, list, updating, destructors) {
    this.#scope = scope;
    this.#dynamicScope = dynamicScope;
    this.#cache = cache;
    this.#list = list;
    this.#updating = updating;
    this.#destructors = destructors;
    if (DEBUG) {
      Object.defineProperty(this, 'debug', {
        configurable: true,
        get: function () {
          return parentDebugFrames('vm state', {
            scope: this.#scope,
            dynamicScope: this.#dynamicScope,
            cache: this.#cache,
            list: this.#list,
            updating: this.#updating,
            destructors: this.#destructors
          });
        }
      });
    }
  }
  get scope() {
    return this.#scope;
  }
  get dynamicScope() {
    return this.#dynamicScope;
  }
  get cache() {
    return this.#cache;
  }
  get list() {
    return this.#list;
  }
  get updating() {
    return this.#updating;
  }
  get destructors() {
    return this.#destructors;
  }
  begin() {
    this.#cache = this.#cache.begin();
    this.#scope = this.#scope.begin();
    this.#dynamicScope = this.#dynamicScope.begin();
    this.#list = this.#list.begin();
    this.#destructors = this.#destructors.begin();
    this.#updating = this.#updating.begin();
    return this;
  }
  catch() {
    this.#cache = this.#cache.catch();
    this.#scope = this.#scope.catch();
    this.#dynamicScope = this.#dynamicScope.catch();
    this.#list = this.#list.catch();
    this.#destructors = this.#destructors.catch();
    this.#updating = this.#updating.catch();
    return this;
  }
  finally() {
    this.#cache = this.#cache.finally();
    this.#scope = this.#scope.finally();
    this.#dynamicScope = this.#dynamicScope.finally();
    this.#list = this.#list.finally();
    this.#destructors = this.#destructors.finally();
    this.#updating = this.#updating.finally();
    return this;
  }
}
class VM {
  static {
    if (DEBUG) {
      Object.defineProperties(VM.prototype, {
        debugWillCall: {
          configurable: true,
          value: function (handle) {
            this.#templates?.willCall(handle);
          }
        },
        debugDidReturn: {
          enumerable: true,
          value: function () {
            this.#templates?.return();
          }
        }
      });
    }
  }
  #state;
  #elements;
  #args;
  #context;
  #inner;
  #templates;
  #block;
  constructor(runtime, {
    pc,
    scope,
    dynamicScope,
    stack,
    unwind,
    context,
    destructor,
    isTryFrame
  }, elementStack) {
    this.runtime = runtime;
    if (DEBUG) {
      assertGlobalContextWasSet();
    }
    assert(typeof pc === 'number', 'pc is a number');
    let evalStack = EvaluationStackImpl.restore(stack, pc, unwind);
    this.#context = context;
    this.#elements = elementStack;
    this.#state = VMState.initial({
      scope,
      dynamicScope
    });
    this.#args = new VMArgumentsImpl();
    this.#inner = LowLevelVM.create(evalStack, this.#heap, runtime.program, {
      debug: this
    }, evalStack.registers);
    this.start(destructor);
    let block = this.#elements.block;
    let opcode = new TryOpcode(this.#capture(this.#inner.stack.size, isTryFrame), this.runtime, block, []);
    this.#block = opcode;
    this.#pushUpdating(opcode.children);
    this.#pushDestructor(opcode);
    if (DEBUG) {
      this.#templates = new TemplateDebug();
    }
  }
  get #heap() {
    return this.#context.heap;
  }
  get lowLevel() {
    return this.#inner;
  }
  get stack() {
    return this.#inner.stack;
  }
  get internalStack() {
    return this.#inner.internalStack;
  }
  get argumentsStack() {
    return this.#inner.forArguments;
  }
  get args() {
    return this.#args;
  }

  /* Registers */

  get sp() {
    return this.#inner.sp;
  }
  get fp() {
    return this.#inner.fp;
  }
  get debug() {
    if (DEBUG) {
      let inner = this.#inner;
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      const vm = this;
      const templates = this.#templates;
      const currentSlots = this.#state.scope.current.slots;
      const slots = currentSlots ? [...currentSlots] : [];
      const registers = inner.debug.registers.debug;
      const dom = this.elements();
      // const blocks = this.block

      const evalStack = inner.debug.stack;
      return {
        ...registers,
        currentPc: inner.debug.currentPc,
        constant: {
          constants: vm.constants,
          heap: vm.#heap
        },
        dom: dom.debug,
        block: {
          metadata: templates.active
        },
        stack: evalStack,
        scope: slots,
        updating: this.#state.updating.toArray(),
        destroyable: this.#state.destructors.toArray(),
        threw: inner.debug.threw
      };
    }
    unreachable(`BUG: Don't call 'vm.debug' without checking DEBUG`);
  }
  s0 = null;
  s1 = null;
  t0 = null;
  t1 = null;
  v0 = null;
  earlyError(message, from) {
    throw new EarlyError(message, from);
  }

  // Fetch a value from a register onto the stack
  fetch(register) {
    let value = this.fetchValue(register);
    this.stack.push(value);
  }

  // Load a value from the stack into a register
  load(register) {
    let value = this.stack.pop();
    this.loadValue(register, value);
  }

  /**
   * Fetch a value from a high-level register
   */
  fetchValue(register) {
    switch (register) {
      case $s0:
        return this.s0;
      case $s1:
        return this.s1;
      case $t0:
        return this.t0;
      case $t1:
        return this.t1;
      case $v0:
        return this.v0;
      default:
        unreachable(`BUG: Cannot fetch from register ${register}`);
    }
  }

  // Load a value into a register

  loadValue(register, value) {
    assert(!isLowLevelRegister(register), `BUG: Cannot load into a low-level register`);
    switch (register) {
      case $s0:
        this.s0 = value;
        break;
      case $s1:
        this.s1 = value;
        break;
      case $t0:
        this.t0 = value;
        break;
      case $t1:
        this.t1 = value;
        break;
      case $v0:
        this.v0 = value;
        break;
    }
  }

  /**
   * Migrated to Inner
   */

  // Start a new frame and save $ra and $fp on the stack
  pushFrame() {
    this.#inner.pushFrame();
  }

  // Restore $ra, $sp and $fp
  popFrame() {
    this.#inner.popFrame();
  }

  // Jump to an address in `program`
  goto(offset) {
    this.#inner.goto(offset);
  }

  // Save $pc into $ra, then jump to a new address in `program` (jal in MIPS)
  call(handle) {
    if (handle !== null) {
      if (DEBUG) {
        this.#templates?.willCall(handle);
      }
      this.#inner.call(handle);
    }
  }
  start(destructor = {}) {
    this.#state.destructors.push(destructor);
  }

  // Return to the `program` address stored in $ra
  return() {
    if (DEBUG) {
      this.#templates?.return();
    }
    this.#inner.return();
  }
  static initial(runtime, context, options) {
    const {
      handle,
      dynamicScope,
      treeBuilder: elements,
      owner
    } = options;
    let scope = 'self' in options ? PartialScopeImpl.root(options.self, options.numSymbols, owner) : PartialScopeImpl.root(UNDEFINED_REFERENCE, 0, owner);
    const destructor = {};
    let vmState = {
      pc: runtime.program.heap.getaddr(handle),
      scope,
      dynamicScope,
      stack: [],
      unwind: UnwindTarget.root(MutableCell(1)),
      context,
      isTryFrame: false,
      destructor
    };
    return new VM(runtime, vmState, elements);
  }
  static resume(runtime, resumeState, elements) {
    const destructor = {};
    const state = {
      ...resumeState,
      destructor
    };
    return new VM(runtime, state, elements);
  }
  compile(block) {
    let handle = unwrapHandle(block.compile(this.#context));
    if (DEBUG) {
      this.#templates?.register(handle, block.meta);
    }
    return handle;
  }
  get constants() {
    return this.program.constants;
  }
  get program() {
    return this.runtime.program;
  }
  get env() {
    return this.runtime.env;
  }
  #capture(args, isTryFrame, pc = this.#inner.pc) {
    return {
      pc,
      scope: this.scope,
      dynamicScope: this.dynamicScope,
      stack: this.argumentsStack.capture(args),
      ...this.#inner.capture(),
      destructor: this.#destructor,
      context: this.#context,
      isTryFrame
    };
  }
  beginCacheGroup(description) {
    let opcodes = this.#updating();
    let guard = new JumpIfNotModifiedOpcode();
    opcodes.push(guard);
    opcodes.push(createWithDescription(() => new BeginTrackFrameOpcode(), description));
    this.#state.cache.push(guard);
    beginTrackFrame(description);
  }
  commitCacheGroup() {
    let opcodes = this.#updating();
    let guard = expect(this.#state.cache.pop(), 'VM BUG: Expected a cache group');
    let tag = endTrackFrame();
    opcodes.push(new EndTrackFrameOpcode(guard));
    guard.finalize(tag, opcodes.length);
  }
  target(pc) {
    return this.#inner.target(pc);
  }

  /**
   * Set up the $up variable for an error recovery boundary. Once the $up is set up, a block is
   * {@linkcode enter}ed and {@linkcode begin} is called inside the block.
   *
   * The entered block (i.e. the {@linkcode TryOpcode}) will be added to the opcode list whether or
   * not an error occurs.
   *
   * If an error occurs, the {@linkcode TryOpcode} will be in an error state, and it will remain
   * empty until the error is recovered.
   *
   * If no error occurs, the {@linkcode TryOpcode} will have updating opcodes as children and will
   * update as usual. If any of the descendants opcode throw an error, the {@linkcode TryOpcode}
   * will become empty and enter an error state. It will remain empty until the error is recovered.
   */
  setupBegin(instruction, error, handler) {
    this.#inner.begin(instruction, error, handler);
  }

  /**
   * Open an error recovery boundary.
   *
   * This creates a checkpoint for the element builder and the internal VM state.
   *
   * If {@linkcode finally} is reached, the work done between here and {@linkcode finally} is
   * committed.
   *
   * If {@linkcode catch} is called, any work done between here and {@linkcode catch} is rolled
   * back.
   */
  begin() {
    this.elements().begin();
    this.#state.begin();
  }

  /**
   * The work done inside the error recovery boundary reached its conclusion and no error occurred.
   */
  finally() {
    this.#state.finally();
    this.elements().finally();
    this.#inner.finally();
  }

  /**
   * An error occurred inside of an error boundary. Roll back the work done inside the error recovery
   * boundary and place the {@linkcode TryOpcode} in an error state.
   */
  catch(error) {
    this.#state.catch();
    this.elements().catch();
    return this.#inner.catch(error);
  }

  /**
   * Begin a `Try` block, capturing {@linkcode args} arguments from the stack.
   *
   * A `Try` block must contain at least one assertion (such as `Assert` or `AssertSame`). When an
   * assertion fails, the {@linkcode TryOpcode} will clear its current contents and begin evaluation
   * from the next instruction.
   *
   * A call to {@linkcode enter} always occurs inside of a frame boundary (i.e. its paired
   * {@linkcode exit} occurs before a call to {@linkcode return}).
   *
   * During initial render, the `$ra` register controls what happens once the {@linkcode return} is
   * reached.
   *
   * When a {@linkcode TryOpcode} is *re-evaluated*, its `$ra` will be set to `-1`, which will
   * result in the VM exiting once the block is done.
   *
   * ## Error Recovery
   *
   * If `begin` is true, the {@linkcode TryOpcode} will be an error recovery boundary. This means
   * that errors that occur in descendants of the {@linkcode TryOpcode} will result in clearing the
   * `TryOpcode` and invoking the boundary's handler.
   *
   * Otherwise, the {@linkcode TryOpcode} behaves the same as any other block.
   *
   * ## State Changes
   *
   * 1. An updatable block is added to the block stack
   * 2. A {@linkcode TryOpcode} corresponding to the block is added to the current updating opcode list
   * 3. A new list of updating opcodes is pushed to the updating opcode stack
   */
  enter(args, isTryFrame) {
    let block = this.elements().pushUpdatableBlock();
    return this.#didEnter(new TryOpcode(this.#capture(args, isTryFrame), this.runtime, block, []));
  }

  /**
   *
   * @returns
   */
  exit() {
    this.elements().popBlock();
    return this.#closeBlock();
  }
  #didEnter(opcode) {
    this.#pushDestructor(opcode);
    this.#openBlock(opcode);
    return opcode;
  }
  #pushDestructor(destructor) {
    this.associateDestroyable(destructor);
    this.#state.destructors.push(destructor);
  }
  #openBlock(opcode) {
    this.updateWith(opcode);
    this.#pushUpdating(opcode.children);
  }
  #closeBlock() {
    this.#state.destructors.pop();
    return this.#popUpdating();
  }
  enterItem({
    key,
    value,
    memo
  }) {
    let {
      stack
    } = this;
    let valueRef = createIteratorItemRef(value);
    let memoRef = createIteratorItemRef(memo);
    stack.push(valueRef);
    stack.push(memoRef);
    let block = this.elements().pushUpdatableBlock();
    let opcode = new ListItemOpcode(this.#capture(2, false), this.runtime, block, key, memoRef, valueRef);
    this.#didEnter(opcode);
    return opcode;
  }
  registerItem(opcode) {
    this.#listBlock().initializeChild(opcode);
  }
  enterList(iterableRef, relativeStart) {
    let updating = [];
    let addr = this.#inner.target(relativeStart);
    let state = this.#capture(0, false, addr);
    let list = this.elements().pushBlockList(updating);
    let opcode = new ListBlockOpcode(state, this.runtime, list, updating, iterableRef);
    this.#state.list.push(opcode);
    this.#didEnter(opcode);
  }
  exitList() {
    this.exit();
    this.#state.list.pop();
  }
  #pushUpdating(list = []) {
    this.#state.updating.push(list);
  }
  #popUpdating() {
    return expect(this.#state.updating.pop(), "can't pop an empty stack");
  }
  updateWith(opcode) {
    this.#updating().push(opcode);
  }
  #listBlock() {
    return expect(this.#state.list.current, 'expected a list block');
  }
  associateDestroyable(child) {
    associateDestroyableChild(this.#destructor, child);
  }
  #updating() {
    return this.#state.updating.present;
  }
  elements() {
    return this.#elements;
  }
  get #destructor() {
    return this.#state.destructors.present;
  }
  get scope() {
    return this.#state.scope.current;
  }
  get dynamicScope() {
    return this.#state.dynamicScope.current;
  }
  pushChildScope() {
    this.#state.scope.push(this.scope.child());
  }
  pushDynamicScope() {
    let child = this.dynamicScope.child();
    this.#state.dynamicScope.push(child);
    return child;
  }
  pushRootScope(size, owner) {
    let scope = PartialScopeImpl.sized(size, owner);
    this.#state.scope.push(scope);
    return scope;
  }
  pushScope(scope) {
    this.#state.scope.push(scope);
  }
  popScope() {
    this.#state.scope.pop();
  }
  popDynamicScope() {
    this.#state.dynamicScope.pop();
  }
  bindDynamicScope(names) {
    let scope = this.dynamicScope;
    for (const name of reverse(names)) {
      scope.set(name, this.stack.pop());
    }
  }

  /// SCOPE HELPERS

  getOwner() {
    return this.scope.owner;
  }
  getSelf() {
    return this.scope.getSelf();
  }
  referenceForSymbol(symbol) {
    return this.scope.getSymbol(symbol);
  }
  popResult(checker) {
    const reactive = check(this.stack.pop(), CheckReactive);
    const result = readReactive(reactive);
    if (DEBUG) {
      if (result.type === 'ok') {
        check(result.value, checker);
      }
      return [reactive, result];
    } else {
      return [reactive, result];
    }
  }
  popReactive(then, checker) {
    const reactive = check(this.stack.pop(), CheckReactive);
    this.deref(reactive, value => {
      then(check(value, checker));
    });
  }
  deref(reactive, then) {
    const result = this.derefReactive(reactive);
    if (this.unwrapResult(result)) {
      const update = then(result.value);
      if (update && !isConstant(reactive)) {
        this.updateWith(update(reactive, result.value));
      }
    }
  }
  derefReactive(reference, map) {
    return this.#deref(reference, map);
  }
  #deref(reactive, map) {
    const result = readReactive(reactive);
    return map ? mapResult(result, map) : result;
  }
  unwrap(result, then) {
    if (this.unwrapResult(result)) {
      return then(result.value);
    }
  }
  unwrapResult(result) {
    if (result.type === 'ok') {
      return true;
    }
    const {
      handler,
      error
    } = this.catch(result.value);
    if (handler) {
      this.env.scheduleAfterRender(() => {
        handler(result.value, () => {
          writeCell(error, readCell(error) + 1);
        });
      });
    }
    return false;
  }

  /// EXECUTION

  execute(initialize) {
    if (DEBUG) {
      if (LOCAL_TRACE_LOGGING) {
        LOCAL_LOGGER.groupCollapsed(`EXECUTING FROM ${this.#inner.debug.registers.pc}`);
      }
      let hasErrored = true;
      try {
        let value = this.#execute(initialize);

        // using a boolean here to avoid breaking ergonomics of "pause on uncaught exceptions" which
        // would happen with a `catch` + `throw`
        hasErrored = false;
        return value;
      } finally {
        if (hasErrored) {
          // If any existing blocks are open, due to an error or something like that, we need to
          // close them all and clean things up properly.
          let elements = this.elements();
          while (elements.hasBlocks) {
            elements.popBlock();
          }

          // eslint-disable-next-line no-console
          console.error(`\n\nError occurred:\n\n${resetTracking()}\n\n`);
        }
        if (LOCAL_TRACE_LOGGING) {
          LOCAL_LOGGER.groupEnd();
        }
      }
    } else {
      return this.#execute(initialize);
    }
  }
  #execute(initialize) {
    if (initialize) initialize(this);
    let result;
    debugInit(this);
    do result = this.next(); while (!result.done);
    if (this.#inner.result.type === 'err') {
      throw this.#inner.result.value;
    }
    return result.value;
  }
  next() {
    let opcode = this.#inner.nextStatement();
    let result;
    if (opcode !== null) {
      this.#inner.evaluateOuter(opcode, this);
      result = {
        done: false,
        value: null
      };
    } else {
      // Unload the stack
      this.internalStack.reset();

      // Close the initial block -- this ensures that closing block serialization occurs
      this.elements().popBlock();
      result = {
        done: true,
        value: new RenderResultImpl(this.env, this.#block)
      };
    }
    return result;
  }
}

class TemplateIteratorImpl {
  #vm;
  constructor(vm) {
    this.#vm = vm;
  }
  next() {
    return this.#vm.next();
  }
  sync() {
    if (DEBUG) {
      return debug.runInTrackingTransaction(() => this.#vm.execute(), {
        reason: 'template',
        label: ['- While rendering:']
      });
    } else {
      return this.#vm.execute();
    }
  }
}
function renderSync(env, iterator) {
  let result;
  inTransaction(env, () => result = iterator.sync());
  return result;
}
function renderMain(runtime, context, owner, self, treeBuilder, layout, dynamicScope = new DynamicScopeImpl()) {
  let handle = unwrapHandle(layout.compile(context));
  let numSymbols = layout.symbolTable.symbols.length;
  let vm = VM.initial(runtime, context, {
    self,
    dynamicScope,
    treeBuilder,
    handle,
    numSymbols,
    owner
  });
  return new TemplateIteratorImpl(vm);
}
function renderInvocation(vm, _context, owner, definition, args) {
  // Get a list of tuples of argument names and references, like [['title', reference], ['name',
  // reference]]
  const argList = Object.keys(args).map(key => [key, args[key]]);
  const blockNames = ['main', 'else', 'attrs'];
  // Prefix argument names with `@` symbol
  const argNames = argList.map(([name]) => `@${name}`);
  let reified = vm.constants.component(definition, owner);
  vm.pushFrame();

  // Push blocks on to the stack, three stack values per block
  for (let i = 0; i < 3 * blockNames.length; i++) {
    vm.stack.push(null);
  }
  vm.stack.push(null);

  // For each argument, push its backing reference on to the stack
  argList.forEach(([, reference]) => {
    vm.stack.push(reference);
  });

  // Configure VM based on blocks and args just pushed on to the stack.
  vm.args.setup(vm.argumentsStack, argNames, blockNames, 0, true);
  const compilable = expect(reified.compilable, 'BUG: Expected the root component rendered with renderComponent to have an associated template, set with setComponentTemplate');
  const layoutHandle = unwrapHandle(vm.compile(compilable));
  const invocation = {
    handle: layoutHandle,
    symbolTable: compilable.symbolTable,
    meta: compilable.meta
  };

  // Needed for the Op.Main opcode: arguments, component invocation object, and component
  // definition.
  vm.stack.push(vm.args);
  vm.stack.push(invocation);
  vm.stack.push(reified);
  vm.debugWillCall?.(invocation.handle);
  return new TemplateIteratorImpl(vm);
}
function renderComponent(runtime, treeBuilder, context, owner, definition, args = {}, dynamicScope = new DynamicScopeImpl()) {
  let vm = VM.initial(runtime, context, {
    treeBuilder,
    self: undefined,
    handle: context.stdlib.main,
    dynamicScope,
    owner
  });
  return renderInvocation(vm, context, owner, definition, recordToReference(args));
}
function recordToReference(record) {
  const root = ReadonlyCell(record, 'args');
  return Object.keys(record).reduce((acc, key) => {
    acc[key] = getReactiveProperty(root, key);
    return acc;
  }, {});
}

/* eslint-disable @typescript-eslint/no-unsafe-enum-comparison */

const SERIALIZATION_FIRST_NODE_STRING = '%+b:0%';
function isSerializationFirstNode(node) {
  return node.nodeValue === SERIALIZATION_FIRST_NODE_STRING;
}
class RehydratingCursor extends CursorImpl {
  candidate = null;
  openBlockDepth;
  injectedOmittedNode = false;
  constructor(element, nextSibling, startingBlockDepth) {
    super(element, nextSibling);
    this.startingBlockDepth = startingBlockDepth;
    this.openBlockDepth = startingBlockDepth - 1;
  }
}
class RehydrateBuilder extends AbstractElementBuilder {
  unmatchedAttributes = null;
  blockDepth = 0;
  startingBlockOffset;
  constructor(env, parentNode, nextSibling) {
    super(env, parentNode, nextSibling);
    if (nextSibling) throw new Error('Rehydration with nextSibling not supported');
    let node = this.currentCursor.element.firstChild;
    while (node !== null) {
      if (isOpenBlock(node)) {
        break;
      }
      node = node.nextSibling;
    }
    assert(node, 'Must have opening comment for rehydration.');
    this.candidate = node;
    const startingBlockOffset = getBlockDepth(node);
    if (startingBlockOffset !== 0) {
      // We are rehydrating from a partial tree and not the root component
      // We need to add an extra block before the first block to rehydrate correctly
      // The extra block is needed since the renderComponent API creates a synthetic component invocation which generates the extra block
      const newBlockDepth = startingBlockOffset - 1;
      const newCandidate = this.dom.createComment(`%+b:${newBlockDepth}%`);
      node.parentNode.insertBefore(newCandidate, this.candidate);
      let closingNode = node.nextSibling;
      while (closingNode !== null) {
        if (isCloseBlock(closingNode) && getBlockDepth(closingNode) === startingBlockOffset) {
          break;
        }
        closingNode = closingNode.nextSibling;
      }
      assert(closingNode, 'Must have closing comment for starting block comment');
      const newClosingBlock = this.dom.createComment(`%-b:${newBlockDepth}%`);
      node.parentNode.insertBefore(newClosingBlock, closingNode.nextSibling);
      this.candidate = newCandidate;
      this.startingBlockOffset = newBlockDepth;
    } else {
      this.startingBlockOffset = 0;
    }
  }
  createCursor(element, nextSibling) {
    return new RehydratingCursor(element, nextSibling, this.blockDepth || 0);
  }
  get candidate() {
    if (this.currentCursor) {
      return this.currentCursor.candidate;
    }
    return null;
  }
  set candidate(node) {
    const currentCursor = this.currentCursor;
    currentCursor.candidate = node;
  }
  disableRehydration(nextSibling) {
    const currentCursor = this.currentCursor;

    // rehydration will be disabled until we either:
    // * hit popElement (and return to using the parent elements cursor)
    // * hit closeBlock and the next sibling is a close block comment
    //   matching the expected openBlockDepth
    currentCursor.candidate = null;
    currentCursor.nextSibling = nextSibling;
  }
  enableRehydration(candidate) {
    const currentCursor = this.currentCursor;
    currentCursor.candidate = candidate;
    currentCursor.nextSibling = null;
  }

  /** WARNING: called from parent constructor before we initialize this */
  pushElement(element, nextSibling = null) {
    const cursor = this.createCursor(element, nextSibling);

    /**
     * <div>   <---------------  currentCursor.element
     *   <!--%+b:1%--> <-------  would have been removed during openBlock
     *   <div> <---------------  currentCursor.candidate -> cursor.element
     *     <!--%+b:2%--> <-----  currentCursor.candidate.firstChild -> cursor.candidate
     *     Foo
     *     <!--%-b:2%-->
     *   </div>
     *   <!--%-b:1%-->  <------  becomes currentCursor.candidate
     */
    if (this.candidate !== null) {
      cursor.candidate = element.firstChild;
      this.candidate = element.nextSibling;
    }
    this.pushCursor(cursor);
  }

  // clears until the end of the current container
  // either the current open block or higher
  clearMismatch(candidate) {
    let current = candidate;
    const currentCursor = this.currentCursor;
    if (currentCursor !== null) {
      const openBlockDepth = currentCursor.openBlockDepth;
      if (openBlockDepth >= currentCursor.startingBlockDepth) {
        while (current) {
          if (isCloseBlock(current)) {
            const closeBlockDepth = getBlockDepthWithOffset(current, this.startingBlockOffset);
            if (openBlockDepth >= closeBlockDepth) {
              break;
            }
          }
          current = this.remove(current);
        }
      } else {
        while (current !== null) {
          current = this.remove(current);
        }
      }
      // current cursor parentNode should be openCandidate if element
      // or openCandidate.parentNode if comment
      this.disableRehydration(current);
    }
  }
  __openBlock() {
    const {
      currentCursor
    } = this;
    if (currentCursor === null) return;
    const blockDepth = this.blockDepth;
    this.blockDepth++;
    const {
      candidate
    } = currentCursor;
    if (candidate === null) return;
    const {
      tagName
    } = currentCursor.element;
    if (isOpenBlock(candidate) && getBlockDepthWithOffset(candidate, this.startingBlockOffset) === blockDepth) {
      this.candidate = this.remove(candidate);
      currentCursor.openBlockDepth = blockDepth;
    } else if (tagName !== 'TITLE' && tagName !== 'SCRIPT' && tagName !== 'STYLE') {
      this.clearMismatch(candidate);
    }
  }
  __closeBlock() {
    const {
      currentCursor
    } = this;
    if (currentCursor === null) return;

    // openBlock is the last rehydrated open block
    const openBlockDepth = currentCursor.openBlockDepth;

    // this currently is the expected next open block depth
    this.blockDepth--;
    const {
      candidate
    } = currentCursor;
    let isRehydrating = false;
    if (candidate !== null) {
      isRehydrating = true;
      //assert(
      //  openBlockDepth === this.blockDepth,
      //  'when rehydrating, openBlockDepth should match this.blockDepth here'
      //);

      if (isCloseBlock(candidate) && getBlockDepthWithOffset(candidate, this.startingBlockOffset) === openBlockDepth) {
        const nextSibling = this.remove(candidate);
        this.candidate = nextSibling;
        currentCursor.openBlockDepth--;
      } else {
        // close the block and clear mismatch in parent container
        // we will be either at the end of the element
        // or at the end of our containing block
        this.clearMismatch(candidate);
        isRehydrating = false;
      }
    }
    if (isRehydrating === false) {
      // check if nextSibling matches our expected close block
      // if so, we remove the close block comment and
      // restore rehydration after clearMismatch disabled
      const nextSibling = currentCursor.nextSibling;
      if (nextSibling !== null && isCloseBlock(nextSibling) && getBlockDepthWithOffset(nextSibling, this.startingBlockOffset) === this.blockDepth) {
        // restore rehydration state
        const candidate = this.remove(nextSibling);
        this.enableRehydration(candidate);
        currentCursor.openBlockDepth--;
      }
    }
  }
  __appendNode(node) {
    const {
      candidate
    } = this;

    // This code path is only used when inserting precisely one node. It needs more
    // comparison logic, but we can probably lean on the cases where this code path
    // is actually used.
    if (candidate) {
      return candidate;
    } else {
      return super.__appendNode(node);
    }
  }
  __appendHTML(html) {
    const candidateBounds = this.markerBounds();
    if (candidateBounds) {
      const first = candidateBounds.firstNode();
      const last = candidateBounds.lastNode();
      const newBounds = new ConcreteBounds(this.element, first.nextSibling, last.previousSibling);
      const possibleEmptyMarker = this.remove(first);
      this.remove(last);
      if (possibleEmptyMarker !== null && isEmpty(possibleEmptyMarker)) {
        this.candidate = this.remove(possibleEmptyMarker);
        if (this.candidate !== null) {
          this.clearMismatch(this.candidate);
        }
      }
      return newBounds;
    } else {
      return super.__appendHTML(html);
    }
  }
  remove(node) {
    const element = expect(node.parentNode, `cannot remove a detached node`);
    const next = node.nextSibling;
    element.removeChild(node);
    return next;
  }
  markerBounds() {
    const _candidate = this.candidate;
    if (_candidate && isMarker(_candidate)) {
      const first = _candidate;
      let last = expect(first.nextSibling, `BUG: serialization markers must be paired`);
      while (last && !isMarker(last)) {
        last = expect(last.nextSibling, `BUG: serialization markers must be paired`);
      }
      return new ConcreteBounds(this.element, first, last);
    } else {
      return null;
    }
  }
  __appendText(string) {
    const {
      candidate
    } = this;
    if (candidate) {
      if (isTextNode(candidate)) {
        if (candidate.nodeValue !== string) {
          candidate.nodeValue = string;
        }
        this.candidate = candidate.nextSibling;
        return candidate;
      } else if (isSeparator(candidate)) {
        this.candidate = this.remove(candidate);
        return this.__appendText(string);
      } else if (isEmpty(candidate) && string === '') {
        this.candidate = this.remove(candidate);
        return this.__appendText(string);
      } else {
        this.clearMismatch(candidate);
        return super.__appendText(string);
      }
    } else {
      return super.__appendText(string);
    }
  }
  __appendComment(string) {
    const _candidate = this.candidate;
    if (_candidate && isComment(_candidate)) {
      if (_candidate.nodeValue !== string) {
        _candidate.nodeValue = string;
      }
      this.candidate = _candidate.nextSibling;
      return _candidate;
    } else if (_candidate) {
      this.clearMismatch(_candidate);
    }
    return super.__appendComment(string);
  }
  __openElement(tag) {
    const _candidate = this.candidate;
    if (_candidate && isElement(_candidate) && isSameNodeType(_candidate, tag)) {
      this.unmatchedAttributes = [].slice.call(_candidate.attributes);
      return _candidate;
    } else if (_candidate) {
      if (isElement(_candidate) && _candidate.tagName === 'TBODY') {
        this.pushElement(_candidate, null);
        this.currentCursor.injectedOmittedNode = true;
        return this.__openElement(tag);
      }
      this.clearMismatch(_candidate);
    }
    return super.__openElement(tag);
  }
  __setAttribute(name, value, namespace) {
    const unmatched = this.unmatchedAttributes;
    if (unmatched) {
      const attr = findByName(unmatched, name);
      if (attr) {
        if (attr.value !== value) {
          attr.value = value;
        }
        unmatched.splice(unmatched.indexOf(attr), 1);
        return;
      }
    }
    return super.__setAttribute(name, value, namespace);
  }
  __setProperty(name, value) {
    const unmatched = this.unmatchedAttributes;
    if (unmatched) {
      const attr = findByName(unmatched, name);
      if (attr) {
        if (attr.value !== value) {
          attr.value = value;
        }
        unmatched.splice(unmatched.indexOf(attr), 1);
        return;
      }
    }
    return super.__setProperty(name, value);
  }
  __flushElement(parent, constructing) {
    const {
      unmatchedAttributes: unmatched
    } = this;
    if (unmatched) {
      for (const attr of unmatched) {
        this.constructing.removeAttribute(attr.name);
      }
      this.unmatchedAttributes = null;
    } else {
      super.__flushElement(parent, constructing);
    }
  }
  willCloseElement() {
    const {
      candidate,
      currentCursor
    } = this;
    if (candidate !== null) {
      this.clearMismatch(candidate);
    }
    if (currentCursor && currentCursor.injectedOmittedNode) {
      this.popElement();
    }
    super.willCloseElement();
  }
  getMarker(element, guid) {
    const marker = element.querySelector(`script[glmr="${guid}"]`);
    if (marker) {
      return castToSimple(marker);
    }
    return null;
  }
  __pushRemoteElement(element, cursorId, insertBefore) {
    const marker = this.getMarker(castToBrowser(element, 'HTML'), cursorId);
    assert(!marker || marker.parentNode === element, `expected remote element marker's parent node to match remote element`);

    // when insertBefore is not present, we clear the element
    if (insertBefore === undefined) {
      while (element.firstChild !== null && element.firstChild !== marker) {
        this.remove(element.firstChild);
      }
      insertBefore = null;
    }
    const cursor = new RehydratingCursor(element, null, this.blockDepth);
    this.pushCursor(cursor);
    if (marker === null) {
      this.disableRehydration(insertBefore);
    } else {
      this.candidate = this.remove(marker);
    }
    const block = new RemoteLiveBlock(element);
    return this.pushLiveBlock(block, true);
  }
  didAppendBounds(bounds) {
    super.didAppendBounds(bounds);
    if (this.candidate) {
      const last = bounds.lastNode();
      this.candidate = last && last.nextSibling;
    }
    return bounds;
  }
}
function isTextNode(node) {
  return node.nodeType === 3;
}
function isComment(node) {
  return node.nodeType === 8;
}
function isOpenBlock(node) {
  return node.nodeType === COMMENT_NODE && node.nodeValue.lastIndexOf('%+b:', 0) === 0;
}
function isCloseBlock(node) {
  return node.nodeType === COMMENT_NODE && node.nodeValue.lastIndexOf('%-b:', 0) === 0;
}
function getBlockDepth(node) {
  return parseInt(node.nodeValue.slice(4), 10);
}
function getBlockDepthWithOffset(node, offset) {
  return getBlockDepth(node) - offset;
}
function isElement(node) {
  return node.nodeType === 1;
}
function isMarker(node) {
  return node.nodeType === 8 && node.nodeValue === '%glmr%';
}
function isSeparator(node) {
  return node.nodeType === 8 && node.nodeValue === '%|%';
}
function isEmpty(node) {
  return node.nodeType === 8 && node.nodeValue === '% %';
}
function isSameNodeType(candidate, tag) {
  if (candidate.namespaceURI === NS_SVG) {
    return candidate.tagName === tag;
  }
  return candidate.tagName === tag.toUpperCase();
}
function findByName(array, name) {
  for (const attr of array) {
    if (attr.name === name) return attr;
  }
  return undefined;
}
function rehydrationBuilder(env, cursor) {
  return RehydrateBuilder.forInitialRender(env, cursor);
}

export { AbstractElementBuilder, ConcreteBounds, CurriedValue, CursorImpl, DOMChanges, DOMTreeConstruction, DynamicAttribute, DynamicScopeImpl, EMPTY_ARGS, EMPTY_NAMED, EMPTY_POSITIONAL, EnvironmentImpl, DOMChangesImpl as IDOMChanges, VM as LowLevelVM, NewElementBuilder, PartialScopeImpl, RehydrateBuilder, RemoteLiveBlock, SERIALIZATION_FIRST_NODE_STRING, SimpleDynamicAttribute, TEMPLATE_ONLY_COMPONENT_MANAGER, TemplateOnlyComponentDefinition as TemplateOnlyComponent, TemplateOnlyComponentManager, UnwindTarget, UpdatableBlockImpl, UpdatingVM, array, clear, clientBuilder, concat, createCapturedArgs, curry, dynamicAttribute, fn, get, hash, inTransaction, invokeHelper, isSerializationFirstNode, isWhitespace, normalizeProperty, on, rehydrationBuilder, reifyArgs, reifyNamed, reifyPositional, renderComponent, renderMain, renderSync, resetDebuggerCallback, runtimeContext, setDebuggerCallback, templateOnlyComponent };
