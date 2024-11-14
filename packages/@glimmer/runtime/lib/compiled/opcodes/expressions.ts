import type {
  CapturedPositionalArguments,
  CurriedType,
  Helper,
  HelperDefinitionState,
  Owner,
  ScopeBlock,
  VM as PublicVM,
} from '@glimmer/interfaces';
import type { Reference } from '@glimmer/reference';
import {
  CURRIED_HELPER,
  decodeHandle,
  VM_CONCAT_OP,
  VM_CURRY_OP,
  VM_DYNAMIC_HELPER_OP,
  VM_GET_BLOCK_OP,
  VM_GET_DYNAMIC_VAR_OP,
  VM_GET_PROPERTY_OP,
  VM_GET_VARIABLE_OP,
  VM_HAS_BLOCK_OP,
  VM_HAS_BLOCK_PARAMS_OP,
  VM_HELPER_OP,
  VM_IF_INLINE_OP,
  VM_LOG_OP,
  VM_NOT_OP,
  VM_ROOT_SCOPE_OP,
  VM_SET_BLOCK_OP,
  VM_SET_VARIABLE_OP,
  VM_SPREAD_BLOCK_OP,
} from '@glimmer/constants';
import {
  check,
  CheckBlockSymbolTable,
  CheckHandle,
  CheckMaybe,
  CheckNullable,
  CheckOr,
} from '@glimmer/debug';
import { assert, debugToString } from '@glimmer/debug-util';
import { _hasDestroyableChildren, associateDestroyableChild, destroy } from '@glimmer/destroyable';
import { toBool } from '@glimmer/global-context';
import { getInternalHelperManager } from '@glimmer/manager';
import {
  childRefFor,
  createComputeRef,
  FALSE_REFERENCE,
  TRUE_REFERENCE,
  UNDEFINED_REFERENCE,
  valueForRef,
} from '@glimmer/reference';
import { assign, isObject } from '@glimmer/util';
import { $v0 } from '@glimmer/vm';

import { isCurriedType, resolveCurriedValue } from '../../curried-value';
import { APPEND_OPCODES } from '../../opcodes';
import createCurryRef from '../../references/curry-value';
import { reifyPositional } from '../../vm/arguments';
import { createConcatRef } from '../expressions/concat';
import {
  CheckArguments,
  CheckCapturedArguments,
  CheckCompilableBlock,
  CheckHelper,
  CheckReference,
  CheckScope,
  CheckScopeBlock,
  CheckUndefinedReference,
} from './-debug-strip';

export type FunctionExpression<T> = (vm: PublicVM) => Reference<T>;

APPEND_OPCODES.add(VM_CURRY_OP, (vm, { op1: type, op2: _isStrict }) => {
  let stack = vm.stack;

  let definition = check(stack.pop(), CheckReference);
  let capturedArgs = check(stack.pop(), CheckCapturedArguments);

  let owner = vm.getOwner();
  let resolver = vm.runtime.resolver;

  let isStrict = false;

  if (import.meta.env.DEV) {
    // strict check only happens in import.meta.env.DEV builds, no reason to load it otherwise
    isStrict = vm.constants.getValue<boolean>(decodeHandle(_isStrict));
  }

  vm.loadValue(
    $v0,
    createCurryRef(type as CurriedType, definition, owner, capturedArgs, resolver, isStrict)
  );
});

