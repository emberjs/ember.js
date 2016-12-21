import { Opcode, OpcodeJSON, Slice } from '../../opcodes';
import { VM } from '../../vm';
import { EvaluatedArgs } from '../expressions/args';
import { expect } from 'glimmer-util';
import { RevisionTag, Reference, ConstReference, ReferenceIterator, IterationArtifacts } from 'glimmer-reference';

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

export class PutIteratorOpcode extends Opcode {
  public type = "put-iterator";

  evaluate(vm: VM) {
    let listRef = vm.frame.getOperand();
    let args = expect(vm.frame.getArgs(), 'PutIteratorOpcode expects a populated args register');
    let iterable = vm.env.iterableFor(listRef, args);
    let iterator = new ReferenceIterator(iterable);

    vm.frame.setIterator(iterator);
    vm.frame.setCondition(new IterablePresenceReference(iterator.artifacts));
  }
}

export class EnterListOpcode extends Opcode {
  public type = "enter-list";

  constructor(private slice: Slice) {
    super();
  }

  evaluate(vm: VM) {
    vm.enterList(this.slice);
  }

  toJSON(): OpcodeJSON {
    let { type, _guid } = this;

    return {
      guid: _guid,
      type,
      args: [

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

  constructor(private slice: Slice) {
    super();
  }

  evaluate(vm: VM) {
    let key = expect(vm.frame.getKey(), 'EnterWithKeyOpcode expects a populated key register');
    vm.enterWithKey(key, this.slice);
  }

  toJSON(): OpcodeJSON {
    let { _guid, type } = this;

    return {
      guid: _guid,
      type,
      args: [

      ]
    };
  }
}

const TRUE_REF = new ConstReference(true);
const FALSE_REF = new ConstReference(false);

export class NextIterOpcode extends Opcode {
  public type = "next-iter";

  private end: number;

  constructor(end: number) {
    super();
    this.end = end;
  }

  evaluate(vm: VM) {
    let item = vm.frame.getIterator().next();

    if (item) {
      vm.frame.setCondition(TRUE_REF);
      vm.frame.setKey(item.key);
      vm.frame.setOperand(item.value);
      vm.frame.setArgs(EvaluatedArgs.positional([item.value, item.memo]));
    } else {
      vm.frame.setCondition(FALSE_REF);
      vm.goto(this.end);
    }
  }
}
