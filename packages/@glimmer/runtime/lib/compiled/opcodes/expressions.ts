import { Opaque, Option } from '@glimmer/interfaces';
import { VersionedPathReference } from '@glimmer/reference';
import { Op } from '@glimmer/vm';
import { ScopeBlock } from '../../environment';
import { APPEND_OPCODES } from '../../opcodes';
import { FALSE_REFERENCE, TRUE_REFERENCE } from '../../references';
import { PublicVM } from '../../vm';
import { ConcatReference } from '../expressions/concat';
import { assert } from "@glimmer/util";
import { check, expectStackChange, CheckFunction, CheckOption, CheckHandle, CheckBlockSymbolTable, CheckOr } from '@glimmer/debug';
import { stackAssert } from './assert';
import { CheckArguments, CheckPathReference, CheckCompilableBlock } from './__DEBUG__';

export type FunctionExpression<T> = (vm: PublicVM) => VersionedPathReference<T>;

APPEND_OPCODES.add(Op.Helper, (vm, { op1: handle }) => {
  let stack = vm.stack;
  let helper = check(vm.constants.resolveHandle(handle), CheckFunction);
  let args = check(stack.pop(), CheckArguments);
  let value = helper(vm, args);

  args.clear();

  vm.stack.push(value);

  expectStackChange(vm.stack, -args.length, 'Helper');
});

APPEND_OPCODES.add(Op.GetVariable, (vm, { op1: symbol }) => {
  let expr = vm.referenceForSymbol(symbol);
  vm.stack.push(expr);

  expectStackChange(vm.stack, 1, 'GetVariable');
});

APPEND_OPCODES.add(Op.SetVariable, (vm, { op1: symbol }) => {
  let expr = check(vm.stack.pop(), CheckPathReference);
  vm.scope().bindSymbol(symbol, expr);

  expectStackChange(vm.stack, -1, 'SetVariable');
});

APPEND_OPCODES.add(Op.SetBlock, (vm, { op1: symbol }) => {
  let handle = check(vm.stack.pop(), CheckOr(CheckOption(CheckHandle), CheckCompilableBlock));
  let table = check(vm.stack.pop(), CheckOption(CheckBlockSymbolTable));

  let block: Option<ScopeBlock> = table ? [handle!, table] : null;

  vm.scope().bindBlock(symbol, block);

  expectStackChange(vm.stack, -2, 'SetBlock');
});

APPEND_OPCODES.add(Op.ResolveMaybeLocal, (vm, { op1: _name }) => {
  let name = vm.constants.getString(_name);
  let locals = vm.scope().getPartialMap()!;

  let ref = locals[name];
  if (ref === undefined) {
    ref = vm.getSelf().get(name);
  }

  vm.stack.push(ref);

  expectStackChange(vm.stack, 1, 'ResolveMaybeLocal');
});

APPEND_OPCODES.add(Op.RootScope, (vm, { op1: symbols, op2: bindCallerScope }) => {
  vm.pushRootScope(symbols, !!bindCallerScope);

  expectStackChange(vm.stack, 0, 'RootScope');
});

APPEND_OPCODES.add(Op.GetProperty, (vm, { op1: _key }) => {
  let key = vm.constants.getString(_key);
  let expr = check(vm.stack.pop(), CheckPathReference);
  vm.stack.push(expr.get(key));

  expectStackChange(vm.stack, 0, 'GetProperty');
});

APPEND_OPCODES.add(Op.GetBlock, (vm, { op1: _block }) => {
  let { stack } = vm;
  let block = vm.scope().getBlock(_block);

  if (block) {
    stack.push(block[1]);
    stack.push(block[0]);
  } else {
    stack.push(null);
    stack.push(null);
  }

  expectStackChange(vm.stack, 2, 'GetBlock');
});

APPEND_OPCODES.add(Op.HasBlock, (vm, { op1: _block }) => {
  let hasBlock = !!vm.scope().getBlock(_block);
  vm.stack.push(hasBlock ? TRUE_REFERENCE : FALSE_REFERENCE);

  expectStackChange(vm.stack, 1, 'HasBlock');
});

APPEND_OPCODES.add(Op.HasBlockParams, (vm) => {
  check(vm.stack.pop(), CheckOption(CheckOr(CheckHandle, CheckCompilableBlock)));
  let table = check(vm.stack.pop(), CheckOption(CheckBlockSymbolTable));

  assert(table === null || (table && typeof table === 'object' && Array.isArray(table.parameters)), stackAssert('Option<BlockSymbolTable>', table));

  let hasBlockParams = table && table.parameters.length;
  vm.stack.push(hasBlockParams ? TRUE_REFERENCE : FALSE_REFERENCE);

  expectStackChange(vm.stack, -1, 'HasBlockParams');
});

APPEND_OPCODES.add(Op.Concat, (vm, { op1: count }) => {
  let out: Array<VersionedPathReference<Opaque>> = new Array(count);

  for (let i = count; i > 0; i--) {
    let offset = i - 1;
    out[offset] = check(vm.stack.pop(), CheckPathReference);
  }

  vm.stack.push(new ConcatReference(out));

  expectStackChange(vm.stack, -count + 1, 'Concat');
});
