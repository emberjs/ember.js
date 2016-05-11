import { Opcode, OpcodeJSON } from '../../opcodes';
import { VM } from '../../vm';
import { LabelOpcode } from '../../compiled/opcodes/vm';
import { EvaluatedArgs } from '../expressions/args';
import { FIXME, ListSlice, Slice } from 'glimmer-util';
import { VOLATILE_TAG, Reference, ConstReference, ReferenceIterator, IterationArtifacts } from 'glimmer-reference';

class IterablePresenceReference implements Reference<boolean> {
  private artifacts: IterationArtifacts;
  public tag = VOLATILE_TAG as FIXME<'Can we do better than this?'>;

  constructor(artifacts: IterationArtifacts) {
    this.artifacts = artifacts;
  }

  value(): boolean {
    return !this.artifacts.isEmpty();
  }
}

export class PutIteratorOpcode extends Opcode {
  public type = "put-iterator";

  evaluate(vm: VM) {
    let listRef = vm.frame.getOperand();
    let args = vm.frame.getArgs();
    let iterable = vm.env.iterableFor(listRef, args);
    let iterator = new ReferenceIterator(iterable);

    vm.frame.setIterator(iterator);
    vm.frame.setCondition(new IterablePresenceReference(iterator.artifacts));
  }
}

export class EnterListOpcode extends Opcode {
  public type = "enter-list";

  public slice: Slice<Opcode>;

  constructor(start: LabelOpcode, end: LabelOpcode) {
    super();
    this.slice = new ListSlice(start, end);
  }

  evaluate(vm: VM) {
    vm.enterList(this.slice);
  }

  toJSON(): OpcodeJSON {
    let { slice, type, _guid } = this;

    let begin = slice.head() as LabelOpcode;
    let end = slice.tail() as LabelOpcode;

    return {
      guid: _guid,
      type,
      args: [
        JSON.stringify(begin.inspect()),
        JSON.stringify(end.inspect())
      ]
    };
  }
}

export class ExitListOpcode extends Opcode {
  public type = "exit-list";

  evaluate(vm: VM) {
    vm.exitList();
  }
}

export class EnterWithKeyOpcode extends Opcode {
  public type = "enter-with-key";

  private slice: Slice<Opcode>;

  constructor(start: LabelOpcode, end: LabelOpcode) {
    super();
    this.slice = new ListSlice(start, end);
  }

  evaluate(vm: VM) {
    vm.enterWithKey(vm.frame.getKey(), this.slice);
  }

  toJSON(): OpcodeJSON {
    let { slice, _guid, type } = this;

    let begin = slice.head() as LabelOpcode;
    let end = slice.tail() as LabelOpcode;

    return {
      guid: _guid,
      type,
      args: [
        JSON.stringify(begin.inspect()),
        JSON.stringify(end.inspect())
      ]
    };
  }
}

const TRUE_REF = new ConstReference(true);
const FALSE_REF = new ConstReference(false);

export class NextIterOpcode extends Opcode {
  public type = "next-iter";

  private end: LabelOpcode;

  constructor(end: LabelOpcode) {
    super();
    this.end = end;
  }

  evaluate(vm: VM) {
    let item = vm.frame.getIterator().next();

    if (item) {
      vm.frame.setCondition(TRUE_REF);
      vm.frame.setKey(item.key as FIXME<'user str to InternedString'>);
      vm.frame.setOperand(item.value);
      vm.frame.setArgs(EvaluatedArgs.positional([item.value, item.memo]));
    } else {
      vm.frame.setCondition(FALSE_REF);
      vm.goto(this.end);
    }
  }
}
