import {
  CapturedPositionalArguments,
  CurriedType,
  Helper,
  HelperDefinitionState,
  Op,
  Owner,
  ResolutionTimeConstants,
  RuntimeConstants,
  ScopeBlock,
  VM as PublicVM,
} from '@glimmer/interfaces';
import {
  Reference,
  childRefFor,
  UNDEFINED_REFERENCE,
  TRUE_REFERENCE,
  FALSE_REFERENCE,
  valueForRef,
  createComputeRef,
} from '@glimmer/reference';
import { $v0 } from '@glimmer/vm';
import { APPEND_OPCODES } from '../../opcodes';
import { createConcatRef } from '../expressions/concat';
import { associateDestroyableChild, destroy, _hasDestroyableChildren } from '@glimmer/destroyable';
import { assert, assign, debugToString, decodeHandle, isObject } from '@glimmer/util';
import { toBool } from '@glimmer/global-context';
import {
  check,
  CheckOption,
  CheckHandle,
  CheckBlockSymbolTable,
  CheckOr,
  CheckMaybe,
} from '@glimmer/debug';
import {
  CheckArguments,
  CheckReference,
  CheckCompilableBlock,
  CheckScope,
  CheckHelper,
  CheckUndefinedReference,
  CheckScopeBlock,
  CheckCapturedArguments,
} from './-debug-strip';
import { CONSTANTS } from '../../symbols';
import { DEBUG } from '@glimmer/env';
import createCurryRef from '../../references/curry-value';
import { isCurriedType, resolveCurriedValue } from '../../curried-value';
import { reifyPositional } from '../../vm/arguments';

export type FunctionExpression<T> = (vm: PublicVM) => Reference<T>;

APPEND_OPCODES.add(Op.Curry, (vm, { op1: type, op2: _isStrict }) => {
  let stack = vm.stack;

  let definition = check(stack.popJs(), CheckReference);
  let capturedArgs = check(stack.popJs(), CheckCapturedArguments);

  let owner = vm.getOwner();
  let resolver = vm.runtime.resolver;

  let isStrict = false;

  if (DEBUG) {
    // strict check only happens in DEBUG builds, no reason to load it otherwise
    isStrict = vm[CONSTANTS].getValue<boolean>(decodeHandle(_isStrict));
  }

  vm.loadValue(
    $v0,
    createCurryRef(type as CurriedType, definition, owner, capturedArgs, resolver, isStrict)
  );
});

APPEND_OPCODES.add(Op.DynamicHelper, (vm, { op1: _definitionRegister }) => {
  let stack = vm.stack;
  let args = check(stack.popJs(), CheckArguments).capture();
  let ref = vm.fetchValue<Reference>(_definitionRegister);

  let helperRef: Reference;
  let initialOwner: Owner = vm.getOwner();

  let helperInstanceRef = createComputeRef(() => {
    if (helperRef !== undefined) {
      destroy(helperRef);
    }

    let definition = valueForRef(ref);

    if (isCurriedType(definition, CurriedType.Helper)) {
      let { definition: resolvedDef, owner, positional, named } = resolveCurriedValue(definition);

      let helper = resolveHelper(vm[CONSTANTS], resolvedDef, ref);

      if (named !== undefined) {
        args.named = assign({}, ...named, args.named);
      }

      if (positional !== undefined) {
        args.positional = positional.concat(args.positional) as CapturedPositionalArguments;
      }

      helperRef = helper(args, owner);

      associateDestroyableChild(helperInstanceRef, helperRef);
    } else if (isObject(definition)) {
      let helper = resolveHelper(vm[CONSTANTS], definition, ref);
      helperRef = helper(args, initialOwner);

      if (_hasDestroyableChildren(helperRef)) {
        associateDestroyableChild(helperInstanceRef, helperRef);
      }
    } else {
      helperRef = UNDEFINED_REFERENCE;
    }
  });

  let helperValueRef = createComputeRef(() => {
    valueForRef(helperInstanceRef);
    return valueForRef(helperRef);
  });

  vm.associateDestroyable(helperInstanceRef);
  vm.loadValue($v0, helperValueRef);
});

function resolveHelper(
  constants: RuntimeConstants & ResolutionTimeConstants,
  definition: HelperDefinitionState,
  ref: Reference
): Helper {
  let handle = constants.helper(definition, null, true)!;

  if (DEBUG && handle === null) {
    throw new Error(
      `Expected a dynamic helper definition, but received an object or function that did not have a helper manager associated with it. The dynamic invocation was \`{{${
        ref.debugLabel
      }}}\` or \`(${ref.debugLabel})\`, and the incorrect definition is the value at the path \`${
        ref.debugLabel
      }\`, which was: ${debugToString!(definition)}`
    );
  }

  return constants.getValue(handle);
}

APPEND_OPCODES.add(Op.Helper, (vm, { op1: handle }) => {
  let stack = vm.stack;
  let helper = check(vm[CONSTANTS].getValue(handle), CheckHelper);
  let args = check(stack.popJs(), CheckArguments);
  let value = helper(args.capture(), vm.getOwner(), vm.dynamicScope());

  if (_hasDestroyableChildren(value)) {
    vm.associateDestroyable(value);
  }

  vm.loadValue($v0, value);
});

APPEND_OPCODES.add(Op.GetVariable, (vm, { op1: symbol }) => {
  let expr = vm.referenceForSymbol(symbol);

  vm.stack.pushJs(expr);
});

