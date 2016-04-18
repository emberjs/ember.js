import { Opcode, OpcodeJSON, UpdatingOpcode } from '../../opcodes';
import { VM, UpdatingVM } from '../../vm';
import { ReferenceCache, isModified, isConst, map } from 'glimmer-reference';
import { Opaque, dict } from 'glimmer-util';
import { clear } from '../../bounds';
import { Fragment } from '../../builder';

export function normalizeTextValue(value: Opaque): string {
  if (value === null || value === undefined || typeof value['toString'] !== 'function') {
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

    let mapped = map(reference, normalizeTextValue);
    let cache = new ReferenceCache(mapped);
    let node = vm.stack().appendText(cache.peek());

    if (!isConst(reference)) {
      vm.updateWith(new UpdateAppendOpcode(cache, node));
    }
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
  private cache: ReferenceCache<string>;
  private textNode: Text;

  constructor(cache: ReferenceCache<string>, textNode: Text) {
    super();
    this.cache = cache;
    this.textNode = textNode;
  }

  evaluate() {
    let value = this.cache.revalidate();
    if (isModified(value)) this.textNode.nodeValue = value;
  }

  toJSON(): OpcodeJSON {
    let { _guid: guid, type } = this;

    let details = dict<string>();

    details["lastValue"] = JSON.stringify(this.cache.peek());

    return { guid, type, details };
  }
}

export class TrustingAppendOpcode extends Opcode {
  type = 'trusting-append';

  evaluate(vm: VM) {
    let reference = vm.frame.getOperand();

    let mapped = map(reference, normalizeTextValue);
    let cache = new ReferenceCache(mapped);
    let bounds = vm.stack().insertHTMLBefore(null, cache.peek());

    if (!isConst(reference)) {
      vm.updateWith(new UpdateTrustingAppendOpcode(cache, bounds));
    }
  }

  toJSON(): OpcodeJSON {
    return {
      guid: this._guid,
      type: this.type,
      args: ["$OPERAND"]
    };
  }
}

export class UpdateTrustingAppendOpcode extends UpdatingContentOpcode {
  type = 'update-trusting-append';
  private cache: ReferenceCache<string>;
  private bounds: Fragment;

  constructor(cache: ReferenceCache<string>, bounds: Fragment) {
    super();
    this.cache = cache;
    this.bounds = bounds;
  }

  evaluate(vm: UpdatingVM) {
    let value = this.cache.revalidate();

    if (isModified(value)) {
      let parent = <HTMLElement>this.bounds.parentElement();
      let nextSibling = clear(this.bounds);
      this.bounds.update(vm.dom.insertHTMLBefore(parent, nextSibling, value));
    }
  }

  toJSON(): OpcodeJSON {
    let { _guid: guid, type } = this;

    let details = dict<string>();

    details["lastValue"] = JSON.stringify(this.cache.peek());

    return { guid, type, details };
  }
}
