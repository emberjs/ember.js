import { Opcode, OpcodeJSON, UpdatingOpcode } from '../../opcodes';
import { VM, UpdatingVM } from '../../vm';
import { ReferenceCache, isModified, isConst, map } from 'glimmer-reference';
import { Opaque, dict } from 'glimmer-util';
import { Bounds, clear } from '../../bounds';
import { Fragment } from '../../builder';

export function normalizeTextValue(value: Opaque): string {
  if (value === null || value === undefined || typeof value['toString'] !== 'function') {
    return '';
  } else {
    return String(value);
  }
}

export function normalizeTextOrTrustedValue(value: Opaque): Opaque {
  if (isSafeString(value)) {
    return value;
  } else {
    return normalizeTextValue(value);
  }
}

export function isSafeString(value: Opaque): boolean {
  return value && typeof value['toHTML'] === 'function';
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

    let mapped = map(reference, normalizeTextOrTrustedValue);
    let cache = new ReferenceCache(mapped);
    let value = cache.peek();

    if (isSafeString(value)) {
      let bounds = vm.stack().insertHTMLBefore(null, value);
      vm.updateWith(new UpdateCautiousAppendOpcode(cache, bounds, null));
    } else {
      if (isConst(reference)) {
        vm.stack().appendText(cache.peek());
      } else {
        let bounds = vm.stack().insertTextBefore(null, value);
        vm.updateWith(new UpdateCautiousAppendOpcode(cache, bounds, bounds.firstNode() as Text));
      }
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

export class UpdateCautiousAppendOpcode extends UpdatingContentOpcode {
  type = 'update-cautious-append';
  private cache: ReferenceCache<string>;
  private bounds: Fragment;
  private textNode: Text;

  constructor(cache: ReferenceCache<string>, bounds: Fragment, textNode: Text) {
    super();
    this.cache = cache;
    this.bounds = bounds;
    this.textNode = textNode;
  }

  evaluate(vm: UpdatingVM) {
    let value = this.cache.revalidate();

    if (isModified(value)) {
      let parent = <HTMLElement>this.bounds.parentElement();

      if (isSafeString(value)) {
        this.textNode = null;
        let nextSibling = clear(this.bounds);
        this.bounds.update(vm.dom.insertHTMLBefore(parent, nextSibling, value));
      } else {
        if(this.textNode) {
          this.textNode.nodeValue = value;
        } else {
          let nextSibling = clear(this.bounds);
          this.bounds.update(vm.dom.insertTextBefore(parent, nextSibling, value));
          this.textNode = this.bounds.firstNode() as Text;
        }
      }
    }
  }

  toJSON(): OpcodeJSON {
    let { _guid: guid, type } = this;

    let details = dict<string>();

    details["lastValue"] = JSON.stringify(this.cache.peek());
    details["isSafeString"] = JSON.stringify(isSafeString(this.cache.peek()));

    return { guid, type, details };
  }
}
