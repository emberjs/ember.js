import { Opaque, Option } from '@glimmer/interfaces';
import { VersionedPathReference } from '@glimmer/reference';
import { Op, Register } from '@glimmer/vm';
import { Scope, ScopeBlock } from '../../environment';
import { APPEND_OPCODES } from '../../opcodes';
import { FALSE_REFERENCE, TRUE_REFERENCE } from '../../references';
import { PublicVM } from '../../vm';
import { ConcatReference } from '../expressions/concat';
import { assert } from "@glimmer/util";
import { check, CheckFunction, CheckOption, CheckHandle, CheckBlockSymbolTable, CheckOr } from '@glimmer/debug';
import { stackAssert } from './assert';
import { CheckArguments, CheckPathReference, CheckCompilableBlock, CheckScope } from './-debug-strip';

export type FunctionExpression<T> = (vm: PublicVM) => VersionedPathReference<T>;

APPEND_OPCODES.add(Op.Helper, (vm, { op1: handle }) => {
  let stack = vm.stack;
  let helper = check(vm.constants.resolveHandle(handle), CheckFunction);
  let args = check(stack.pop(), CheckArguments);
  let value = helper(vm, args);

  vm.loadValue(Register.v0, value);
});

APPEND_OPCODES.add(Op.GetVariable, (vm, { op1: symbol }) => {
  let expr = vm.referenceForSymbol(symbol);
  vm.stack.push(expr);
});

APPEND_OPCODES.add(Op.SetVariable, (vm, { op1: symbol }) => {
  let expr = check(vm.stack.pop(), CheckPathReference);
  vm.scope().bindSymbol(symbol, expr);
});

APPEND_OPCODES.add(Op.SetBlock, (vm, { op1: symbol }) => {
  let handle = check(vm.stack.pop(), CheckOr(CheckOption(CheckHandle), CheckCompilableBlock));
  let scope = check(vm.stack.pop(), CheckScope) as Option<Scope>; // FIXME(mmun): shouldn't need to cast this
  let table = check(vm.stack.pop(), CheckOption(CheckBlockSymbolTable));

  let block: Option<ScopeBlock> = table ? [handle!, scope!, table] : null;

  vm.scope().bindBlock(symbol, block);
});

APPEND_OPCODES.add(Op.ResolveMaybeLocal, (vm, { op1: _name }) => {
  let name = vm.constants.getString(_name);
  let locals = vm.scope().getPartialMap()!;

  let ref = locals[name];
  if (ref === undefined) {
    ref = vm.getSelf().get(name);
  }

  vm.stack.push(ref);
});

APPEND_OPCODES.add(Op.RootScope, (vm, { op1: symbols, op2: bindCallerScope }) => {
  vm.pushRootScope(symbols, !!bindCallerScope);
});

APPEND_OPCODES.add(Op.GetProperty, (vm, { op1: _key }) => {
  let key = vm.constants.getString(_key);
  let expr = check(vm.stack.pop(), CheckPathReference);
  vm.stack.push(expr.get(key));
});

APPEND_OPCODES.add(Op.GetBlock, (vm, { op1: _block }) => {
  let { stack } = vm;
  let block = vm.scope().getBlock(_block);

  if (block) {
    stack.push(block[2]);
    stack.push(block[1]);
    stack.push(block[0]);
  } else {
    stack.push(null);
    stack.push(null);
    stack.push(null);
  }
});

APPEND_OPCODES.add(Op.HasBlock, (vm, { op1: _block }) => {
  let hasBlock = !!vm.scope().getBlock(_block);
  vm.stack.push(hasBlock ? TRUE_REFERENCE : FALSE_REFERENCE);
});

APPEND_OPCODES.add(Op.HasBlockParams, (vm) => {
  // FIXME(mmun): should only need to push the symbol table
  check(vm.stack.pop(), CheckOption(CheckOr(CheckHandle, CheckCompilableBlock)));
  check(vm.stack.pop(), CheckOption(CheckScope));
  let table = check(vm.stack.pop(), CheckOption(CheckBlockSymbolTable));

  assert(table === null || (table && typeof table === 'object' && Array.isArray(table.parameters)), stackAssert('Option<BlockSymbolTable>', table));

  let hasBlockParams = table && table.parameters.length;
  vm.stack.push(hasBlockParams ? TRUE_REFERENCE : FALSE_REFERENCE);
});

APPEND_OPCODES.add(Op.Concat, (vm, { op1: count }) => {
  let out: Array<VersionedPathReference<Opaque>> = new Array(count);

  for (let i = count; i > 0; i--) {
    let offset = i - 1;
    out[offset] = check(vm.stack.pop(), CheckPathReference);
  }

  vm.stack.push(new ConcatReference(out));
});
