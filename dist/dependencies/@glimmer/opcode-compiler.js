import { EMPTY_STRING_ARRAY, isSmallInt, encodeImmediate, unwrap, reverse, assert as assert$1, Stack, isPresentArray, encodeHandle, expect, assign, dict, enumerate, EMPTY_ARRAY, debugToString } from '@glimmer/util';
import '@glimmer/debug';
import { Op, MachineOp, $v0, $fp, $sp, InternalComponentCapabilities, $s0, ContentType, TYPE_SIZE, isMachineOp, MACHINE_MASK, ARG_SHIFT, $s1 } from '@glimmer/vm';
import { DEBUG } from '@glimmer/env';
import { InstructionEncoderImpl } from '@glimmer/encoder';
import { SexpOpcodes } from '@glimmer/wire-format';
import { hasCapability } from '@glimmer/manager';
import { assert, deprecate } from '@glimmer/global-context';

let debugCompiler;

function isGetLikeTuple(opcode) {
  return Array.isArray(opcode) && opcode.length === 2;
}
function makeResolutionTypeVerifier(typeToVerify) {
  return opcode => {
    if (!isGetLikeTuple(opcode)) return false;
    let type = opcode[0];
    return type === SexpOpcodes.GetStrictKeyword || type === SexpOpcodes.GetLexicalSymbol || type === typeToVerify;
  };
}
const isGetFreeComponent = makeResolutionTypeVerifier(SexpOpcodes.GetFreeAsComponentHead);
const isGetFreeModifier = makeResolutionTypeVerifier(SexpOpcodes.GetFreeAsModifierHead);
const isGetFreeHelper = makeResolutionTypeVerifier(SexpOpcodes.GetFreeAsHelperHead);
const isGetFreeComponentOrHelper = makeResolutionTypeVerifier(SexpOpcodes.GetFreeAsComponentOrHelperHead);
const isGetFreeOptionalHelper = makeResolutionTypeVerifier(SexpOpcodes.GetFreeAsHelperHeadOrThisFallback);
function isGetFreeDeprecatedHelper(opcode) {
  return Array.isArray(opcode) && opcode[0] === SexpOpcodes.GetFreeAsDeprecatedHelperHeadOrThisFallback;
}
const isGetFreeOptionalComponentOrHelper = makeResolutionTypeVerifier(SexpOpcodes.GetFreeAsComponentOrHelperHeadOrThisFallback);
function assertResolverInvariants(meta) {
  if (DEBUG) {
    if (!meta.upvars) {
      throw new Error('Attempted to resolve a component, helper, or modifier, but no free vars were found');
    }
    if (!meta.owner) {
      throw new Error('Attempted to resolve a component, helper, or modifier, but no owner was associated with the template it was being resolved from');
    }
  }
  return meta;
}

/**
 * <Foo/>
 * <Foo></Foo>
 * <Foo @arg={{true}} />
 */
function resolveComponent(resolver, constants, meta, [, expr, then]) {
  assert$1(isGetFreeComponent(expr), 'Attempted to resolve a component with incorrect opcode');
  let type = expr[0];
  if (DEBUG && expr[0] === SexpOpcodes.GetStrictKeyword) {
    throw new Error(`Attempted to resolve a component in a strict mode template, but that value was not in scope: ${meta.upvars[expr[1]] ?? '{unknown variable}'}`);
  }
  if (type === SexpOpcodes.GetLexicalSymbol) {
    let {
      scopeValues,
      owner
    } = meta;
    let definition = expect(scopeValues, 'BUG: scopeValues must exist if template symbol is used')[expr[1]];
    then(constants.component(definition, expect(owner, 'BUG: expected owner when resolving component definition')));
  } else {
    let {
      upvars,
      owner
    } = assertResolverInvariants(meta);
    let name = unwrap(upvars[expr[1]]);
    let definition = resolver.lookupComponent(name, owner);
    if (DEBUG && (typeof definition !== 'object' || definition === null)) {
      throw new Error(`Attempted to resolve \`${name}\`, which was expected to be a component, but nothing was found.`);
    }
    then(constants.resolvedComponent(definition, name));
  }
}

/**
 * (helper)
 * (helper arg)
 */
function resolveHelper(resolver, constants, meta, [, expr, then]) {
  assert$1(isGetFreeHelper(expr), 'Attempted to resolve a helper with incorrect opcode');
  let type = expr[0];
  if (type === SexpOpcodes.GetLexicalSymbol) {
    let {
      scopeValues
    } = meta;
    let definition = expect(scopeValues, 'BUG: scopeValues must exist if template symbol is used')[expr[1]];
    then(constants.helper(definition));
  } else if (type === SexpOpcodes.GetStrictKeyword) {
    then(lookupBuiltInHelper(expr, resolver, meta, constants, 'helper'));
  } else {
    let {
      upvars,
      owner
    } = assertResolverInvariants(meta);
    let name = unwrap(upvars[expr[1]]);
    let helper = resolver.lookupHelper(name, owner);
    if (DEBUG && helper === null) {
      throw new Error(`Attempted to resolve \`${name}\`, which was expected to be a helper, but nothing was found.`);
    }
    then(constants.helper(helper, name));
  }
}

/**
 * <div {{modifier}}/>
 * <div {{modifier arg}}/>
 * <Foo {{modifier}}/>
 */
function resolveModifier(resolver, constants, meta, [, expr, then]) {
  assert$1(isGetFreeModifier(expr), 'Attempted to resolve a modifier with incorrect opcode');
  let type = expr[0];
  if (type === SexpOpcodes.GetLexicalSymbol) {
    let {
      scopeValues
    } = meta;
    let definition = expect(scopeValues, 'BUG: scopeValues must exist if template symbol is used')[expr[1]];
    then(constants.modifier(definition));
  } else if (type === SexpOpcodes.GetStrictKeyword) {
    let {
      upvars
    } = assertResolverInvariants(meta);
    let name = unwrap(upvars[expr[1]]);
    let modifier = resolver.lookupBuiltInModifier(name);
    if (DEBUG && modifier === null) {
      throw new Error(`Attempted to resolve a modifier in a strict mode template, but it was not in scope: ${name}`);
    }
    then(constants.modifier(modifier, name));
  } else {
    let {
      upvars,
      owner
    } = assertResolverInvariants(meta);
    let name = unwrap(upvars[expr[1]]);
    let modifier = resolver.lookupModifier(name, owner);
    if (DEBUG && modifier === null) {
      throw new Error(`Attempted to resolve \`${name}\`, which was expected to be a modifier, but nothing was found.`);
    }
    then(constants.modifier(modifier, name));
  }
}

/**
 * {{component-or-helper arg}}
 */
function resolveComponentOrHelper(resolver, constants, meta, [, expr, {
  ifComponent,
  ifHelper
}]) {
  assert$1(isGetFreeComponentOrHelper(expr), 'Attempted to resolve a component or helper with incorrect opcode');
  let type = expr[0];
  if (type === SexpOpcodes.GetLexicalSymbol) {
    let {
      scopeValues,
      owner
    } = meta;
    let definition = expect(scopeValues, 'BUG: scopeValues must exist if template symbol is used')[expr[1]];
    let component = constants.component(definition, expect(owner, 'BUG: expected owner when resolving component definition'), true);
    if (component !== null) {
      ifComponent(component);
      return;
    }
    let helper = constants.helper(definition, null, true);
    if (DEBUG && helper === null) {
      throw new Error(`Attempted to use a value as either a component or helper, but it did not have a component manager or helper manager associated with it. The value was: ${debugToString(definition)}`);
    }
    ifHelper(expect(helper, 'BUG: helper must exist'));
  } else if (type === SexpOpcodes.GetStrictKeyword) {
    ifHelper(lookupBuiltInHelper(expr, resolver, meta, constants, 'component or helper'));
  } else {
    let {
      upvars,
      owner
    } = assertResolverInvariants(meta);
    let name = unwrap(upvars[expr[1]]);
    let definition = resolver.lookupComponent(name, owner);
    if (definition !== null) {
      ifComponent(constants.resolvedComponent(definition, name));
    } else {
      let helper = resolver.lookupHelper(name, owner);
      if (DEBUG && helper === null) {
        throw new Error(`Attempted to resolve \`${name}\`, which was expected to be a component or helper, but nothing was found.`);
      }
      ifHelper(constants.helper(helper, name));
    }
  }
}

/**
 * <Foo @arg={{helper}}>
 */
function resolveOptionalHelper(resolver, constants, meta, [, expr, {
  ifHelper
}]) {
  assert$1(isGetFreeOptionalHelper(expr) || isGetFreeDeprecatedHelper(expr), 'Attempted to resolve a helper with incorrect opcode');
  let {
    upvars,
    owner
  } = assertResolverInvariants(meta);
  let name = unwrap(upvars[expr[1]]);
  let helper = resolver.lookupHelper(name, owner);
  if (helper) {
    ifHelper(constants.helper(helper, name), name, meta.moduleName);
  }
}

/**
 * {{maybeHelperOrComponent}}
 */
