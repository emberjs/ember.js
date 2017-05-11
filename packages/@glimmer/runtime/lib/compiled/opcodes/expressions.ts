import { Opaque } from '@glimmer/interfaces';
import { VersionedPathReference } from '@glimmer/reference';
import { Helper } from '../../environment';
import { APPEND_OPCODES, Op } from '../../opcodes';
import { FALSE_REFERENCE, TRUE_REFERENCE } from '../../references';
import { PublicVM } from '../../vm';
import { Arguments } from '../../vm/arguments';
import { ConcatReference } from '../expressions/concat';

export type FunctionExpression<T> = (vm: PublicVM) => VersionedPathReference<T>;

APPEND_OPCODES.add(Op.Helper, (vm, { op1: _helper }) => {
  let stack = vm.stack;
  let helper = vm.constants.getFunction<Helper>(_helper);
  let args = stack.pop<Arguments>();
  let value = helper(vm, args);

  args.clear();

  vm.stack.push(value);
});

APPEND_OPCODES.add(Op.Function, (vm, { op1: _function }) => {
  let func = vm.constants.getFunction<FunctionExpression<Opaque>>(_function);
  vm.stack.push(func(vm));
});

APPEND_OPCODES.add(Op.GetVariable, (vm, { op1: symbol }) => {
  let expr = vm.referenceForSymbol(symbol);
  vm.stack.push(expr);
});

APPEND_OPCODES.add(Op.SetVariable, (vm, { op1: symbol }) => {
  let expr = vm.stack.pop<VersionedPathReference<Opaque>>();
  vm.scope().bindSymbol(symbol, expr);
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
  let expr = vm.stack.pop<VersionedPathReference<Opaque>>();
  vm.stack.push(expr.get(key));
});

APPEND_OPCODES.add(Op.PushBlock, (vm, { op1: _block }) => {
  let block = _block ? vm.constants.getBlock(_block) : null;
  vm.stack.push(block);
});

APPEND_OPCODES.add(Op.GetBlock, (vm, { op1: _block }) => {
  vm.stack.push(vm.scope().getBlock(_block));
});

APPEND_OPCODES.add(Op.HasBlock, (vm, { op1: _block }) => {
  let hasBlock = !!vm.scope().getBlock(_block);
  vm.stack.push(hasBlock ? TRUE_REFERENCE : FALSE_REFERENCE);
});

APPEND_OPCODES.add(Op.HasBlockParams, (vm, { op1: _block }) => {
  let block = vm.scope().getBlock(_block);
  let hasBlockParams = block && block.symbolTable.parameters.length;
  vm.stack.push(hasBlockParams ? TRUE_REFERENCE : FALSE_REFERENCE);
});

APPEND_OPCODES.add(Op.Concat, (vm, { op1: count }) => {
  let out: Array<VersionedPathReference<Opaque>> = [];

  for (let i = count; i > 0; i--) {
    out.push(vm.stack.pop<VersionedPathReference<Opaque>>());
  }

  vm.stack.push(new ConcatReference(out.reverse()));
});
