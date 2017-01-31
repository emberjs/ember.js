import { APPEND_OPCODES, Op } from '../../opcodes';
import { ConcatReference } from '../expressions/concat';
import { Helper } from '../../environment';
import { EvaluatedArgs } from '../expressions/args';
import { FunctionExpression } from '../expressions/function';
import { TRUE_REFERENCE, FALSE_REFERENCE } from '../../references';
import { Layout } from '../../scanner';
import { VersionedPathReference } from '@glimmer/reference';
import { Opaque } from '@glimmer/util';

APPEND_OPCODES.add(Op.Helper, (vm, { op1: _helper }) => {
  let helper = vm.constants.getFunction<Helper>(_helper);
  vm.evalStack.push(helper(vm, vm.evalStack.pop<EvaluatedArgs>()));
});

APPEND_OPCODES.add(Op.Function, (vm, { op1: _function }) => {
  let func = vm.constants.getFunction<FunctionExpression<Opaque>>(_function);
  vm.evalStack.push(func(vm));
});

APPEND_OPCODES.add(Op.Self, (vm) => {
  vm.evalStack.push(vm.getSelf());
});

APPEND_OPCODES.add(Op.GetVariable, (vm, { op1: symbol }) => {
  let expr = vm.referenceForSymbol(symbol);
  vm.evalStack.push(expr);
});

APPEND_OPCODES.add(Op.SetVariable, (vm, { op1: symbol }) => {
  let expr = vm.evalStack.pop<VersionedPathReference<Opaque>>();
  vm.scope().bindSymbol(symbol, expr);
});

APPEND_OPCODES.add(Op.RootScope, (vm, { op1: symbols, op2: bindCallerScope }) => {
  vm.pushRootScope(symbols, !!bindCallerScope);
});

APPEND_OPCODES.add(Op.VirtualRootScope, (vm, { op1: bindCallerScope }) => {
  let layout = vm.evalStack.top<Layout>();
});

APPEND_OPCODES.add(Op.GetProperty, (vm, { op1: _key }) => {
  let key = vm.constants.getString(_key);
  let expr = vm.evalStack.pop<VersionedPathReference<Opaque>>();
  vm.evalStack.push(expr.get(key));
});

APPEND_OPCODES.add(Op.PushBlock, (vm, { op1: _block }) => {
  let block = _block ? vm.constants.getBlock(_block) : null;
  vm.evalStack.push(block);
});

APPEND_OPCODES.add(Op.PushBlocks, (vm, { op1: defaultBlock, op2: inverseBlock }) => {
  if (defaultBlock) vm.evalStack.push(vm.constants.getBlock(defaultBlock));
  if (inverseBlock) vm.evalStack.push(vm.constants.getBlock(inverseBlock));
});

APPEND_OPCODES.add(Op.GetBlock, (vm, { op1: _block }) => {
  vm.evalStack.push(vm.scope().getBlock(_block));
});

APPEND_OPCODES.add(Op.HasBlock, (vm, { op1: _block }) => {
  let hasBlock = !!vm.scope().getBlock(_block);
  vm.evalStack.push(hasBlock ? TRUE_REFERENCE : FALSE_REFERENCE);
});

APPEND_OPCODES.add(Op.HasBlockParams, (vm, { op1: _block }) => {
  let block = vm.scope().getBlock(_block);
  let hasBlockParams = block && block.symbolTable.getSymbolSize('local');
  vm.evalStack.push(hasBlockParams ? TRUE_REFERENCE : FALSE_REFERENCE);
});

APPEND_OPCODES.add(Op.Concat, (vm, { op1: count }) => {
  let out: VersionedPathReference<Opaque>[] = [];

  for (let i=count; i>0; i--) {
    out.push(vm.evalStack.pop<VersionedPathReference<Opaque>>());
  }

  vm.evalStack.push(new ConcatReference(out.reverse()));
});

APPEND_OPCODES.add(Op.PutEvalledExpr, (vm) => {
  let expr = vm.evalStack.pop<VersionedPathReference<Opaque>>();
  vm.frame.setOperand(expr);
});

APPEND_OPCODES.add(Op.PutEvalledArgs, vm => {
  let args = vm.evalStack.pop<EvaluatedArgs>();
  vm.frame.setArgs(args);
  vm.frame.setOperand(args.positional.at(0));
});
