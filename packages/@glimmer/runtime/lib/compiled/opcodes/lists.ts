import { EvaluatedArgs } from '../expressions/args';
import { expect } from '@glimmer/util';
import { RevisionTag, Reference, ConstReference, ReferenceIterator, IterationArtifacts } from '@glimmer/reference';
import { APPEND_OPCODES, OpcodeName as Op } from '../../opcodes';

class IterablePresenceReference implements Reference<boolean> {
  public tag: RevisionTag;
  private artifacts: IterationArtifacts;

  constructor(artifacts: IterationArtifacts) {
    this.tag = artifacts.tag;
    this.artifacts = artifacts;
  }

  value(): boolean {
    return !this.artifacts.isEmpty();
  }
}

APPEND_OPCODES.add(Op.PutIterator, vm => {
  let listRef = vm.frame.getOperand();
  let args = expect(vm.frame.getArgs(), 'PutIteratorOpcode expects a populated args register');
  let iterable = vm.env.iterableFor(listRef, args);
  let iterator = new ReferenceIterator(iterable);

  vm.frame.setIterator(iterator);
  vm.frame.setCondition(new IterablePresenceReference(iterator.artifacts));
});

APPEND_OPCODES.add(Op.EnterList, (vm, { op1: start, op2: end }) => {
  vm.enterList(start, end);
});

APPEND_OPCODES.add(Op.ExitList, vm => vm.exitList());

APPEND_OPCODES.add(Op.EnterWithKey, (vm, { op1: start, op2: end }) => {
  let key = expect(vm.frame.getKey(), 'EnterWithKeyOpcode expects a populated key register');
  vm.enterWithKey(key, start, end);
});

const TRUE_REF = new ConstReference(true);
const FALSE_REF = new ConstReference(false);

APPEND_OPCODES.add(Op.NextIter, (vm, { op1: end }) => {
  let item = vm.frame.getIterator().next();

  if (item) {
    vm.frame.setCondition(TRUE_REF);
    vm.frame.setKey(item.key);
    vm.frame.setOperand(item.value);
    vm.frame.setArgs(EvaluatedArgs.positional([item.value, item.memo]));
  } else {
    vm.frame.setCondition(FALSE_REF);
    vm.goto(end);
  }
});
