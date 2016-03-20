import { Opcode, OpcodeJSON, UpdatingOpcode } from '../../opcodes';
import { VM, UpdatingVM } from '../../vm';
import { PathReference } from 'glimmer-reference';
import { dict } from 'glimmer-util';
import { clear } from '../../bounds';
import { Fragment } from '../../builder';

function normalizeTextValue(value: any): string {
  if (value === null || value === undefined || typeof value.toString !== 'function') {
    return '';
  } else {
    return String(value);
  }
}

abstract class UpdatingContentOpcode extends UpdatingOpcode {
  public type: string;
  public next = null;
  public prev = null;

  abstract evaluate(vm: UpdatingVM);
}

export class AppendOpcode extends Opcode {
  type = 'append';

  evaluate(vm: VM) {
    let reference = vm.frame.getOperand();
    let value = normalizeTextValue(reference.value());
    let node = vm.stack().appendText(value);
    vm.updateWith(new UpdateAppendOpcode(reference, value, node));
  }

  toJSON(): OpcodeJSON {
    return {
      guid: this._guid,
      type: this.type,
      args: ["$OPERAND"]
    };
  }
}

export class UpdateAppendOpcode extends UpdatingContentOpcode {
  type = 'update-append';

  private reference: PathReference<string>;
  private lastValue: string;
  private textNode: Text;

  constructor(reference: PathReference<string>, lastValue: string, textNode: Text) {
    super();
    this.reference = reference;
    this.lastValue = lastValue;
    this.textNode = textNode;
  }

  evaluate() {
    let val = normalizeTextValue(this.reference.value());

    if (val !== this.lastValue) {
      this.lastValue = this.textNode.nodeValue = val;
    }
  }

  toJSON(): OpcodeJSON {
    let { _guid: guid, type, lastValue } = this;

    let details = dict<string>();

    details["lastValue"] = JSON.stringify(lastValue);

    return { guid, type, details };
  }
}

export class TrustingAppendOpcode extends Opcode {
  type = 'trusting-append';

  evaluate(vm: VM) {
    let reference = vm.frame.getOperand();
    let value = normalizeTextValue(reference.value());

    let bounds = vm.stack().insertHTMLBefore(null, value);
    vm.updateWith(new UpdateTrustingAppendOpcode(reference, value, bounds));
  }
}

export class UpdateTrustingAppendOpcode extends UpdatingContentOpcode {
  type = 'update-trusting-append';

  private reference: PathReference<string>;
  private lastValue: string;
  private bounds: Fragment;

  constructor(reference: PathReference<string>, lastValue: string, bounds: Fragment) {
    super();
    this.reference = reference;
    this.lastValue = lastValue;
    this.bounds = bounds;
  }

  evaluate(vm: UpdatingVM) {
    let val = normalizeTextValue(this.reference.value());

    if (val !== this.lastValue) {
      this.lastValue = val;

      let parent = <HTMLElement>this.bounds.parentElement();
      let nextSibling = clear(this.bounds);
      this.bounds.update(vm.dom.insertHTMLBefore(parent, nextSibling, val));
    }
  }
}
