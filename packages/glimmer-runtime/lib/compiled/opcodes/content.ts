import { EMPTY_SYMBOL_TABLE } from '../../symbol-table';
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
import { isComponentDefinition } from '../../component/interfaces';
import { DOMTreeConstruction } from '../../dom/helper';
import { OpSeq, Opcode, OpcodeJSON, UpdatingOpcode } from '../../opcodes';
import { CompiledExpression } from '../expressions';
import { VM, UpdatingVM } from '../../vm';
import { TryOpcode, VMState } from '../../vm/update';
import { EnterOpcode } from './vm';
import { Reference, ReferenceCache, UpdatableTag, isModified, isConst, map } from 'glimmer-reference';
import { FIXME, Option, Opaque, LinkedList, expect } from 'glimmer-util';
import { Cursor, clear } from '../../bounds';
import { Fragment } from '../../builder';
import { CompileIntoList } from '../../compiler';
import OpcodeBuilderDSL from './builder';
import { ConditionalReference } from '../../references';
import { Args } from '../../syntax/core';
import { Environment } from '../../environment';
import { UpdatableBlockTracker } from '../../builder';
import { SymbolTable } from 'glimmer-interfaces';

function isEmpty(value: Opaque): boolean {
  return value === null || value === undefined || typeof value['toString'] !== 'function';
}

export function normalizeTextValue(value: Opaque): string {
  if (isEmpty(value)) {
    return '';
  }
  return String(value);
}