function resolveOptionalComponentOrHelper(resolver, constants, meta, [, expr, {
  ifComponent,
  ifHelper,
  ifValue
}]) {
  assert$1(isGetFreeOptionalComponentOrHelper(expr), 'Attempted to resolve an optional component or helper with incorrect opcode');
  let type = expr[0];
  if (type === SexpOpcodes.GetLexicalSymbol) {
    let {
      scopeValues,
      owner
    } = meta;
    let definition = expect(scopeValues, 'BUG: scopeValues must exist if template symbol is used')[expr[1]];
    if (typeof definition !== 'function' && (typeof definition !== 'object' || definition === null)) {
      // The value is not an object, so it can't be a component or helper.
      ifValue(constants.value(definition));
      return;
    }
    let component = constants.component(definition, expect(owner, 'BUG: expected owner when resolving component definition'), true);
    if (component !== null) {
      ifComponent(component);
      return;
    }
    let helper = constants.helper(definition, null, true);
    if (helper !== null) {
      ifHelper(helper);
      return;
    }
    ifValue(constants.value(definition));
  } else if (type === SexpOpcodes.GetStrictKeyword) {
    ifHelper(lookupBuiltInHelper(expr, resolver, meta, constants, 'value'));
  } else {
    let {
      upvars,
      owner
    } = assertResolverInvariants(meta);
    let name = unwrap(upvars[expr[1]]);
    let definition = resolver.lookupComponent(name, owner);
    if (definition !== null) {
      ifComponent(constants.resolvedComponent(definition, name));
      return;
    }
    let helper = resolver.lookupHelper(name, owner);
    if (helper !== null) {
      ifHelper(constants.helper(helper, name));
    }
  }
}
function lookupBuiltInHelper(expr, resolver, meta, constants, type) {
  let {
    upvars
  } = assertResolverInvariants(meta);
  let name = unwrap(upvars[expr[1]]);
  let helper = resolver.lookupBuiltInHelper(name);
  if (DEBUG && helper === null) {
    // Keyword helper did not exist, which means that we're attempting to use a
    // value of some kind that is not in scope
    throw new Error(`Attempted to resolve a ${type} in a strict mode template, but that value was not in scope: ${meta.upvars[expr[1]] ?? '{unknown variable}'}`);
  }
  return constants.helper(helper, name);
}

const HighLevelResolutionOpcodes = {
  Modifier: 1003,
  Component: 1004,
  Helper: 1005,
  OptionalHelper: 1006,
  ComponentOrHelper: 1007,
  OptionalComponentOrHelper: 1008,
  Free: 1009,
  Local: 1010,
  TemplateLocal: 1011
};
const HighLevelBuilderOpcodes = {
  Label: 1000,
  StartLabels: 1001,
  StopLabels: 1002,
  Start: 1000,
  End: 1002
};

const HighLevelOperands = {
  Label: 1,
  IsStrictMode: 2,
  DebugSymbols: 3,
  Block: 4,
  StdLib: 5,
  NonSmallInt: 6,
  SymbolTable: 7,
  Layout: 8
};
function labelOperand(value) {
  return {
    type: HighLevelOperands.Label,
    value
  };
}
function debugSymbolsOperand() {
  return {
    type: HighLevelOperands.DebugSymbols,
    value: undefined
  };
}
function isStrictMode() {
  return {
    type: HighLevelOperands.IsStrictMode,
    value: undefined
  };
}
function blockOperand(value) {
  return {
    type: HighLevelOperands.Block,
    value
  };
}
function stdlibOperand(value) {
  return {
    type: HighLevelOperands.StdLib,
    value
  };
}
function nonSmallIntOperand(value) {
  assert$1(!isSmallInt(value), 'Attempted to make a operand for an int that was not a small int, you should encode this as an immediate');
  return {
    type: HighLevelOperands.NonSmallInt,
    value
  };
}
function symbolTableOperand(value) {
  return {
    type: HighLevelOperands.SymbolTable,
    value
  };
}
function layoutOperand(value) {
  return {
    type: HighLevelOperands.Layout,
    value
  };
}

class Labels {
  labels = dict();
  targets = [];
  label(name, index) {
    this.labels[name] = index;
  }
  target(at, target) {
    this.targets.push({
      at,
      target
    });
  }
  patch(heap) {
    let {
      targets,
      labels
    } = this;
    for (const {
      at,
      target
    } of targets) {
      let address = labels[target] - at;
      assert$1(heap.getbyaddr(at) === -1, 'Expected heap to contain a placeholder, but it did not');
      heap.setbyaddr(at, address);
    }
  }
}
function encodeOp(encoder, constants, resolver, meta, op) {
  if (isBuilderOpcode(op[0])) {
    let [type, ...operands] = op;
    encoder.push(constants, type, ...operands);
  } else {
    switch (op[0]) {
      case HighLevelBuilderOpcodes.Label:
        return encoder.label(op[1]);
      case HighLevelBuilderOpcodes.StartLabels:
        return encoder.startLabels();
      case HighLevelBuilderOpcodes.StopLabels:
        return encoder.stopLabels();
      case HighLevelResolutionOpcodes.Component:
        return resolveComponent(resolver, constants, meta, op);
      case HighLevelResolutionOpcodes.Modifier:
        return resolveModifier(resolver, constants, meta, op);
      case HighLevelResolutionOpcodes.Helper:
        return resolveHelper(resolver, constants, meta, op);
      case HighLevelResolutionOpcodes.ComponentOrHelper:
        return resolveComponentOrHelper(resolver, constants, meta, op);
      case HighLevelResolutionOpcodes.OptionalHelper:
        return resolveOptionalHelper(resolver, constants, meta, op);
      case HighLevelResolutionOpcodes.OptionalComponentOrHelper:
        return resolveOptionalComponentOrHelper(resolver, constants, meta, op);
      case HighLevelResolutionOpcodes.Local:
        {
          let freeVar = op[1];
          let name = expect(meta.upvars, 'BUG: attempted to resolve value but no upvars found')[freeVar];
          let andThen = op[2];
          andThen(name, meta.moduleName);
          break;
        }
      case HighLevelResolutionOpcodes.TemplateLocal:
        {
          let [, valueIndex, then] = op;
          let value = expect(meta.scopeValues, 'BUG: Attempted to gect a template local, but template does not have any')[valueIndex];
          then(constants.value(value));
          break;
        }
      case HighLevelResolutionOpcodes.Free:
        if (DEBUG) {
          let [, upvarIndex] = op;
          let freeName = expect(meta.upvars, 'BUG: attempted to resolve value but no upvars found')[upvarIndex];
          throw new Error(`Attempted to resolve a value in a strict mode template, but that value was not in scope: ${freeName}`);
        }
        break;
      default:
        throw new Error(`Unexpected high level opcode ${op[0]}`);
    }
  }
}
class EncoderImpl {
  labelsStack = new Stack();
  encoder = new InstructionEncoderImpl([]);
  errors = [];
  handle;
  constructor(heap, meta, stdlib) {
    this.heap = heap;
    this.meta = meta;
    this.stdlib = stdlib;
    this.handle = heap.malloc();
  }
  error(error) {
    this.encoder.encode(Op.Primitive, 0);
    this.errors.push(error);
  }
  commit(size) {
    let handle = this.handle;
    this.heap.pushMachine(MachineOp.Return);
    this.heap.finishMalloc(handle, size);
    if (isPresentArray(this.errors)) {
      return {
        errors: this.errors,
        handle
      };
    } else {
      return handle;
    }
  }
  push(constants, type, ...args) {
    let {
      heap
    } = this;
    if (DEBUG && type > TYPE_SIZE) {
      throw new Error(`Opcode type over 8-bits. Got ${type}.`);
    }
    let machine = isMachineOp(type) ? MACHINE_MASK : 0;
    let first = type | machine | args.length << ARG_SHIFT;
    heap.pushRaw(first);
    for (let i = 0; i < args.length; i++) {
      let op = args[i];
      heap.pushRaw(this.operand(constants, op));
    }
  }
  operand(constants, operand) {
    if (typeof operand === 'number') {
      return operand;
    }
    if (typeof operand === 'object' && operand !== null) {
      if (Array.isArray(operand)) {
        return encodeHandle(constants.array(operand));
      } else {
        switch (operand.type) {
          case HighLevelOperands.Label:
            this.currentLabels.target(this.heap.offset, operand.value);
            return -1;
          case HighLevelOperands.IsStrictMode:
            return encodeHandle(constants.value(this.meta.isStrictMode));
          case HighLevelOperands.DebugSymbols:
            return encodeHandle(constants.array(this.meta.evalSymbols || EMPTY_STRING_ARRAY));
          case HighLevelOperands.Block:
            return encodeHandle(constants.value(compilableBlock(operand.value, this.meta)));
          case HighLevelOperands.StdLib:
            return expect(this.stdlib, 'attempted to encode a stdlib operand, but the encoder did not have a stdlib. Are you currently building the stdlib?')[operand.value];
          case HighLevelOperands.NonSmallInt:
          case HighLevelOperands.SymbolTable:
          case HighLevelOperands.Layout:
            return constants.value(operand.value);
        }
      }
    }
    return encodeHandle(constants.value(operand));
  }
  get currentLabels() {
    return expect(this.labelsStack.current, 'bug: not in a label stack');
  }
  label(name) {
    this.currentLabels.label(name, this.heap.offset + 1);
  }
  startLabels() {
    this.labelsStack.push(new Labels());
  }
  stopLabels() {
    let label = expect(this.labelsStack.pop(), 'unbalanced push and pop labels');
    label.patch(this.heap);
  }
}
function isBuilderOpcode(op) {
  return op < HighLevelBuilderOpcodes.Start;
}

