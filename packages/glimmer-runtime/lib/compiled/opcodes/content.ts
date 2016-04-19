import { Opcode, OpcodeJSON, UpdatingOpcode } from '../../opcodes';
import { VM, UpdatingVM } from '../../vm';
import { ReferenceCache, isModified, isConst, map } from 'glimmer-reference';
import { Opaque, dict } from 'glimmer-util';
import { Bounds, clear, SingleNodeBounds } from '../../bounds';
import { FragmentBounds } from '../../builder';
import { Insertion, TrustedInsertion, SafeString, isSafeString, isNode, isString } from '../../environment';

function isEmpty(value: Opaque): boolean {
  return value === null || value === undefined || typeof value['toString'] !== 'function';
}

export function normalizeTextValue(value: Opaque): string {
  if (isEmpty(value)) {
    return '';
  }
  return String(value);
}

export function normalizeTrustedValue(value: Opaque): TrustedInsertion {
  if (isEmpty(value)) {
    return '';
  }
  if (isString(value)) {
    return value;
  }
  if (isSafeString(value)) {
    return value.toHTML();
  }
  if (isNode(value)) {
    return value;
  }
  return String(value);
}

export function normalizeValue(value: Opaque): Insertion {
  if (isEmpty(value)) {
    return '';
  }
  if (isString(value)) {
    return value;
  }
  if (isSafeString(value) || isNode(value)) {
    return value;
  }
  return String(value);
}

class UpdatingContentOpcode<T> extends UpdatingOpcode {
  public next = null;
  public prev = null;

  constructor(public type: string, private cache: ReferenceCache<T>, private bounds: FragmentBounds<T>) {
    super();
  }

  evaluate(vm: UpdatingVM) {
    let value = this.cache.revalidate();

    if (isModified(value)) {
      this.bounds.update(vm.dom, value);
    }
  }

  toJSON(): OpcodeJSON {
    let { _guid: guid, type } = this;

    let details = dict<string>();

    details["lastValue"] = JSON.stringify(this.cache.peek());

    return { guid, type, details };
  }
}

export class AppendOpcode extends Opcode {
  type = 'append';

  evaluate(vm: VM) {
    let reference = vm.frame.getOperand();

    let mapped = map(reference, normalizeValue);
    let cache = new ReferenceCache(mapped);
    let value = cache.peek();

    if (isConst(reference)) {
      vm.stack().appendInsertion(value);
    } else {
      let bounds = vm.stack().appendInsertion(value);
      vm.updateWith(new UpdatingContentOpcode<Insertion>('update-cautious-append', cache, bounds));
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

    let mapped = map(reference, normalizeTrustedValue);
    let cache = new ReferenceCache(mapped);
    let value = cache.peek();
    let bounds = vm.stack().appendHTML(value);

    if (!isConst(reference)) {
      vm.updateWith(new UpdatingContentOpcode<TrustedInsertion>('update-trusting-append', cache, bounds));
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