APPEND_OPCODES.add(Op.SetVariable, (vm, { op1: symbol }) => {
  let expr = check(vm.stack.pop(), CheckReference);
  vm.scope().bindSymbol(symbol, expr);
});

APPEND_OPCODES.add(Op.SetBlock, (vm, { op1: symbol }) => {
  let handle = check(vm.stack.popJs(), CheckCompilableBlock);
  let scope = check(vm.stack.popJs(), CheckScope);
  let table = check(vm.stack.popJs(), CheckBlockSymbolTable);

  vm.scope().bindBlock(symbol, [handle, scope, table]);
});

APPEND_OPCODES.add(Op.ResolveMaybeLocal, (vm, { op1: _name }) => {
  let name = vm[CONSTANTS].getValue<string>(_name);
  let locals = vm.scope().getPartialMap()!;

  let ref = locals[name];
  if (ref === undefined) {
    ref = childRefFor(vm.getSelf(), name);
  }

  vm.stack.pushJs(ref);
});

APPEND_OPCODES.add(Op.RootScope, (vm, { op1: symbols }) => {
  vm.pushRootScope(symbols, vm.getOwner());
});

APPEND_OPCODES.add(Op.GetProperty, (vm, { op1: _key }) => {
  let key = vm[CONSTANTS].getValue<string>(_key);
  let expr = check(vm.stack.popJs(), CheckReference);
  vm.stack.pushJs(childRefFor(expr, key));
});

APPEND_OPCODES.add(Op.GetBlock, (vm, { op1: _block }) => {
  let { stack } = vm;
  let block = vm.scope().getBlock(_block);

  if (block === null) {
    stack.pushNull();
  } else {
    stack.pushJs(block);
  }
});

APPEND_OPCODES.add(Op.SpreadBlock, (vm) => {
  let { stack } = vm;
  let block = check(stack.popJs(), CheckOption(CheckOr(CheckScopeBlock, CheckUndefinedReference)));

  if (block && !isUndefinedReference(block)) {
    let [handleOrCompilable, scope, table] = block;

    stack.pushJs(table);
    stack.pushJs(scope);

    if (typeof handleOrCompilable === 'number') {
      stack.pushSmallInt(handleOrCompilable);
    } else {
      stack.pushJs(handleOrCompilable);
    }
  } else {
    stack.pushNull();
    stack.pushNull();
    stack.pushNull();
  }
});

function isUndefinedReference(input: ScopeBlock | Reference): input is Reference {
  assert(
    Array.isArray(input) || input === UNDEFINED_REFERENCE,
    'a reference other than UNDEFINED_REFERENCE is illegal here'
  );
  return input === UNDEFINED_REFERENCE;
}

APPEND_OPCODES.add(Op.HasBlock, (vm) => {
  let { stack } = vm;
  let block = check(stack.pop(), CheckOption(CheckOr(CheckScopeBlock, CheckUndefinedReference)));

  if (block && !isUndefinedReference(block)) {
    stack.pushJs(TRUE_REFERENCE);
  } else {
    stack.pushJs(FALSE_REFERENCE);
  }
});

APPEND_OPCODES.add(Op.HasBlockParams, (vm) => {
  // FIXME(mmun): should only need to push the symbol table
  let block = vm.stack.pop();
  let scope = vm.stack.popJs();

  check(block, CheckMaybe(CheckOr(CheckHandle, CheckCompilableBlock)));
  check(scope, CheckMaybe(CheckScope));
  let table = check(vm.stack.popJs(), CheckMaybe(CheckBlockSymbolTable));

  let hasBlockParams = table && table.parameters.length;
  vm.stack.pushJs(hasBlockParams ? TRUE_REFERENCE : FALSE_REFERENCE);
});

APPEND_OPCODES.add(Op.Concat, (vm, { op1: count }) => {
  let out: Array<Reference<unknown>> = new Array(count);

  for (let i = count; i > 0; i--) {
    let offset = i - 1;
    out[offset] = check(vm.stack.pop(), CheckReference);
  }

  vm.stack.pushJs(createConcatRef(out));
});

APPEND_OPCODES.add(Op.IfInline, (vm) => {
  let condition = check(vm.stack.popJs(), CheckReference);
  let truthy = check(vm.stack.popJs(), CheckReference);
  let falsy = check(vm.stack.popJs(), CheckReference);

  vm.stack.pushJs(
    createComputeRef(() => {
      if (toBool(valueForRef(condition)) === true) {
        return valueForRef(truthy);
      } else {
        return valueForRef(falsy);
      }
    })
  );
});

APPEND_OPCODES.add(Op.Not, (vm) => {
  let ref = check(vm.stack.popJs(), CheckReference);

  vm.stack.pushJs(
    createComputeRef(() => {
      return !toBool(valueForRef(ref));
    })
  );
});

APPEND_OPCODES.add(Op.GetDynamicVar, (vm) => {
  let scope = vm.dynamicScope();
  let stack = vm.stack;
  let nameRef = check(stack.popJs(), CheckReference);

  stack.pushJs(
    createComputeRef(() => {
      let name = String(valueForRef(nameRef));
      return valueForRef(scope.get(name));
    })
  );
});

APPEND_OPCODES.add(Op.Log, (vm) => {
  let { positional } = check(vm.stack.popJs(), CheckArguments).capture();

  vm.loadValue(
    $v0,
    createComputeRef(() => {
      // eslint-disable-next-line no-console
      console.log(...reifyPositional(positional));
    })
  );
});