class StdLib {
  constructor(main, trustingGuardedAppend, cautiousGuardedAppend, trustingNonDynamicAppend, cautiousNonDynamicAppend) {
    this.main = main;
    this.trustingGuardedAppend = trustingGuardedAppend;
    this.cautiousGuardedAppend = cautiousGuardedAppend;
    this.trustingNonDynamicAppend = trustingNonDynamicAppend;
    this.cautiousNonDynamicAppend = cautiousNonDynamicAppend;
  }
  get 'trusting-append'() {
    return this.trustingGuardedAppend;
  }
  get 'cautious-append'() {
    return this.cautiousGuardedAppend;
  }
  get 'trusting-non-dynamic-append'() {
    return this.trustingNonDynamicAppend;
  }
  get 'cautious-non-dynamic-append'() {
    return this.cautiousNonDynamicAppend;
  }
  getAppend(trusting) {
    return trusting ? this.trustingGuardedAppend : this.cautiousGuardedAppend;
  }
}

class NamedBlocksImpl {
  names;
  constructor(blocks) {
    this.blocks = blocks;
    this.names = blocks ? Object.keys(blocks) : [];
  }
  get(name) {
    if (!this.blocks) return null;
    return this.blocks[name] || null;
  }
  has(name) {
    let {
      blocks
    } = this;
    return blocks !== null && name in blocks;
  }
  with(name, block) {
    let {
      blocks
    } = this;
    if (blocks) {
      return new NamedBlocksImpl(assign({}, blocks, {
        [name]: block
      }));
    } else {
      return new NamedBlocksImpl({
        [name]: block
      });
    }
  }
  get hasAny() {
    return this.blocks !== null;
  }
}
const EMPTY_BLOCKS = new NamedBlocksImpl(null);
function namedBlocks(blocks) {
  if (blocks === null) {
    return EMPTY_BLOCKS;
  }
  let out = dict();
  let [keys, values] = blocks;
  for (const [i, key] of enumerate(keys)) {
    out[key] = unwrap(values[i]);
  }
  return new NamedBlocksImpl(out);
}

/**
 * Push a reference onto the stack corresponding to a statically known primitive
 * @param value A JavaScript primitive (undefined, null, boolean, number or string)
 */
function PushPrimitiveReference(op, value) {
  PushPrimitive(op, value);
  op(Op.PrimitiveReference);
}

/**
 * Push an encoded representation of a JavaScript primitive on the stack
 *
 * @param value A JavaScript primitive (undefined, null, boolean, number or string)
 */
function PushPrimitive(op, primitive) {
  let p = primitive;
  if (typeof p === 'number') {
    p = isSmallInt(p) ? encodeImmediate(p) : nonSmallIntOperand(p);
  }
  op(Op.Primitive, p);
}

/**
 * Invoke a foreign function (a "helper") based on a statically known handle
 *
 * @param op The op creation function
 * @param handle A handle
 * @param positional An optional list of expressions to compile
 * @param named An optional list of named arguments (name + expression) to compile
 */
function Call(op, handle, positional, named) {
  op(MachineOp.PushFrame);
  SimpleArgs(op, positional, named, false);
  op(Op.Helper, handle);
  op(MachineOp.PopFrame);
  op(Op.Fetch, $v0);
}

/**
 * Invoke a foreign function (a "helper") based on a dynamically loaded definition
 *
 * @param op The op creation function
 * @param positional An optional list of expressions to compile
 * @param named An optional list of named arguments (name + expression) to compile
 */
function CallDynamic(op, positional, named, append) {
  op(MachineOp.PushFrame);
  SimpleArgs(op, positional, named, false);
  op(Op.Dup, $fp, 1);
  op(Op.DynamicHelper);
  if (append) {
    op(Op.Fetch, $v0);
    append();
    op(MachineOp.PopFrame);
    op(Op.Pop, 1);
  } else {
    op(MachineOp.PopFrame);
    op(Op.Pop, 1);
    op(Op.Fetch, $v0);
  }
}

/**
 * Evaluate statements in the context of new dynamic scope entries. Move entries from the
 * stack into named entries in the dynamic scope, then evaluate the statements, then pop
 * the dynamic scope
 *
 * @param names a list of dynamic scope names
 * @param block a function that returns a list of statements to evaluate
 */
function DynamicScope(op, names, block) {
  op(Op.PushDynamicScope);
  op(Op.BindDynamicScope, names);
  block();
  op(Op.PopDynamicScope);
}
function Curry(op, type, definition, positional, named) {
  op(MachineOp.PushFrame);
  SimpleArgs(op, positional, named, false);
  op(Op.CaptureArgs);
  expr(op, definition);
  op(Op.Curry, type, isStrictMode());
  op(MachineOp.PopFrame);
  op(Op.Fetch, $v0);
}

class Compilers {
  names = {};
  funcs = [];
  add(name, func) {
    this.names[name] = this.funcs.push(func) - 1;
  }
  compile(op, sexp) {
    let name = sexp[0];
    let index = unwrap(this.names[name]);
    let func = this.funcs[index];
    assert$1(!!func, `expected an implementation for ${sexp[0]}`);
    func(op, sexp);
  }
}

const EXPRESSIONS = new Compilers();
EXPRESSIONS.add(SexpOpcodes.Concat, (op, [, parts]) => {
  for (let part of parts) {
    expr(op, part);
  }
  op(Op.Concat, parts.length);
});
EXPRESSIONS.add(SexpOpcodes.Call, (op, [, expression, positional, named]) => {
  if (isGetFreeHelper(expression)) {
    op(HighLevelResolutionOpcodes.Helper, expression, handle => {
      Call(op, handle, positional, named);
    });
  } else {
    expr(op, expression);
    CallDynamic(op, positional, named);
  }
});
EXPRESSIONS.add(SexpOpcodes.Curry, (op, [, expr, type, positional, named]) => {
  Curry(op, type, expr, positional, named);
});
EXPRESSIONS.add(SexpOpcodes.GetSymbol, (op, [, sym, path]) => {
  op(Op.GetVariable, sym);
  withPath(op, path);
});
EXPRESSIONS.add(SexpOpcodes.GetLexicalSymbol, (op, [, sym, path]) => {
  op(HighLevelResolutionOpcodes.TemplateLocal, sym, handle => {
    op(Op.ConstantReference, handle);
    withPath(op, path);
  });
});
EXPRESSIONS.add(SexpOpcodes.GetStrictKeyword, (op, [, sym, _path]) => {
  op(HighLevelResolutionOpcodes.Free, sym, _handle => {
    // TODO: Implement in strict mode
  });
});
EXPRESSIONS.add(SexpOpcodes.GetFreeAsComponentOrHelperHeadOrThisFallback, () => {
  // TODO: The logic for this opcode currently exists in STATEMENTS.Append, since
  // we want different wrapping logic depending on if we are invoking a component,
  // helper, or {{this}} fallback. Eventually we fix the opcodes so that we can
  // traverse the subexpression tree like normal in this location.
  throw new Error('unimplemented opcode');
});
EXPRESSIONS.add(SexpOpcodes.GetFreeAsHelperHeadOrThisFallback, (op, expr) => {
  // <div id={{baz}}>

  op(HighLevelResolutionOpcodes.Local, expr[1], _name => {
    op(HighLevelResolutionOpcodes.OptionalHelper, expr, {
      ifHelper: handle => {
        Call(op, handle, null, null);
      }
    });
  });
});
EXPRESSIONS.add(SexpOpcodes.GetFreeAsDeprecatedHelperHeadOrThisFallback, (op, expr) => {
  // <Foo @bar={{baz}}>

  op(HighLevelResolutionOpcodes.Local, expr[1], _name => {
    op(HighLevelResolutionOpcodes.OptionalHelper, expr, {
      ifHelper: (handle, name, moduleName) => {
        assert(expr[2] && expr[2].length === 1, '[BUG] Missing argument name');
        let arg = expr[2][0];
        deprecate(`The \`${name}\` helper was used in the \`${moduleName}\` template as \`${arg}={{${name}}}\`. ` + `This is ambigious between wanting the \`${arg}\` argument to be the \`${name}\` helper itself, ` + `or the result of invoking the \`${name}\` helper (current behavior). ` + `This implicit invocation behavior has been deprecated.\n\n` + `Instead, please explicitly invoke the helper with parenthesis, i.e. \`${arg}={{(${name})}}\`.\n\n` + `Note: the parenthesis are only required in this exact scenario where an ambiguity is present – where ` + `\`${name}\` referes to a global helper (as opposed to a local variable), AND ` + `the \`${name}\` helper invocation does not take any arguments, AND ` + `this occurs in a named argument position of a component invocation.\n\n` + `We expect this combination to be quite rare, as most helpers require at least one argument. ` + `There is no need to refactor helper invocations in cases where this deprecation was not triggered.`, false, {
          id: 'argument-less-helper-paren-less-invocation'
        });
        Call(op, handle, null, null);
      }
    });
  });
});
function withPath(op, path) {
  if (path === undefined || path.length === 0) return;
  for (let i = 0; i < path.length; i++) {
    op(Op.GetProperty, path[i]);
  }
}
EXPRESSIONS.add(SexpOpcodes.Undefined, op => PushPrimitiveReference(op, undefined));
EXPRESSIONS.add(SexpOpcodes.HasBlock, (op, [, block]) => {
  expr(op, block);
  op(Op.HasBlock);
});
EXPRESSIONS.add(SexpOpcodes.HasBlockParams, (op, [, block]) => {
  expr(op, block);
  op(Op.SpreadBlock);
  op(Op.CompileBlock);
  op(Op.HasBlockParams);
});
EXPRESSIONS.add(SexpOpcodes.IfInline, (op, [, condition, truthy, falsy]) => {
  // Push in reverse order
  expr(op, falsy);
  expr(op, truthy);
  expr(op, condition);
  op(Op.IfInline);
});
EXPRESSIONS.add(SexpOpcodes.Not, (op, [, value]) => {
  expr(op, value);
  op(Op.Not);
});
EXPRESSIONS.add(SexpOpcodes.GetDynamicVar, (op, [, expression]) => {
  expr(op, expression);
  op(Op.GetDynamicVar);
});
EXPRESSIONS.add(SexpOpcodes.Log, (op, [, positional]) => {
  op(MachineOp.PushFrame);
  SimpleArgs(op, positional, null, false);
  op(Op.Log);
  op(MachineOp.PopFrame);
  op(Op.Fetch, $v0);
});

