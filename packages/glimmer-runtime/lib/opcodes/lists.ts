import { Opcode, UpdatingOpcode, ExpressionSyntax } from '../opcodes';
import { VM, UpdatingVM } from '../vm';
import { Assert } from './vm';
import { ElementStack } from '../builder';
import { EvaluatedParamsAndHash as EvaluatedArgs, ParamsAndHash as Args, RawTemplate } from '../template';
import { Frame } from '../environment';
import { Bounds } from '../morph';
import { LITERAL, InternedString, Dict, ListSlice, dict, assert } from 'glimmer-util';
import { RootReference, ConstReference, ListManager, ListDelegate } from 'glimmer-reference';
import { clear, move } from '../morph';

abstract class ListOpcode implements Opcode {
  public type: string;
  public next = null;
  public prev = null;

  abstract evaluate(vm: VM<any>);
}

abstract class ListUpdatingOpcode implements UpdatingOpcode {
  public type: string;
  public next = null;
  public prev = null;

  abstract evaluate(vm: UpdatingVM);
}

export class EnterListOpcode extends ListOpcode {
  public type = "enter-list";

  private begin: Opcode;
  private end: Opcode;

  constructor(begin: Opcode, end: Opcode) {
    super();
    this.begin = begin;
    this.end = end;
  }

  evaluate(vm: VM<any>) {
    let listRef = vm.registers.operand;
    let keyPath = vm.registers.args.hash.get(LITERAL("key")).value();

    let manager =  new ListManager(<RootReference>listRef /* WTF */, keyPath);
    let delegate = new IterateDelegate(vm);

    let iterator = vm.registers.iterator = manager.iterator(delegate);

    vm.enterList(manager, new ListSlice(this.begin, this.end));
  }
}

export class ExitListOpcode extends ListOpcode {
  public type = "exit-list";

  evaluate(vm: VM<any>) {
    vm.exitList();
  }
}

export class EnterWithKeyOpcode extends ListOpcode {
  public type = "enter-with-key";

  private begin: Opcode;
  private end: Opcode;

  constructor(begin: Opcode, end: Opcode) {
    super();
    this.begin = begin;
    this.end = end;
  }

  evaluate(vm: VM<any>) {
    vm.enterWithKey(vm.registers.key, new ListSlice(this.begin, this.end));
  }
}

class IterateDelegate implements ListDelegate {
  private vm: VM<any>;

  constructor(vm: VM<any>) {
    this.vm = vm;
  }

  insert(key: InternedString, item: RootReference, before: InternedString) {
    let { vm } = this;

    assert(!before, "Insertion should be append-only on initial render");

    vm.registers.args = EvaluatedArgs.single(item);
    vm.registers.operand = item;
    vm.registers.condition = new ConstReference(true);
    vm.registers.key = key;
  }

  retain(key: InternedString, item: RootReference) {
    assert(false, "Insertion should be append-only on initial render");
  }

  move(key: InternedString, item: RootReference, before: InternedString) {
    assert(false, "Insertion should be append-only on initial render");
  }

  delete(key: InternedString) {
    assert(false, "Insertion should be append-only on initial render");
  }

  done() {
    this.vm.registers.condition = new ConstReference(false);
  }
}

export class NextIterOpcode extends ListOpcode {
  public type = "next-iter";

  private end: Opcode;

  constructor(end: Opcode) {
    super();
    this.end = end;
  }

  evaluate(vm: VM<any>) {
    if (vm.registers.iterator.next()) {
      vm.goto(this.end);
    }
  }
}

class ReiterateOpcode extends ListUpdatingOpcode {
  public type = "reiterate";

  private initialize: (vm: VM<any>) => void;

  constructor(initialize: (vm: VM<any>) => void) {
    super();
    this.initialize = initialize;
  }

  evaluate(vm: UpdatingVM) {
    vm.throw(this.initialize);
  }
}

    // let delegate = new IterateDelegate(vm);
    // let keyPath = vm.registers.args.hash.get(LITERAL("key")).value();

    // let listRef = vm.registers.operand;
    // let manager = new ListManager(<RootReference>listRef /* WTF */, keyPath, delegate);
    // let iterator = vm.registers.iterator = manager.iterator();

    // if (iterator.next()) {
    //   // vm.updateWith(???);
    //   vm.goto(this.elseTarget);
    // } else {
    //   // vm.updateWith(???);
    // }