function normalizeTrustedValue(value: Opaque): TrustingInsertion {
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

function normalizeValue(value: Opaque): CautiousInsertion {
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

export abstract class AppendOpcode<T extends Insertion> extends Opcode {
  protected abstract normalize(reference: Reference<Opaque>): Reference<T>;
  protected abstract insert(dom: DOMTreeConstruction, cursor: Cursor, value: T): Upsert;
  protected abstract updateWith(vm: VM, reference: Reference<Opaque>, cache: ReferenceCache<T>, bounds: Fragment, upsert: Upsert): UpdatingOpcode;

  evaluate(vm: VM) {
    let reference = vm.frame.getOperand();
    let normalized = this.normalize(reference);

    let value, cache;

    if (isConst(reference)) {
      value = normalized.value();
    } else {
      cache = new ReferenceCache(normalized);
      value = cache.peek();
    }

    let stack = vm.stack();
    let upsert = this.insert(vm.env.getAppendOperations(), stack, value);
    let bounds = new Fragment(upsert.bounds);

    stack.newBounds(bounds);

    if (cache /* i.e. !isConst(reference) */) {
      vm.updateWith(this.updateWith(vm, reference, cache, bounds, upsert));
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

export abstract class GuardedAppendOpcode<T extends Insertion> extends AppendOpcode<T> {
  protected abstract AppendOpcode: typeof OptimizedCautiousAppendOpcode | typeof OptimizedTrustingAppendOpcode;
  private deopted: Option<OpSeq> = null;

  constructor(private expression: CompiledExpression<any>, private symbolTable: SymbolTable) {
    super();
  }

  evaluate(vm: VM) {
    if (this.deopted) {
      vm.pushEvalFrame(this.deopted);
    } else {
      vm.evaluateOperand(this.expression);

      let value = vm.frame.getOperand().value();

      if(isComponentDefinition(value)) {
        vm.pushEvalFrame(this.deopt(vm.env));
      } else {
        super.evaluate(vm);
      }
    }
  }

  public deopt(env: Environment): OpSeq { // Public because it's used in the lazy deopt
    // At compile time, we determined that this append callsite might refer
    // to a local variable/property lookup that resolves to a component
    // definition at runtime.
    //
    // We could have eagerly compiled this callsite into something like this:
    //
    //   {{#if (is-component-definition foo)}}
    //     {{component foo}}
    //   {{else}}
    //     {{foo}}
    //   {{/if}}
    //
    // However, in practice, there might be a large amout of these callsites
    // and most of them would resolve to a simple value lookup. Therefore, we
    // tried to be optimistic and assumed that the callsite will resolve to
    // appending a simple value.
    //
    // However, we have reached here because at runtime, the guard conditional
    // have detected that this callsite is indeed referring to a component
    // definition object. Since this is likely going to be true for other
    // instances of the same callsite, it is now appropiate to deopt into the
    // expanded version that handles both cases. The compilation would look
    // like this:
    //
    //               PutValue(expression)
    //               Test(is-component-definition)
    //               Enter(BEGIN, END)
    //   BEGIN:      Noop
    //               JumpUnless(VALUE)
    //               PutDynamicComponentDefinitionOpcode
    //               OpenComponent
    //               CloseComponent
    //               Jump(END)
    //   VALUE:      Noop
    //               OptimizedAppend
    //   END:        Noop
    //               Exit
    //
    // Keep in mind that even if we *don't* reach here at initial render time,
    // it is still possible (although quite rare) that the simple value we
    // encounter during initial render could later change into a component
    // definition object at update time. That is handled by the "lazy deopt"
    // code on the update side (scroll down for the next big block of comment).

    let buffer = new CompileIntoList(env, EMPTY_SYMBOL_TABLE);
    let dsl = new OpcodeBuilderDSL(buffer, this.symbolTable, env);

    dsl.putValue(this.expression);
    dsl.test(IsComponentDefinitionReference.create);

    dsl.block(null, (dsl, BEGIN, END) => {
      dsl.jumpUnless('VALUE');
      dsl.putDynamicComponentDefinition();
      dsl.openComponent(Args.empty());
      dsl.closeComponent();
      dsl.jump(END);
      dsl.label('VALUE');
      dsl.append(new this.AppendOpcode());
    });

    let deopted = this.deopted = dsl.toOpSeq();

    // From this point on, we have essentially replaced ourselves with a new set
    // of opcodes. Since we will always be executing the new/deopted code, it's
    // a good idea (as a pattern) to null out any unneeded fields here to avoid
    // holding on to unneeded/stale objects:

    // QUESTION: Shouldn't this whole object be GCed? If not, why not?

    this.expression = null as FIXME<any, 'QUESTION'>;

    return deopted;
  }

  toJSON(): OpcodeJSON {
    let { _guid: guid, type, deopted } = this;

    if (deopted) {
      return {
        guid,
        type,
        deopted: true,
        children: deopted.toArray().map(op => op.toJSON())
      };
    } else {
      return {
        guid,
        type,
        args: [this.expression.toJSON()]
      };
    }
  }
}

class IsComponentDefinitionReference extends ConditionalReference {
  static create(inner: Reference<Opaque>): IsComponentDefinitionReference {
    return new IsComponentDefinitionReference(inner);
  }

  toBool(value: Opaque): boolean {
    return isComponentDefinition(value);
  }
}

abstract class UpdateOpcode<T extends Insertion> extends UpdatingOpcode {
  constructor(
    protected cache: ReferenceCache<T>,
    protected bounds: Fragment,
    protected upsert: Upsert
  ) {
    super();
    this.tag = cache.tag;
  }

  protected abstract insert(dom: DOMTreeConstruction, cursor: Cursor, value: T): Upsert;

  evaluate(vm: UpdatingVM) {
    let value = this.cache.revalidate();

    if (isModified(value)) {
      let { bounds, upsert } = this;
      let { dom } = vm;

      if(!this.upsert.update(dom, value)) {
        let cursor = new Cursor(bounds.parentElement(), clear(bounds));
        upsert = this.upsert = this.insert(vm.env.getAppendOperations(), cursor, value as T);
      }

      bounds.update(upsert.bounds);
    }
  }

  toJSON(): OpcodeJSON {
    let { _guid: guid, type, cache } = this;

    return {
      guid,
      type,
      details: { lastValue: JSON.stringify(cache.peek()) }
    };
  }
}

abstract class GuardedUpdateOpcode<T extends Insertion> extends UpdateOpcode<T> {
  private _tag: UpdatableTag;
  private deopted: Option<TryOpcode> = null;

  constructor(
    private reference: Reference<Opaque>,
    cache: ReferenceCache<T>,
    bounds: Fragment,
    upsert: Upsert,
    private appendOpcode: GuardedAppendOpcode<T>,
    private state: VMState
  ) {
    super(cache, bounds, upsert);
    this.tag = this._tag = new UpdatableTag(this.tag);
  }

  evaluate(vm: UpdatingVM) {
    if (this.deopted) {
      vm.evaluateOpcode(this.deopted);
    } else {
      if (isComponentDefinition(this.reference.value())) {
        this.lazyDeopt(vm);
      } else {
        super.evaluate(vm);
      }
    }
  }

  private lazyDeopt(vm: UpdatingVM) {
    // Durign initial render, we know that the reference does not contain a
    // component definition, so we optimistically assumed that this append
    // is just a normal append. However, at update time, we discovered that
    // the reference has switched into containing a component definition, so
    // we need to do a "lazy deopt", simulating what would have happened if
    // we had decided to perform the deopt in the first place during initial
    // render.
    //
    // More concretely, we would have expanded the curly into a if/else, and
    // based on whether the value is a component definition or not, we would
    // have entered either the dynamic component branch or the simple value
    // branch.
    //
    // Since we rendered a simple value during initial render (and all the
    // updates up until this point), we need to pretend that the result is
    // produced by the "VALUE" branch of the deopted append opcode:
    //
    //   Try(BEGIN, END)
    //     Assert(IsComponentDefinition, expected=false)
    //     OptimizedUpdate
    //
    // In this case, because the reference has switched from being a simple
    // value into a component definition, what would have happened is that
    // the assert would throw, causing the Try opcode to teardown the bounds
    // and rerun the original append opcode.
    //
    // Since the Try opcode would have nuked the updating opcodes anyway, we
    // wouldn't have to worry about simulating those. All we have to do is to
    // execute the Try opcode and immediately throw.

    let { bounds, appendOpcode, state } = this;

    let appendOps = appendOpcode.deopt(vm.env);
    let enter     = expect(appendOps.head().next, 'hardcoded deopt logic').next as EnterOpcode;
    let ops       = enter.slice;

    let tracker = new UpdatableBlockTracker(bounds.parentElement());
    tracker.newBounds(this.bounds);

    let children = new LinkedList<UpdatingOpcode>();

    state.frame['condition'] = IsComponentDefinitionReference.create(expect(state.frame['operand'], 'operand should be populated'));

    let deopted = this.deopted = new TryOpcode(ops, state, tracker, children);

    this._tag.update(deopted.tag);

    vm.evaluateOpcode(deopted);
    vm.throw();

    // From this point on, we have essentially replaced ourselve with a new
    // opcode. Since we will always be executing the new/deopted code, it's a
    // good idea (as a pattern) to null out any unneeded fields here to avoid
    // holding on to unneeded/stale objects:

    // QUESTION: Shouldn't this whole object be GCed? If not, why not?

    this._tag         = null as FIXME<any, 'QUESTION'>;
    this.reference    = null as FIXME<any, 'QUESTION'>;
    this.cache        = null as FIXME<any, 'QUESTION'>;
    this.bounds       = null as FIXME<any, 'QUESTION'>;
    this.upsert       = null as FIXME<any, 'QUESTION'>;
    this.appendOpcode = null as FIXME<any, 'QUESTION'>;
    this.state        = null as FIXME<any, 'QUESTION'>;
  }

  toJSON(): OpcodeJSON {
    let { _guid: guid, type, deopted } = this;

    if (deopted) {
      return {
        guid,
        type,
        deopted: true,
        children: [deopted.toJSON()]
      };
    } else {
      return super.toJSON();
    }
  }
}

export class OptimizedCautiousAppendOpcode extends AppendOpcode<CautiousInsertion> {
  type = 'optimized-cautious-append';

  protected normalize(reference: Reference<Opaque>): Reference<CautiousInsertion> {
    return map(reference, normalizeValue);
  }

  protected insert(dom: DOMTreeConstruction, cursor: Cursor, value: CautiousInsertion): Upsert {
    return cautiousInsert(dom, cursor, value);
  }

  protected updateWith(vm: VM, reference: Reference<Opaque>, cache: ReferenceCache<CautiousInsertion>, bounds: Fragment, upsert: Upsert): UpdatingOpcode {
    return new OptimizedCautiousUpdateOpcode(cache, bounds, upsert);
  }
}

class OptimizedCautiousUpdateOpcode extends UpdateOpcode<CautiousInsertion> {
  type = 'optimized-cautious-update';

  protected insert(dom: DOMTreeConstruction, cursor: Cursor, value: CautiousInsertion): Upsert {
    return cautiousInsert(dom, cursor, value);
  }
}

export class GuardedCautiousAppendOpcode extends GuardedAppendOpcode<CautiousInsertion> {
  type = 'guarded-cautious-append';

  protected AppendOpcode = OptimizedCautiousAppendOpcode;

  protected normalize(reference: Reference<Opaque>): Reference<CautiousInsertion> {
    return map(reference, normalizeValue);
  }

  protected insert(dom: DOMTreeConstruction, cursor: Cursor, value: CautiousInsertion): Upsert {
    return cautiousInsert(dom, cursor, value);
  }

  protected updateWith(vm: VM, reference: Reference<Opaque>, cache: ReferenceCache<CautiousInsertion>, bounds: Fragment, upsert: Upsert): UpdatingOpcode {
    return new GuardedCautiousUpdateOpcode(reference, cache, bounds, upsert, this, vm.capture());
  }
}

class GuardedCautiousUpdateOpcode extends GuardedUpdateOpcode<CautiousInsertion> {
  type = 'guarded-cautious-update';

  protected insert(dom: DOMTreeConstruction, cursor: Cursor, value: CautiousInsertion): Upsert {
    return cautiousInsert(dom, cursor, value);
  }
}

export class OptimizedTrustingAppendOpcode extends AppendOpcode<TrustingInsertion> {
  type = 'optimized-trusting-append';

  protected normalize(reference: Reference<Opaque>): Reference<TrustingInsertion> {
    return map(reference, normalizeTrustedValue);
  }

  protected insert(dom: DOMTreeConstruction, cursor: Cursor, value: TrustingInsertion): Upsert {
    return trustingInsert(dom, cursor, value);
  }

  protected updateWith(vm: VM, reference: Reference<Opaque>, cache: ReferenceCache<TrustingInsertion>, bounds: Fragment, upsert: Upsert): UpdatingOpcode {
    return new OptimizedTrustingUpdateOpcode(cache, bounds, upsert);
  }
}

class OptimizedTrustingUpdateOpcode extends UpdateOpcode<TrustingInsertion> {
  type = 'optimized-trusting-update';

  protected insert(dom: DOMTreeConstruction, cursor: Cursor, value: TrustingInsertion): Upsert {
    return trustingInsert(dom, cursor, value);
  }
}

export class GuardedTrustingAppendOpcode extends GuardedAppendOpcode<TrustingInsertion> {
  type = 'guarded-trusting-append';

  protected AppendOpcode = OptimizedTrustingAppendOpcode;

  protected normalize(reference: Reference<Opaque>): Reference<TrustingInsertion> {
    return map(reference, normalizeTrustedValue);
  }

  protected insert(dom: DOMTreeConstruction, cursor: Cursor, value: TrustingInsertion): Upsert {
    return trustingInsert(dom, cursor, value);
  }

  protected updateWith(vm: VM, reference: Reference<Opaque>, cache: ReferenceCache<TrustingInsertion>, bounds: Fragment, upsert: Upsert): UpdatingOpcode {
    return new GuardedTrustingUpdateOpcode(reference, cache, bounds, upsert, this, vm.capture());
  }
}

class GuardedTrustingUpdateOpcode extends GuardedUpdateOpcode<TrustingInsertion> {
  type = 'trusting-update';

  protected insert(dom: DOMTreeConstruction, cursor: Cursor, value: TrustingInsertion): Upsert {
    return trustingInsert(dom, cursor, value);
  }
}