function expr(op, expression) {
  if (Array.isArray(expression)) {
    EXPRESSIONS.compile(op, expression);
  } else {
    PushPrimitive(op, expression);
    op(Op.PrimitiveReference);
  }
}

/**
 * Compile arguments, pushing an Arguments object onto the stack.
 *
 * @param args.params
 * @param args.hash
 * @param args.blocks
 * @param args.atNames
 */
function CompileArgs(op, positional, named, blocks, atNames) {
  let blockNames = blocks.names;
  for (const name of blockNames) {
    PushYieldableBlock(op, blocks.get(name));
  }
  let count = CompilePositional(op, positional);
  let flags = count << 4;
  if (atNames) flags |= 0b1000;
  if (blocks) {
    flags |= 0b111;
  }
  let names = EMPTY_ARRAY;
  if (named) {
    names = named[0];
    let val = named[1];
    for (let i = 0; i < val.length; i++) {
      expr(op, val[i]);
    }
  }
  op(Op.PushArgs, names, blockNames, flags);
}
function SimpleArgs(op, positional, named, atNames) {
  if (positional === null && named === null) {
    op(Op.PushEmptyArgs);
    return;
  }
  let count = CompilePositional(op, positional);
  let flags = count << 4;
  if (atNames) flags |= 0b1000;
  let names = EMPTY_STRING_ARRAY;
  if (named) {
    names = named[0];
    let val = named[1];
    for (let i = 0; i < val.length; i++) {
      expr(op, val[i]);
    }
  }
  op(Op.PushArgs, names, EMPTY_STRING_ARRAY, flags);
}

/**
 * Compile an optional list of positional arguments, which pushes each argument
 * onto the stack and returns the number of parameters compiled
 *
 * @param positional an optional list of positional arguments
 */
function CompilePositional(op, positional) {
  if (positional === null) return 0;
  for (let i = 0; i < positional.length; i++) {
    expr(op, positional[i]);
  }
  return positional.length;
}
function meta(layout) {
  let [, symbols,, upvars] = layout.block;
  return {
    evalSymbols: evalSymbols(layout),
    upvars: upvars,
    scopeValues: layout.scope?.() ?? null,
    isStrictMode: layout.isStrictMode,
    moduleName: layout.moduleName,
    owner: layout.owner,
    size: symbols.length
  };
}
function evalSymbols(layout) {
  let {
    block
  } = layout;
  let [, symbols, hasEval] = block;
  return hasEval ? symbols : null;
}

/**
 * Yield to a block located at a particular symbol location.
 *
 * @param to the symbol containing the block to yield to
 * @param params optional block parameters to yield to the block
 */
function YieldBlock(op, to, positional) {
  SimpleArgs(op, positional, null, true);
  op(Op.GetBlock, to);
  op(Op.SpreadBlock);
  op(Op.CompileBlock);
  op(Op.InvokeYield);
  op(Op.PopScope);
  op(MachineOp.PopFrame);
}

/**
 * Push an (optional) yieldable block onto the stack. The yieldable block must be known
 * statically at compile time.
 *
 * @param block An optional Compilable block
 */
function PushYieldableBlock(op, block) {
  PushSymbolTable(op, block && block[1]);
  op(Op.PushBlockScope);
  PushCompilable(op, block);
}

/**
 * Invoke a block that is known statically at compile time.
 *
 * @param block a Compilable block
 */
function InvokeStaticBlock(op, block) {
  op(MachineOp.PushFrame);
  PushCompilable(op, block);
  op(Op.CompileBlock);
  op(MachineOp.InvokeVirtual);
  op(MachineOp.PopFrame);
}

/**
 * Invoke a static block, preserving some number of stack entries for use in
 * updating.
 *
 * @param block A compilable block
 * @param callerCount A number of stack entries to preserve
 */
function InvokeStaticBlockWithStack(op, block, callerCount) {
  let parameters = block[1];
  let calleeCount = parameters.length;
  let count = Math.min(callerCount, calleeCount);
  if (count === 0) {
    InvokeStaticBlock(op, block);
    return;
  }
  op(MachineOp.PushFrame);
  if (count) {
    op(Op.ChildScope);
    for (let i = 0; i < count; i++) {
      op(Op.Dup, $fp, callerCount - i);
      op(Op.SetVariable, parameters[i]);
    }
  }
  PushCompilable(op, block);
  op(Op.CompileBlock);
  op(MachineOp.InvokeVirtual);
  if (count) {
    op(Op.PopScope);
  }
  op(MachineOp.PopFrame);
}
function PushSymbolTable(op, parameters) {
  if (parameters !== null) {
    op(Op.PushSymbolTable, symbolTableOperand({
      parameters
    }));
  } else {
    PushPrimitive(op, null);
  }
}
function PushCompilable(op, _block) {
  if (_block === null) {
    PushPrimitive(op, null);
  } else {
    op(Op.Constant, blockOperand(_block));
  }
}

function SwitchCases(op, bootstrap, matcher) {
  // Setup the switch DSL
  let clauses = [];
  let count = 0;
  function when(match, callback) {
    clauses.push({
      match,
      callback,
      label: `CLAUSE${count++}`
    });
  }

  // Call the callback
  matcher(when);

  // Emit the opcodes for the switch
  op(Op.Enter, 1);
  bootstrap();
  op(HighLevelBuilderOpcodes.StartLabels);

  // First, emit the jump opcodes. We don't need a jump for the last
  // opcode, since it bleeds directly into its clause.
  for (let clause of clauses.slice(0, -1)) {
    op(Op.JumpEq, labelOperand(clause.label), clause.match);
  }

  // Enumerate the clauses in reverse order. Earlier matches will
  // require fewer checks.
  for (let i = clauses.length - 1; i >= 0; i--) {
    let clause = unwrap(clauses[i]);
    op(HighLevelBuilderOpcodes.Label, clause.label);
    op(Op.Pop, 1);
    clause.callback();

    // The first match is special: it is placed directly before the END
    // label, so no additional jump is needed at the end of it.
    if (i !== 0) {
      op(MachineOp.Jump, labelOperand('END'));
    }
  }
  op(HighLevelBuilderOpcodes.Label, 'END');
  op(HighLevelBuilderOpcodes.StopLabels);
  op(Op.Exit);
}

/**
 * A convenience for pushing some arguments on the stack and
 * running some code if the code needs to be re-executed during
 * updating execution if some of the arguments have changed.
 *
 * # Initial Execution
 *
 * The `args` function should push zero or more arguments onto
 * the stack and return the number of arguments pushed.
 *
 * The `body` function provides the instructions to execute both
 * during initial execution and during updating execution.
 *
 * Internally, this function starts by pushing a new frame, so
 * that the body can return and sets the return point ($ra) to
 * the ENDINITIAL label.
 *
 * It then executes the `args` function, which adds instructions
 * responsible for pushing the arguments for the block to the
 * stack. These arguments will be restored to the stack before
 * updating execution.
 *
 * Next, it adds the Enter opcode, which marks the current position
 * in the DOM, and remembers the current $pc (the next instruction)
 * as the first instruction to execute during updating execution.
 *
 * Next, it runs `body`, which adds the opcodes that should
 * execute both during initial execution and during updating execution.
 * If the `body` wishes to finish early, it should Jump to the
 * `FINALLY` label.
 *
 * Next, it adds the FINALLY label, followed by:
 *
 * - the Exit opcode, which finalizes the marked DOM started by the
 *   Enter opcode.
 * - the Return opcode, which returns to the current return point
 *   ($ra).
 *
 * Finally, it adds the ENDINITIAL label followed by the PopFrame
 * instruction, which restores $fp, $sp and $ra.
 *
 * # Updating Execution
 *
 * Updating execution for this `replayable` occurs if the `body` added an
 * assertion, via one of the `JumpIf`, `JumpUnless` or `AssertSame` opcodes.
 *
 * If, during updating executon, the assertion fails, the initial VM is
 * restored, and the stored arguments are pushed onto the stack. The DOM
 * between the starting and ending markers is cleared, and the VM's cursor
 * is set to the area just cleared.
 *
 * The return point ($ra) is set to -1, the exit instruction.
 *
 * Finally, the $pc is set to to the instruction saved off by the
 * Enter opcode during initial execution, and execution proceeds as
 * usual.
 *
 * The only difference is that when a `Return` instruction is
 * encountered, the program jumps to -1 rather than the END label,
 * and the PopFrame opcode is not needed.
 */
