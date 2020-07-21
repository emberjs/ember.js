import { Option, Op, JitScopeBlock, AotScopeBlock, VM as PublicVM } from '@glimmer/interfaces';
import {
  Reference,
  childRefFor,
  UNDEFINED_REFERENCE,
  TRUE_REFERENCE,
  FALSE_REFERENCE,
} from '@glimmer/reference';
import { $v0 } from '@glimmer/vm';
import { APPEND_OPCODES } from '../../opcodes';
import { createConcatRef } from '../expressions/concat';
import { assert } from '@glimmer/util';
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
} from './-debug-strip';
import { CONSTANTS } from '../../symbols';
import { DEBUG } from '@glimmer/env';

export type FunctionExpression<T> = (vm: PublicVM) => Reference<T>;

APPEND_OPCODES.add(Op.Helper, (vm, { op1: handle }) => {
  let stack = vm.stack;
  let helper = check(vm.runtime.resolver.resolve(handle), CheckHelper);
  let args = check(stack.popJs(), CheckArguments);
  let value = helper(args, vm);

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

APPEND_OPCODES.add(
  Op.SetJitBlock,
  (vm, { op1: symbol }) => {
    let handle = check(vm.stack.popJs(), CheckOption(CheckCompilableBlock));
    let scope = check(vm.stack.popJs(), CheckScope);
    let table = check(vm.stack.popJs(), CheckOption(CheckBlockSymbolTable));

    let block: Option<JitScopeBlock> = table ? [handle!, scope, table] : null;

    vm.scope().bindBlock(symbol, block);
  },
  'jit'
);

APPEND_OPCODES.add(Op.SetAotBlock, (vm, { op1: symbol }) => {
  // In DEBUG handles could be ErrHandle objects
  let handle = check(DEBUG ? vm.stack.pop() : vm.stack.popSmallInt(), CheckOption(CheckHandle));
  let scope = check(vm.stack.popJs(), CheckScope);
  let table = check(vm.stack.popJs(), CheckOption(CheckBlockSymbolTable));

  let block: Option<AotScopeBlock> = table ? [handle!, scope, table] : null;

  vm.scope().bindBlock(symbol, block);
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
  vm.pushRootScope(symbols);
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

APPEND_OPCODES.add(Op.JitSpreadBlock, vm => {
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

function isUndefinedReference(input: JitScopeBlock | Reference): input is Reference {
  assert(
    Array.isArray(input) || input === UNDEFINED_REFERENCE,
    'a reference other than UNDEFINED_REFERENCE is illegal here'
  );
  return input === UNDEFINED_REFERENCE;
}

APPEND_OPCODES.add(Op.HasBlock, vm => {
  let { stack } = vm;
  let block = check(stack.pop(), CheckOption(CheckOr(CheckScopeBlock, CheckUndefinedReference)));

  if (block && !isUndefinedReference(block)) {
    stack.pushJs(TRUE_REFERENCE);
  } else {
    stack.pushJs(FALSE_REFERENCE);
  }
});

APPEND_OPCODES.add(Op.HasBlockParams, vm => {
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