APPEND_OPCODES.add(VM_DYNAMIC_HELPER_OP, (vm) => {
  let stack = vm.stack;
  let ref = check(stack.pop(), CheckReference);
  let args = check(stack.pop(), CheckArguments).capture();

  let helperRef: Reference;
  let initialOwner: Owner = vm.getOwner();

  let helperInstanceRef = createComputeRef(() => {
    if (helperRef !== undefined) {
      destroy(helperRef);
    }

    let definition = valueForRef(ref);

    if (isCurriedType(definition, CURRIED_HELPER)) {
      let { definition: resolvedDef, owner, positional, named } = resolveCurriedValue(definition);

      let helper = resolveHelper(resolvedDef, ref);

      if (named !== undefined) {
        args.named = assign({}, ...named, args.named);
      }

      if (positional !== undefined) {
        args.positional = positional.concat(args.positional) as CapturedPositionalArguments;
      }

      helperRef = helper(args, owner);

      associateDestroyableChild(helperInstanceRef, helperRef);
    } else if (isObject(definition)) {
      let helper = resolveHelper(definition, ref);
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

function resolveHelper(definition: HelperDefinitionState, ref: Reference): Helper {
  let managerOrHelper = getInternalHelperManager(definition, true);
  let helper;
  if (managerOrHelper === null) {
    helper = null;
  } else {
    helper =
      typeof managerOrHelper === 'function'
        ? managerOrHelper
        : managerOrHelper.getHelper(definition);
    assert(managerOrHelper, 'BUG: expected manager or helper');
  }

  if (import.meta.env.DEV && helper === null) {
    throw new Error(
      `Expected a dynamic helper definition, but received an object or function that did not have a helper manager associated with it. The dynamic invocation was \`{{${
        ref.debugLabel
      }}}\` or \`(${ref.debugLabel})\`, and the incorrect definition is the value at the path \`${
        ref.debugLabel
      }\`, which was: ${debugToString?.(definition)}`
    );
  }

  return helper!;
}

APPEND_OPCODES.add(VM_HELPER_OP, (vm, { op1: handle }) => {
  let stack = vm.stack;
  let helper = check(vm.constants.getValue(handle), CheckHelper);
  let args = check(stack.pop(), CheckArguments);
  let value = helper(args.capture(), vm.getOwner(), vm.dynamicScope());

  if (_hasDestroyableChildren(value)) {
    vm.associateDestroyable(value);
  }

  vm.loadValue($v0, value);
});

APPEND_OPCODES.add(VM_GET_VARIABLE_OP, (vm, { op1: symbol }) => {
  let expr = vm.referenceForSymbol(symbol);

  vm.stack.push(expr);
});

APPEND_OPCODES.add(VM_SET_VARIABLE_OP, (vm, { op1: symbol }) => {
  let expr = check(vm.stack.pop(), CheckReference);
  vm.scope().bindSymbol(symbol, expr);
});

APPEND_OPCODES.add(VM_SET_BLOCK_OP, (vm, { op1: symbol }) => {
  let handle = check(vm.stack.pop(), CheckCompilableBlock);
  let scope = check(vm.stack.pop(), CheckScope);
  let table = check(vm.stack.pop(), CheckBlockSymbolTable);

  vm.scope().bindBlock(symbol, [handle, scope, table]);
});

APPEND_OPCODES.add(VM_ROOT_SCOPE_OP, (vm, { op1: symbols }) => {
  vm.pushRootScope(symbols, vm.getOwner());
});

APPEND_OPCODES.add(VM_GET_PROPERTY_OP, (vm, { op1: _key }) => {
  let key = vm.constants.getValue<string>(_key);
  let expr = check(vm.stack.pop(), CheckReference);
  vm.stack.push(childRefFor(expr, key));
});

APPEND_OPCODES.add(VM_GET_BLOCK_OP, (vm, { op1: _block }) => {
  let { stack } = vm;
  let block = vm.scope().getBlock(_block);

  stack.push(block);
});

APPEND_OPCODES.add(VM_SPREAD_BLOCK_OP, (vm) => {
  let { stack } = vm;
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

function isUndefinedReference(input: ScopeBlock | Reference): input is Reference {
  assert(
    Array.isArray(input) || input === UNDEFINED_REFERENCE,
    'a reference other than UNDEFINED_REFERENCE is illegal here'
  );
  return input === UNDEFINED_REFERENCE;
}

APPEND_OPCODES.add(VM_HAS_BLOCK_OP, (vm) => {
  let { stack } = vm;
  let block = check(stack.pop(), CheckNullable(CheckOr(CheckScopeBlock, CheckUndefinedReference)));

  if (block && !isUndefinedReference(block)) {
    stack.push(TRUE_REFERENCE);
  } else {
    stack.push(FALSE_REFERENCE);
  }
});

APPEND_OPCODES.add(VM_HAS_BLOCK_PARAMS_OP, (vm) => {
  // FIXME(mmun): should only need to push the symbol table
  let block = vm.stack.pop();
  let scope = vm.stack.pop();

  check(block, CheckMaybe(CheckOr(CheckHandle, CheckCompilableBlock)));
  check(scope, CheckMaybe(CheckScope));
  let table = check(vm.stack.pop(), CheckMaybe(CheckBlockSymbolTable));

  let hasBlockParams = table && table.parameters.length;
  vm.stack.push(hasBlockParams ? TRUE_REFERENCE : FALSE_REFERENCE);
});

APPEND_OPCODES.add(VM_CONCAT_OP, (vm, { op1: count }) => {
  let out: Array<Reference<unknown>> = new Array(count);

  for (let i = count; i > 0; i--) {
    let offset = i - 1;
    out[offset] = check(vm.stack.pop(), CheckReference);
  }

  vm.stack.push(createConcatRef(out));
});

APPEND_OPCODES.add(VM_IF_INLINE_OP, (vm) => {
  let condition = check(vm.stack.pop(), CheckReference);
  let truthy = check(vm.stack.pop(), CheckReference);
  let falsy = check(vm.stack.pop(), CheckReference);

  vm.stack.push(
    createComputeRef(() => {
      if (toBool(valueForRef(condition)) === true) {
        return valueForRef(truthy);
      } else {
        return valueForRef(falsy);
      }
    })
  );
});

APPEND_OPCODES.add(VM_NOT_OP, (vm) => {
  let ref = check(vm.stack.pop(), CheckReference);

  vm.stack.push(
    createComputeRef(() => {
      return !toBool(valueForRef(ref));
    })
  );
});

APPEND_OPCODES.add(VM_GET_DYNAMIC_VAR_OP, (vm) => {
  let scope = vm.dynamicScope();
  let stack = vm.stack;
  let nameRef = check(stack.pop(), CheckReference);

  stack.push(
    createComputeRef(() => {
      let name = String(valueForRef(nameRef));
      return valueForRef(scope.get(name));
    })
  );
});

APPEND_OPCODES.add(VM_LOG_OP, (vm) => {
  let { positional } = check(vm.stack.pop(), CheckArguments).capture();

  vm.loadValue(
    $v0,
    createComputeRef(() => {
      // eslint-disable-next-line no-console
      console.log(...reifyPositional(positional));
    })
  );
});