function Replayable(op, args, body) {
  // Start a new label frame, to give END and RETURN
  // a unique meaning.

  op(HighLevelBuilderOpcodes.StartLabels);
  op(MachineOp.PushFrame);

  // If the body invokes a block, its return will return to
  // END. Otherwise, the return in RETURN will return to END.
  op(MachineOp.ReturnTo, labelOperand('ENDINITIAL'));

  // Push the arguments onto the stack. The args() function
  // tells us how many stack elements to retain for re-execution
  // when updating.
  let count = args();

  // Start a new updating closure, remembering `count` elements
  // from the stack. Everything after this point, and before END,
  // will execute both initially and to update the block.
  //
  // The enter and exit opcodes also track the area of the DOM
  // associated with this block. If an assertion inside the block
  // fails (for example, the test value changes from true to false
  // in an #if), the DOM is cleared and the program is re-executed,
  // restoring `count` elements to the stack and executing the
  // instructions between the enter and exit.
  op(Op.Enter, count);

  // Evaluate the body of the block. The body of the block may
  // return, which will jump execution to END during initial
  // execution, and exit the updating routine.
  body();

  // All execution paths in the body should run the FINALLY once
  // they are done. It is executed both during initial execution
  // and during updating execution.
  op(HighLevelBuilderOpcodes.Label, 'FINALLY');

  // Finalize the DOM.
  op(Op.Exit);

  // In initial execution, this is a noop: it returns to the
  // immediately following opcode. In updating execution, this
  // exits the updating routine.
  op(MachineOp.Return);

  // Cleanup code for the block. Runs on initial execution
  // but not on updating.
  op(HighLevelBuilderOpcodes.Label, 'ENDINITIAL');
  op(MachineOp.PopFrame);
  op(HighLevelBuilderOpcodes.StopLabels);
}

/**
 * A specialized version of the `replayable` convenience that allows the
 * caller to provide different code based upon whether the item at
 * the top of the stack is true or false.
 *
 * As in `replayable`, the `ifTrue` and `ifFalse` code can invoke `return`.
 *
 * During the initial execution, a `return` will continue execution
 * in the cleanup code, which finalizes the current DOM block and pops
 * the current frame.
 *
 * During the updating execution, a `return` will exit the updating
 * routine, as it can reuse the DOM block and is always only a single
 * frame deep.
 */
function ReplayableIf(op, args, ifTrue, ifFalse) {
  return Replayable(op, args, () => {
    // If the conditional is false, jump to the ELSE label.
    op(Op.JumpUnless, labelOperand('ELSE'));
    // Otherwise, execute the code associated with the true branch.
    ifTrue();
    // We're done, so return. In the initial execution, this runs
    // the cleanup code. In the updating VM, it exits the updating
    // routine.
    op(MachineOp.Jump, labelOperand('FINALLY'));
    op(HighLevelBuilderOpcodes.Label, 'ELSE');

    // If the conditional is false, and code associatied ith the
    // false branch was provided, execute it. If there was no code
    // associated with the false branch, jumping to the else statement
    // has no other behavior.
    if (ifFalse !== undefined) {
      ifFalse();
    }
  });
}

const ATTRS_BLOCK = '&attrs';

// {{component}}

// <Component>

// chokepoint

