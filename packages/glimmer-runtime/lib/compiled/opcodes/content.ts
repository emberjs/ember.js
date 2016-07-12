import Upsert, {
  Insertion,
  CautiousInsertion,
  TrustingInsertion,

  isSafeString,
  isNode,
  isString,

  cautiousInsert,
  trustingInsert
} from '../../upsert';
import { DOMHelper } from '../../dom/helper';
import { Opcode, OpcodeJSON, UpdatingOpcode } from '../../opcodes';
import { VM, UpdatingVM } from '../../vm';
import { Reference, ReferenceCache, isModified, isConst, map } from 'glimmer-reference';
import { Opaque, dict } from 'glimmer-util';
import { Cursor, clear } from '../../bounds';
import { Fragment } from '../../builder';
import {  } from '../../environment';

function isEmpty(value: Opaque): boolean {
  return value === null || value === undefined || typeof value['toString'] !== 'function';
}

export function normalizeTextValue(value: Opaque): string {
  if (isEmpty(value)) {
    return '';
  }
  return String(value);
}

export function normalizeTrustedValue(value: Opaque): TrustingInsertion {
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

export function normalizeValue(value: Opaque): CautiousInsertion {
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

abstract class AppendOpcode<T extends Insertion> extends Opcode {
  protected abstract normalize(reference: Reference<Opaque>): Reference<T>;
  protected abstract insert(dom: DOMHelper, cursor: Cursor, value: T): Upsert;
  protected abstract updateWith(cache: ReferenceCache<T>, bounds: Fragment, upsert: Upsert): UpdateOpcode<T>;

  evaluate(vm: VM) {
    let reference = this.normalize(vm.frame.getOperand());
    let cache = new ReferenceCache(reference);
    let value = cache.peek();

    let stack = vm.stack();
    let upsert = this.insert(stack.dom, stack, value);
    let bounds = new Fragment(upsert.bounds);

    vm.stack().newBounds(bounds);

    if (!isConst(reference)) {
      vm.updateWith(this.updateWith(cache, bounds, upsert));
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

abstract class UpdateOpcode<T extends Insertion> extends UpdatingOpcode {
  constructor(
    private cache: ReferenceCache<T>,
    private bounds: Fragment,
    private upsert: Upsert
  ) {
    super();
    this.tag = cache.tag;
  }

  protected abstract insert(dom: DOMHelper, cursor: Cursor, value: T): Upsert;

  evaluate(vm: UpdatingVM) {
    let value = this.cache.revalidate();

    if (isModified(value)) {
      let { bounds, upsert } = this;
      let { dom } = vm;

      if(!this.upsert.update(dom, value)) {
        let cursor = new Cursor(bounds.parentElement(), clear(bounds));
        upsert = this.upsert = this.insert(dom, cursor, value);
      }

      bounds.update(upsert.bounds);
    }
  }

  toJSON(): OpcodeJSON {
    let { _guid: guid, type } = this;

    let details = dict<string>();

    details["lastValue"] = JSON.stringify(this.cache.peek());

    return { guid, type, details };
  }
}

export class CautiousAppendOpcode extends AppendOpcode<CautiousInsertion> {
  type = 'cautious-append';

  protected normalize(reference: Reference<Opaque>): Reference<CautiousInsertion> {
    return map(reference, normalizeValue);
  }

  protected insert(dom: DOMHelper, cursor: Cursor, value: CautiousInsertion): Upsert {
    return cautiousInsert(dom, cursor, value);
  }

  protected updateWith(cache: ReferenceCache<CautiousInsertion>, bounds: Fragment, upsert: Upsert): CautiousUpdateOpcode {
    return new CautiousUpdateOpcode(cache, bounds, upsert);
  }
}

class CautiousUpdateOpcode extends UpdateOpcode<CautiousInsertion> {
  type = 'cautious-update';

  protected insert(dom: DOMHelper, cursor: Cursor, value: CautiousInsertion): Upsert {
    return cautiousInsert(dom, cursor, value);
  }
}
export class TrustingAppendOpcode extends AppendOpcode<TrustingInsertion> {
  type = 'trusting-append';

  protected normalize(reference: Reference<Opaque>): Reference<TrustingInsertion> {
    return map(reference, normalizeTrustedValue);
  }

  protected insert(dom: DOMHelper, cursor: Cursor, value: TrustingInsertion): Upsert {
    return trustingInsert(dom, cursor, value);
  }

  protected updateWith(cache: ReferenceCache<TrustingInsertion>, bounds: Fragment, upsert: Upsert): TrustingUpdateOpcode {
    return new TrustingUpdateOpcode(cache, bounds, upsert);
  }
}

class TrustingUpdateOpcode extends UpdateOpcode<TrustingInsertion> {
  type = 'trusting-update';

  protected insert(dom: DOMHelper, cursor: Cursor, value: TrustingInsertion): Upsert {
    return trustingInsert(dom, cursor, value);
  }
}
