import { CompiledGetBlock } from '../expressions/has-block';
import { CompiledArgs, EvaluatedArgs } from '../expressions/args';
import { APPEND_OPCODES, OpcodeName as Op } from '../../opcodes';
import { Option } from 'glimmer-util';

APPEND_OPCODES.add(Op.OpenBlock, (vm, { op1: _getBlock, op2: _args }) => {
  let inner = vm.constants.getOther<CompiledGetBlock>(_getBlock);
  let rawArgs = vm.constants.getExpression<CompiledArgs>(_args);
  let args: Option<EvaluatedArgs> = null;

  let block = inner.evaluate(vm);

  if (block) {
    args = rawArgs.evaluate(vm);
  }

  // FIXME: can we avoid doing this when we don't have a block?
  vm.pushCallerScope();

  if (block) {
    vm.invokeBlock(block, args || null);
  }
});

APPEND_OPCODES.add(Op.CloseBlock, vm => vm.popScope());