function InvokeComponent(op, component, _elementBlock, positional, named, _blocks) {
  let {
    compilable,
    capabilities,
    handle
  } = component;
  let elementBlock = _elementBlock ? [_elementBlock, []] : null;
  let blocks = Array.isArray(_blocks) || _blocks === null ? namedBlocks(_blocks) : _blocks;
  if (compilable) {
    op(Op.PushComponentDefinition, handle);
    InvokeStaticComponent(op, {
      capabilities: capabilities,
      layout: compilable,
      elementBlock,
      positional,
      named,
      blocks
    });
  } else {
    op(Op.PushComponentDefinition, handle);
    InvokeNonStaticComponent(op, {
      capabilities: capabilities,
      elementBlock,
      positional,
      named,
      atNames: true,
      blocks
    });
  }
}
function InvokeDynamicComponent(op, definition, _elementBlock, positional, named, _blocks, atNames, curried) {
  let elementBlock = _elementBlock ? [_elementBlock, []] : null;
  let blocks = Array.isArray(_blocks) || _blocks === null ? namedBlocks(_blocks) : _blocks;
  Replayable(op, () => {
    expr(op, definition);
    op(Op.Dup, $sp, 0);
    return 2;
  }, () => {
    op(Op.JumpUnless, labelOperand('ELSE'));
    if (curried) {
      op(Op.ResolveCurriedComponent);
    } else {
      op(Op.ResolveDynamicComponent, isStrictMode());
    }
    op(Op.PushDynamicComponentInstance);
    InvokeNonStaticComponent(op, {
      capabilities: true,
      elementBlock,
      positional,
      named,
      atNames,
      blocks
    });
    op(HighLevelBuilderOpcodes.Label, 'ELSE');
  });
}
function InvokeStaticComponent(op, {
  capabilities,
  layout,
  elementBlock,
  positional,
  named,
  blocks
}) {
  let {
    symbolTable
  } = layout;
  let bailOut = symbolTable.hasEval || hasCapability(capabilities, InternalComponentCapabilities.prepareArgs);
  if (bailOut) {
    InvokeNonStaticComponent(op, {
      capabilities,
      elementBlock,
      positional,
      named,
      atNames: true,
      blocks,
      layout
    });
    return;
  }
  op(Op.Fetch, $s0);
  op(Op.Dup, $sp, 1);
  op(Op.Load, $s0);
  op(MachineOp.PushFrame);

  // Setup arguments
  let {
    symbols
  } = symbolTable;

  // As we push values onto the stack, we store the symbols associated  with them
  // so that we can set them on the scope later on with SetVariable and SetBlock
  let blockSymbols = [];
  let argSymbols = [];
  let argNames = [];

  // First we push the blocks onto the stack
  let blockNames = blocks.names;

  // Starting with the attrs block, if it exists and is referenced in the component
  if (elementBlock !== null) {
    let symbol = symbols.indexOf(ATTRS_BLOCK);
    if (symbol !== -1) {
      PushYieldableBlock(op, elementBlock);
      blockSymbols.push(symbol);
    }
  }

  // Followed by the other blocks, if they exist and are referenced in the component.
  // Also store the index of the associated symbol.
  for (const name of blockNames) {
    let symbol = symbols.indexOf(`&${name}`);
    if (symbol !== -1) {
      PushYieldableBlock(op, blocks.get(name));
      blockSymbols.push(symbol);
    }
  }

  // Next up we have arguments. If the component has the `createArgs` capability,
  // then it wants access to the arguments in JavaScript. We can't know whether
  // or not an argument is used, so we have to give access to all of them.
  if (hasCapability(capabilities, InternalComponentCapabilities.createArgs)) {
    // First we push positional arguments
    let count = CompilePositional(op, positional);

    // setup the flags with the count of positionals, and to indicate that atNames
    // are used
    let flags = count << 4;
    flags |= 0b1000;
    let names = EMPTY_STRING_ARRAY;

    // Next, if named args exist, push them all. If they have an associated symbol
    // in the invoked component (e.g. they are used within its template), we push
    // that symbol. If not, we still push the expression as it may be used, and
    // we store the symbol as -1 (this is used later).
    if (named !== null) {
      names = named[0];
      let val = named[1];
      for (let i = 0; i < val.length; i++) {
        let symbol = symbols.indexOf(unwrap(names[i]));
        expr(op, val[i]);
        argSymbols.push(symbol);
      }
    }

    // Finally, push the VM arguments themselves. These args won't need access
    // to blocks (they aren't accessible from userland anyways), so we push an
    // empty array instead of the actual block names.
    op(Op.PushArgs, names, EMPTY_STRING_ARRAY, flags);

    // And push an extra pop operation to remove the args before we begin setting
    // variables on the local context
    argSymbols.push(-1);
  } else if (named !== null) {
    // If the component does not have the `createArgs` capability, then the only
    // expressions we need to push onto the stack are those that are actually
    // referenced in the template of the invoked component (e.g. have symbols).
    let names = named[0];
    let val = named[1];
    for (let i = 0; i < val.length; i++) {
      let name = unwrap(names[i]);
      let symbol = symbols.indexOf(name);
      if (symbol !== -1) {
        expr(op, val[i]);
        argSymbols.push(symbol);
        argNames.push(name);
      }
    }
  }
  op(Op.BeginComponentTransaction, $s0);
  if (hasCapability(capabilities, InternalComponentCapabilities.dynamicScope)) {
    op(Op.PushDynamicScope);
  }
  if (hasCapability(capabilities, InternalComponentCapabilities.createInstance)) {
    op(Op.CreateComponent, blocks.has('default') | 0, $s0);
  }
  op(Op.RegisterComponentDestructor, $s0);
  if (hasCapability(capabilities, InternalComponentCapabilities.createArgs)) {
    op(Op.GetComponentSelf, $s0);
  } else {
    op(Op.GetComponentSelf, $s0, argNames);
  }

  // Setup the new root scope for the component
  op(Op.RootScope, symbols.length + 1, Object.keys(blocks).length > 0 ? 1 : 0);

  // Pop the self reference off the stack and set it to the symbol for `this`
  // in the new scope. This is why all subsequent symbols are increased by one.
  op(Op.SetVariable, 0);

  // Going in reverse, now we pop the args/blocks off the stack, starting with
  // arguments, and assign them to their symbols in the new scope.
  for (const symbol of reverse(argSymbols)) {
    // for (let i = argSymbols.length - 1; i >= 0; i--) {
    //   let symbol = argSymbols[i];

    if (symbol === -1) {
      // The expression was not bound to a local symbol, it was only pushed to be
      // used with VM args in the javascript side
      op(Op.Pop, 1);
    } else {
      op(Op.SetVariable, symbol + 1);
    }
  }

  // if any positional params exist, pop them off the stack as well
  if (positional !== null) {
    op(Op.Pop, positional.length);
  }

  // Finish up by popping off and assigning blocks
  for (const symbol of reverse(blockSymbols)) {
    op(Op.SetBlock, symbol + 1);
  }
  op(Op.Constant, layoutOperand(layout));
  op(Op.CompileBlock);
  op(MachineOp.InvokeVirtual);
  op(Op.DidRenderLayout, $s0);
  op(MachineOp.PopFrame);
  op(Op.PopScope);
  if (hasCapability(capabilities, InternalComponentCapabilities.dynamicScope)) {
    op(Op.PopDynamicScope);
  }
  op(Op.CommitComponentTransaction);
  op(Op.Load, $s0);
}
function InvokeNonStaticComponent(op, {
  capabilities,
  elementBlock,
  positional,
  named,
  atNames,
  blocks: namedBlocks,
  layout
}) {
  let bindableBlocks = !!namedBlocks;
  let bindableAtNames = capabilities === true || hasCapability(capabilities, InternalComponentCapabilities.prepareArgs) || !!(named && named[0].length !== 0);
  let blocks = namedBlocks.with('attrs', elementBlock);
  op(Op.Fetch, $s0);
  op(Op.Dup, $sp, 1);
  op(Op.Load, $s0);
  op(MachineOp.PushFrame);
  CompileArgs(op, positional, named, blocks, atNames);
  op(Op.PrepareArgs, $s0);
  invokePreparedComponent(op, blocks.has('default'), bindableBlocks, bindableAtNames, () => {
    if (layout) {
      op(Op.PushSymbolTable, symbolTableOperand(layout.symbolTable));
      op(Op.Constant, layoutOperand(layout));
      op(Op.CompileBlock);
    } else {
      op(Op.GetComponentLayout, $s0);
    }
    op(Op.PopulateLayout, $s0);
  });
  op(Op.Load, $s0);
}
function WrappedComponent(op, layout, attrsBlockNumber) {
  op(HighLevelBuilderOpcodes.StartLabels);
  WithSavedRegister(op, $s1, () => {
    op(Op.GetComponentTagName, $s0);
    op(Op.PrimitiveReference);
    op(Op.Dup, $sp, 0);
  });
  op(Op.JumpUnless, labelOperand('BODY'));
  op(Op.Fetch, $s1);
  op(Op.PutComponentOperations);
  op(Op.OpenDynamicElement);
  op(Op.DidCreateElement, $s0);
  YieldBlock(op, attrsBlockNumber, null);
  op(Op.FlushElement);
  op(HighLevelBuilderOpcodes.Label, 'BODY');
  InvokeStaticBlock(op, [layout.block[0], []]);
  op(Op.Fetch, $s1);
  op(Op.JumpUnless, labelOperand('END'));
  op(Op.CloseElement);
  op(HighLevelBuilderOpcodes.Label, 'END');
  op(Op.Load, $s1);
  op(HighLevelBuilderOpcodes.StopLabels);
}
function invokePreparedComponent(op, hasBlock, bindableBlocks, bindableAtNames, populateLayout = null) {
  op(Op.BeginComponentTransaction, $s0);
  op(Op.PushDynamicScope);
  op(Op.CreateComponent, hasBlock | 0, $s0);

  // this has to run after createComponent to allow
  // for late-bound layouts, but a caller is free
  // to populate the layout earlier if it wants to
  // and do nothing here.
  if (populateLayout) {
    populateLayout();
  }
  op(Op.RegisterComponentDestructor, $s0);
  op(Op.GetComponentSelf, $s0);
  op(Op.VirtualRootScope, $s0);
  op(Op.SetVariable, 0);
  op(Op.SetupForEval, $s0);
  if (bindableAtNames) op(Op.SetNamedVariables, $s0);
  if (bindableBlocks) op(Op.SetBlocks, $s0);
  op(Op.Pop, 1);
  op(Op.InvokeComponentLayout, $s0);
  op(Op.DidRenderLayout, $s0);
  op(MachineOp.PopFrame);
  op(Op.PopScope);
  op(Op.PopDynamicScope);
  op(Op.CommitComponentTransaction);
}
function InvokeBareComponent(op) {
  op(Op.Fetch, $s0);
  op(Op.Dup, $sp, 1);
  op(Op.Load, $s0);
  op(MachineOp.PushFrame);
  op(Op.PushEmptyArgs);
  op(Op.PrepareArgs, $s0);
  invokePreparedComponent(op, false, false, true, () => {
    op(Op.GetComponentLayout, $s0);
    op(Op.PopulateLayout, $s0);
  });
  op(Op.Load, $s0);
}
function WithSavedRegister(op, register, block) {
  op(Op.Fetch, register);
  block();
  op(Op.Load, register);
}

function main(op) {
  op(Op.Main, $s0);
  invokePreparedComponent(op, false, false, true);
}

/**
 * Append content to the DOM. This standard function triages content and does the
 * right thing based upon whether it's a string, safe string, component, fragment
 * or node.
 *
 * @param trusting whether to interpolate a string as raw HTML (corresponds to
 * triple curlies)
 */
function StdAppend(op, trusting, nonDynamicAppend) {
  SwitchCases(op, () => op(Op.ContentType), when => {
    when(ContentType.String, () => {
      if (trusting) {
        op(Op.AssertSame);
        op(Op.AppendHTML);
      } else {
        op(Op.AppendText);
      }
    });
    if (typeof nonDynamicAppend === 'number') {
      when(ContentType.Component, () => {
        op(Op.ResolveCurriedComponent);
        op(Op.PushDynamicComponentInstance);
        InvokeBareComponent(op);
      });
      when(ContentType.Helper, () => {
        CallDynamic(op, null, null, () => {
          op(MachineOp.InvokeStatic, nonDynamicAppend);
        });
      });
    } else {
      // when non-dynamic, we can no longer call the value (potentially because we've already called it)
      // this prevents infinite loops. We instead coerce the value, whatever it is, into the DOM.
      when(ContentType.Component, () => {
        op(Op.AppendText);
      });
      when(ContentType.Helper, () => {
        op(Op.AppendText);
      });
    }
    when(ContentType.SafeString, () => {
      op(Op.AssertSame);
      op(Op.AppendSafeHTML);
    });
    when(ContentType.Fragment, () => {
      op(Op.AssertSame);
      op(Op.AppendDocumentFragment);
    });
    when(ContentType.Node, () => {
      op(Op.AssertSame);
      op(Op.AppendNode);
    });
  });
}
function compileStd(context) {
  let mainHandle = build(context, op => main(op));
  let trustingGuardedNonDynamicAppend = build(context, op => StdAppend(op, true, null));
  let cautiousGuardedNonDynamicAppend = build(context, op => StdAppend(op, false, null));
  let trustingGuardedDynamicAppend = build(context, op => StdAppend(op, true, trustingGuardedNonDynamicAppend));
  let cautiousGuardedDynamicAppend = build(context, op => StdAppend(op, false, cautiousGuardedNonDynamicAppend));
  return new StdLib(mainHandle, trustingGuardedDynamicAppend, cautiousGuardedDynamicAppend, trustingGuardedNonDynamicAppend, cautiousGuardedNonDynamicAppend);
}
const STDLIB_META = {
  evalSymbols: null,
  upvars: null,
  moduleName: 'stdlib',
  // TODO: ??
  scopeValues: null,
  isStrictMode: true,
  owner: null,
  size: 0
};
function build(program, builder) {
  let {
    constants,
    heap,
    resolver
  } = program;
  let encoder = new EncoderImpl(heap, STDLIB_META);
  function pushOp(...op) {
    encodeOp(encoder, constants, resolver, STDLIB_META, op);
  }
  builder(pushOp);
  let result = encoder.commit(0);
  if (typeof result !== 'number') {
    // This shouldn't be possible
    throw new Error(`Unexpected errors compiling std`);
  } else {
    return result;
  }
}

class CompileTimeCompilationContextImpl {
  constants;
  heap;
  stdlib;
  constructor({
    constants,
    heap
  }, resolver, createOp) {
    this.resolver = resolver;
    this.createOp = createOp;
    this.constants = constants;
    this.heap = heap;
    this.stdlib = compileStd(this);
  }
}

function programCompilationContext(artifacts, resolver, createOp) {
  return new CompileTimeCompilationContextImpl(artifacts, resolver, createOp);
}
function templateCompilationContext(program, meta) {
  let encoder = new EncoderImpl(program.heap, meta, program.stdlib);
  return {
    program,
    encoder,
    meta
  };
}

const STATEMENTS = new Compilers();
const INFLATE_ATTR_TABLE = ['class', 'id', 'value', 'name', 'type', 'style', 'href'];
const INFLATE_TAG_TABLE = ['div', 'span', 'p', 'a'];
function inflateTagName(tagName) {
  return typeof tagName === 'string' ? tagName : INFLATE_TAG_TABLE[tagName];
}
function inflateAttrName(attrName) {
  return typeof attrName === 'string' ? attrName : INFLATE_ATTR_TABLE[attrName];
}
STATEMENTS.add(SexpOpcodes.Comment, (op, sexp) => op(Op.Comment, sexp[1]));
STATEMENTS.add(SexpOpcodes.CloseElement, op => op(Op.CloseElement));
STATEMENTS.add(SexpOpcodes.FlushElement, op => op(Op.FlushElement));
STATEMENTS.add(SexpOpcodes.Modifier, (op, [, expression, positional, named]) => {
  if (isGetFreeModifier(expression)) {
    op(HighLevelResolutionOpcodes.Modifier, expression, handle => {
      op(MachineOp.PushFrame);
      SimpleArgs(op, positional, named, false);
      op(Op.Modifier, handle);
      op(MachineOp.PopFrame);
    });
  } else {
    expr(op, expression);
    op(MachineOp.PushFrame);
    SimpleArgs(op, positional, named, false);
    op(Op.Dup, $fp, 1);
    op(Op.DynamicModifier);
    op(MachineOp.PopFrame);
  }
});
STATEMENTS.add(SexpOpcodes.StaticAttr, (op, [, name, value, namespace]) => {
  op(Op.StaticAttr, inflateAttrName(name), value, namespace ?? null);
});
STATEMENTS.add(SexpOpcodes.StaticComponentAttr, (op, [, name, value, namespace]) => {
  op(Op.StaticComponentAttr, inflateAttrName(name), value, namespace ?? null);
});
STATEMENTS.add(SexpOpcodes.DynamicAttr, (op, [, name, value, namespace]) => {
  expr(op, value);
  op(Op.DynamicAttr, inflateAttrName(name), false, namespace ?? null);
});
STATEMENTS.add(SexpOpcodes.TrustingDynamicAttr, (op, [, name, value, namespace]) => {
  expr(op, value);
  op(Op.DynamicAttr, inflateAttrName(name), true, namespace ?? null);
});
STATEMENTS.add(SexpOpcodes.ComponentAttr, (op, [, name, value, namespace]) => {
  expr(op, value);
  op(Op.ComponentAttr, inflateAttrName(name), false, namespace ?? null);
});
STATEMENTS.add(SexpOpcodes.TrustingComponentAttr, (op, [, name, value, namespace]) => {
  expr(op, value);
  op(Op.ComponentAttr, inflateAttrName(name), true, namespace ?? null);
});
STATEMENTS.add(SexpOpcodes.OpenElement, (op, [, tag]) => {
  op(Op.OpenElement, inflateTagName(tag));
});
STATEMENTS.add(SexpOpcodes.OpenElementWithSplat, (op, [, tag]) => {
  op(Op.PutComponentOperations);
  op(Op.OpenElement, inflateTagName(tag));
});
STATEMENTS.add(SexpOpcodes.Component, (op, [, expr, elementBlock, named, blocks]) => {
  if (isGetFreeComponent(expr)) {
    op(HighLevelResolutionOpcodes.Component, expr, component => {
      InvokeComponent(op, component, elementBlock, null, named, blocks);
    });
  } else {
    // otherwise, the component name was an expression, so resolve the expression
    // and invoke it as a dynamic component
    InvokeDynamicComponent(op, expr, elementBlock, null, named, blocks, true, true);
  }
});
STATEMENTS.add(SexpOpcodes.Yield, (op, [, to, params]) => YieldBlock(op, to, params));
STATEMENTS.add(SexpOpcodes.AttrSplat, (op, [, to]) => YieldBlock(op, to, null));
STATEMENTS.add(SexpOpcodes.Debugger, (op, [, debugInfo]) => op(Op.Debugger, debugSymbolsOperand(), debugInfo));
STATEMENTS.add(SexpOpcodes.Append, (op, [, value]) => {
  // Special case for static values
  if (!Array.isArray(value)) {
    op(Op.Text, value === null || value === undefined ? '' : String(value));
  } else if (isGetFreeOptionalComponentOrHelper(value)) {
    op(HighLevelResolutionOpcodes.OptionalComponentOrHelper, value, {
      ifComponent(component) {
        InvokeComponent(op, component, null, null, null, null);
      },
      ifHelper(handle) {
        op(MachineOp.PushFrame);
        Call(op, handle, null, null);
        op(MachineOp.InvokeStatic, stdlibOperand('cautious-non-dynamic-append'));
        op(MachineOp.PopFrame);
      },
      ifValue(handle) {
        op(MachineOp.PushFrame);
        op(Op.ConstantReference, handle);
        op(MachineOp.InvokeStatic, stdlibOperand('cautious-non-dynamic-append'));
        op(MachineOp.PopFrame);
      }
    });
  } else if (value[0] === SexpOpcodes.Call) {
    let [, expression, positional, named] = value;
    if (isGetFreeComponentOrHelper(expression)) {
      op(HighLevelResolutionOpcodes.ComponentOrHelper, expression, {
        ifComponent(component) {
          InvokeComponent(op, component, null, positional, hashToArgs(named), null);
        },
        ifHelper(handle) {
          op(MachineOp.PushFrame);
          Call(op, handle, positional, named);
          op(MachineOp.InvokeStatic, stdlibOperand('cautious-non-dynamic-append'));
          op(MachineOp.PopFrame);
        }
      });
    } else {
      SwitchCases(op, () => {
        expr(op, expression);
        op(Op.DynamicContentType);
      }, when => {
        when(ContentType.Component, () => {
          op(Op.ResolveCurriedComponent);
          op(Op.PushDynamicComponentInstance);
          InvokeNonStaticComponent(op, {
            capabilities: true,
            elementBlock: null,
            positional,
            named,
            atNames: false,
            blocks: namedBlocks(null)
          });
        });
        when(ContentType.Helper, () => {
          CallDynamic(op, positional, named, () => {
            op(MachineOp.InvokeStatic, stdlibOperand('cautious-non-dynamic-append'));
          });
        });
      });
    }
  } else {
    op(MachineOp.PushFrame);
    expr(op, value);
    op(MachineOp.InvokeStatic, stdlibOperand('cautious-append'));
    op(MachineOp.PopFrame);
  }
});
STATEMENTS.add(SexpOpcodes.TrustingAppend, (op, [, value]) => {
  if (!Array.isArray(value)) {
    op(Op.Text, value === null || value === undefined ? '' : String(value));
  } else {
    op(MachineOp.PushFrame);
    expr(op, value);
    op(MachineOp.InvokeStatic, stdlibOperand('trusting-append'));
    op(MachineOp.PopFrame);
  }
});
STATEMENTS.add(SexpOpcodes.Block, (op, [, expr, positional, named, blocks]) => {
  if (isGetFreeComponent(expr)) {
    op(HighLevelResolutionOpcodes.Component, expr, component => {
      InvokeComponent(op, component, null, positional, hashToArgs(named), blocks);
    });
  } else {
    InvokeDynamicComponent(op, expr, null, positional, named, blocks, false, false);
  }
});
STATEMENTS.add(SexpOpcodes.InElement, (op, [, block, guid, destination, insertBefore]) => {
  ReplayableIf(op, () => {
    expr(op, guid);
    if (insertBefore === undefined) {
      PushPrimitiveReference(op, undefined);
    } else {
      expr(op, insertBefore);
    }
    expr(op, destination);
    op(Op.Dup, $sp, 0);
    return 4;
  }, () => {
    op(Op.PushRemoteElement);
    InvokeStaticBlock(op, block);
    op(Op.PopRemoteElement);
  });
});
STATEMENTS.add(SexpOpcodes.If, (op, [, condition, block, inverse]) => ReplayableIf(op, () => {
  expr(op, condition);
  op(Op.ToBoolean);
  return 1;
}, () => {
  InvokeStaticBlock(op, block);
}, inverse ? () => {
  InvokeStaticBlock(op, inverse);
} : undefined));
STATEMENTS.add(SexpOpcodes.Each, (op, [, value, key, block, inverse]) => Replayable(op, () => {
  if (key) {
    expr(op, key);
  } else {
    PushPrimitiveReference(op, null);
  }
  expr(op, value);
  return 2;
}, () => {
  op(Op.EnterList, labelOperand('BODY'), labelOperand('ELSE'));
  op(MachineOp.PushFrame);
  op(Op.Dup, $fp, 1);
  op(MachineOp.ReturnTo, labelOperand('ITER'));
  op(HighLevelBuilderOpcodes.Label, 'ITER');
  op(Op.Iterate, labelOperand('BREAK'));
  op(HighLevelBuilderOpcodes.Label, 'BODY');
  InvokeStaticBlockWithStack(op, block, 2);
  op(Op.Pop, 2);
  op(MachineOp.Jump, labelOperand('FINALLY'));
  op(HighLevelBuilderOpcodes.Label, 'BREAK');
  op(MachineOp.PopFrame);
  op(Op.ExitList);
  op(MachineOp.Jump, labelOperand('FINALLY'));
  op(HighLevelBuilderOpcodes.Label, 'ELSE');
  if (inverse) {
    InvokeStaticBlock(op, inverse);
  }
}));
STATEMENTS.add(SexpOpcodes.With, (op, [, value, block, inverse]) => {
  ReplayableIf(op, () => {
    expr(op, value);
    op(Op.Dup, $sp, 0);
    op(Op.ToBoolean);
    return 2;
  }, () => {
    InvokeStaticBlockWithStack(op, block, 1);
  }, () => {
    if (inverse) {
      InvokeStaticBlock(op, inverse);
    }
  });
});
STATEMENTS.add(SexpOpcodes.Let, (op, [, positional, block]) => {
  let count = CompilePositional(op, positional);
  InvokeStaticBlockWithStack(op, block, count);
});
STATEMENTS.add(SexpOpcodes.WithDynamicVars, (op, [, named, block]) => {
  if (named) {
    let [names, expressions] = named;
    CompilePositional(op, expressions);
    DynamicScope(op, names, () => {
      InvokeStaticBlock(op, block);
    });
  } else {
    InvokeStaticBlock(op, block);
  }
});
STATEMENTS.add(SexpOpcodes.InvokeComponent, (op, [, expr, positional, named, blocks]) => {
  if (isGetFreeComponent(expr)) {
    op(HighLevelResolutionOpcodes.Component, expr, component => {
      InvokeComponent(op, component, null, positional, hashToArgs(named), blocks);
    });
  } else {
    InvokeDynamicComponent(op, expr, null, positional, named, blocks, false, false);
  }
});
function hashToArgs(hash) {
  if (hash === null) return null;
  let names = hash[0].map(key => `@${key}`);
  return [names, hash[1]];
}

const PLACEHOLDER_HANDLE = -1;
class CompilableTemplateImpl {
  compiled = null;
  constructor(statements, meta,
  // Part of CompilableTemplate
  symbolTable,
  // Used for debugging
  moduleName = 'plain block') {
    this.statements = statements;
    this.meta = meta;
    this.symbolTable = symbolTable;
    this.moduleName = moduleName;
  }

  // Part of CompilableTemplate
  compile(context) {
    return maybeCompile(this, context);
  }
}
function compilable(layout, moduleName) {
  let [statements, symbols, hasEval] = layout.block;
  return new CompilableTemplateImpl(statements, meta(layout), {
    symbols,
    hasEval
  }, moduleName);
}
function maybeCompile(compilable, context) {
  if (compilable.compiled !== null) return compilable.compiled;
  compilable.compiled = PLACEHOLDER_HANDLE;
  let {
    statements,
    meta
  } = compilable;
  let result = compileStatements(statements, meta, context);
  compilable.compiled = result;
  return result;
}
function compileStatements(statements, meta, syntaxContext) {
  let sCompiler = STATEMENTS;
  let context = templateCompilationContext(syntaxContext, meta);
  let {
    encoder,
    program: {
      constants,
      resolver
    }
  } = context;
  function pushOp(...op) {
    encodeOp(encoder, constants, resolver, meta, op);
  }
  for (const statement of statements) {
    sCompiler.compile(pushOp, statement);
  }
  let handle = context.encoder.commit(meta.size);
  return handle;
}
function compilableBlock(block, containing) {
  return new CompilableTemplateImpl(block[0], containing, {
    parameters: block[1] || EMPTY_ARRAY
  });
}

const DEFAULT_CAPABILITIES = {
  dynamicLayout: true,
  dynamicTag: true,
  prepareArgs: true,
  createArgs: true,
  attributeHook: false,
  elementHook: false,
  dynamicScope: true,
  createCaller: false,
  updateHook: true,
  createInstance: true,
  wrapped: false,
  willDestroy: false,
  hasSubOwner: false
};
const MINIMAL_CAPABILITIES = {
  dynamicLayout: false,
  dynamicTag: false,
  prepareArgs: false,
  createArgs: false,
  attributeHook: false,
  elementHook: false,
  dynamicScope: false,
  createCaller: false,
  updateHook: false,
  createInstance: false,
  wrapped: false,
  willDestroy: false,
  hasSubOwner: false
};

class WrappedBuilder {
  symbolTable;
  compiled = null;
  attrsBlockNumber;
  constructor(layout, moduleName) {
    this.layout = layout;
    this.moduleName = moduleName;
    let {
      block
    } = layout;
    let [, symbols, hasEval] = block;
    symbols = symbols.slice();

    // ensure ATTRS_BLOCK is always included (only once) in the list of symbols
    let attrsBlockIndex = symbols.indexOf(ATTRS_BLOCK);
    if (attrsBlockIndex === -1) {
      this.attrsBlockNumber = symbols.push(ATTRS_BLOCK);
    } else {
      this.attrsBlockNumber = attrsBlockIndex + 1;
    }
    this.symbolTable = {
      hasEval,
      symbols
    };
  }
  compile(syntax) {
    if (this.compiled !== null) return this.compiled;
    let m = meta(this.layout);
    let context = templateCompilationContext(syntax, m);
    let {
      encoder,
      program: {
        constants,
        resolver
      }
    } = context;
    function pushOp(...op) {
      encodeOp(encoder, constants, resolver, m, op);
    }
    WrappedComponent(pushOp, this.layout, this.attrsBlockNumber);
    let handle = context.encoder.commit(m.size);
    if (typeof handle !== 'number') {
      return handle;
    }
    this.compiled = handle;
    return handle;
  }
}

let clientId = 0;
let templateCacheCounters = {
  cacheHit: 0,
  cacheMiss: 0
};

// These interfaces are for backwards compatibility, some addons use these intimate APIs

/**
 * Wraps a template js in a template module to change it into a factory
 * that handles lazy parsing the template and to create per env singletons
 * of the template.
 */
function templateFactory({
  id: templateId,
  moduleName,
  block,
  scope,
  isStrictMode
}) {
  // TODO(template-refactors): This should be removed in the near future, as it
  // appears that id is unused. It is currently kept for backwards compat reasons.
  let id = templateId || `client-${clientId++}`;

  // TODO: This caches JSON serialized output once in case a template is
  // compiled by multiple owners, but we haven't verified if this is actually
  // helpful. We should benchmark this in the future.
  let parsedBlock;
  let ownerlessTemplate = null;
  let templateCache = new WeakMap();
  let factory = owner => {
    if (parsedBlock === undefined) {
      parsedBlock = JSON.parse(block);
    }
    if (owner === undefined) {
      if (ownerlessTemplate === null) {
        templateCacheCounters.cacheMiss++;
        ownerlessTemplate = new TemplateImpl({
          id,
          block: parsedBlock,
          moduleName,
          owner: null,
          scope,
          isStrictMode
        });
      } else {
        templateCacheCounters.cacheHit++;
      }
      return ownerlessTemplate;
    }
    let result = templateCache.get(owner);
    if (result === undefined) {
      templateCacheCounters.cacheMiss++;
      result = new TemplateImpl({
        id,
        block: parsedBlock,
        moduleName,
        owner,
        scope,
        isStrictMode
      });
      templateCache.set(owner, result);
    } else {
      templateCacheCounters.cacheHit++;
    }
    return result;
  };
  factory.__id = id;
  factory.__meta = {
    moduleName
  };
  return factory;
}
class TemplateImpl {
  result = 'ok';
  layout = null;
  wrappedLayout = null;
  constructor(parsedLayout) {
    this.parsedLayout = parsedLayout;
  }
  get moduleName() {
    return this.parsedLayout.moduleName;
  }
  get id() {
    return this.parsedLayout.id;
  }

  // TODO(template-refactors): This should be removed in the near future, it is
  // only being exposed for backwards compatibility
  get referrer() {
    return {
      moduleName: this.parsedLayout.moduleName,
      owner: this.parsedLayout.owner
    };
  }
  asLayout() {
    if (this.layout) return this.layout;
    return this.layout = compilable(assign({}, this.parsedLayout), this.moduleName);
  }
  asWrappedLayout() {
    if (this.wrappedLayout) return this.wrappedLayout;
    return this.wrappedLayout = new WrappedBuilder(assign({}, this.parsedLayout), this.moduleName);
  }
}

export { CompileTimeCompilationContextImpl, DEFAULT_CAPABILITIES, EMPTY_BLOCKS, MINIMAL_CAPABILITIES, StdLib, WrappedBuilder, compilable, compileStatements, compileStd, debugCompiler, InvokeStaticBlock as invokeStaticBlock, InvokeStaticBlockWithStack as invokeStaticBlockWithStack, meta, programCompilationContext, templateCacheCounters, templateCompilationContext, templateFactory };
