import { DEBUG } from '@glimmer/env';
import { CURRIED_COMPONENT, CURRIED_HELPER } from '@glimmer/constants/lib/curried';
import type {
  Bounds,
  Destroyable,
  DynamicScope,
  EvaluationContext,
  Nullable,
  Scope,
  SimpleElement,
  SimpleNode,
  SimpleText,
  UpdatingOpcode,
} from '@glimmer/interfaces';
import type { Reference } from '@glimmer/reference/lib/reference';
import {
  VM_APPEND_CAUTIOUS_TEXT_OP,
  VM_APPEND_DOCUMENT_FRAGMENT_OP,
  VM_APPEND_HTML_OP,
  VM_APPEND_NODE_OP,
  VM_APPEND_SAFE_HTML_OP,
  VM_APPEND_TEXT_OP,
  VM_CONTENT_TYPE_OP,
  VM_DYNAMIC_CONTENT_TYPE_OP,
} from '@glimmer/constants/lib/syscall-ops';
import {
  check,
  CheckDocumentFragment,
  CheckNode,
  CheckSafeString,
  CheckString,
} from '@glimmer/debug/lib/stack-check';
import {
  hasInternalComponentManager,
  hasInternalHelperManager,
} from '@glimmer/manager/lib/internal/api';
import { associateDestroyableChild } from '@glimmer/destroyable';
import { isConstRef, valueForRef } from '@glimmer/reference/lib/reference';
import { isIndexable } from '@glimmer/util/lib/collections';
import { ContentType } from '@glimmer/vm/lib/content';

import { isCurriedType } from '../../curried-value';
import type { UpdatingVM } from '../../vm/update';

import {
  isEmpty,
  isFragment,
  isNode,
  isSafeString,
  isString,
  shouldCoerce,
} from '../../dom/normalize';
import { APPEND_OPCODES } from '../../opcodes';
import { Closure } from '../../vm/append';
import DynamicTextContent from '../../vm/content/text';
import { ResettableBlockImpl } from '../../vm/element-builder';
import { TryOpcode } from '../../vm/update';
import { CheckReference } from './-debug-strip';
import { AssertFilter } from './vm';

function toContentType(value: unknown) {
  if (shouldCoerce(value)) {
    return ContentType.String;
  } else if (isCurriedType(value, CURRIED_COMPONENT) || hasInternalComponentManager(value)) {
    return ContentType.Component;
  } else if (isCurriedType(value, CURRIED_HELPER) || hasInternalHelperManager(value)) {
    return ContentType.Helper;
  } else if (isSafeString(value)) {
    return ContentType.SafeString;
  } else if (isFragment(value)) {
    return ContentType.Fragment;
  } else if (isNode(value)) {
    return ContentType.Node;
  } else {
    return ContentType.String;
  }
}

function toDynamicContentType(value: unknown) {
  if (!isIndexable(value)) {
    return ContentType.String;
  }

  if (isCurriedType(value, CURRIED_COMPONENT) || hasInternalComponentManager(value)) {
    return ContentType.Component;
  } else {
    if (DEBUG && !isCurriedType(value, CURRIED_HELPER) && !hasInternalHelperManager(value)) {
      throw new Error(
        // eslint-disable-next-line @typescript-eslint/no-base-to-string -- @fixme
        `Attempted use a dynamic value as a component or helper, but that value did not have an associated component or helper manager. The value was: ${value}`
      );
    }

    return ContentType.Helper;
  }
}

APPEND_OPCODES.add(VM_CONTENT_TYPE_OP, (vm) => {
  let reference = check(vm.stack.peek(), CheckReference);

  vm.stack.push(toContentType(valueForRef(reference)));

  if (!isConstRef(reference)) {
    vm.updateWith(new AssertFilter(reference, toContentType));
  }
});

APPEND_OPCODES.add(VM_DYNAMIC_CONTENT_TYPE_OP, (vm) => {
  let reference = check(vm.stack.peek(), CheckReference);

  vm.stack.push(toDynamicContentType(valueForRef(reference)));

  if (!isConstRef(reference)) {
    vm.updateWith(new AssertFilter(reference, toDynamicContentType));
  }
});

APPEND_OPCODES.add(VM_APPEND_HTML_OP, (vm) => {
  let reference = check(vm.stack.pop(), CheckReference);

  let rawValue = valueForRef(reference);
  let value = isEmpty(rawValue) ? '' : String(rawValue);

  vm.tree().appendDynamicHTML(value);
});

APPEND_OPCODES.add(VM_APPEND_SAFE_HTML_OP, (vm) => {
  let reference = check(vm.stack.pop(), CheckReference);

  let rawValue = check(valueForRef(reference), CheckSafeString).toHTML();
  let value = isEmpty(rawValue) ? '' : check(rawValue, CheckString);

  vm.tree().appendDynamicHTML(value);
});

APPEND_OPCODES.add(VM_APPEND_TEXT_OP, (vm) => {
  let reference = check(vm.stack.pop(), CheckReference);

  let rawValue = valueForRef(reference);
  let value = isEmpty(rawValue) ? '' : String(rawValue);

  let node = vm.tree().appendDynamicText(value);

  if (!isConstRef(reference)) {
    vm.updateWith(new DynamicTextContent(node, reference, value));
  }
});

// The fast path of the cautious append routine (`routine`) for content
// inside an element: text needs no block, no closure and no content type
// check until the value stops being text. Builders that are not plain
// need the routine's block.
APPEND_OPCODES.add(VM_APPEND_CAUTIOUS_TEXT_OP, (vm, { op1: routine }) => {
  let reference = check(vm.stack.peek(), CheckReference);
  let rawValue = valueForRef(reference);

  if (!vm.tree().isPlain || toContentType(rawValue) !== ContentType.String) {
    vm.call(routine);
    return;
  }

  vm.stack.pop();

  let tree = vm.tree();
  let value = isEmpty(rawValue) ? '' : String(rawValue);

  if (isConstRef(reference)) {
    tree.appendDynamicText(value);
    return;
  }

  // The text registers as bounds, so a block that replaces it later is
  // still inside the parent block's bounds.
  let text = new CautiousTextContent(
    tree.__appendText(value),
    reference,
    value,
    vm.program.heap.getaddr(routine),
    vm.scope(),
    vm.dynamicScope(),
    vm.destroyableParent(),
    vm.context
  );

  tree.didAppendBounds(text);
  vm.updateWith(text);
});

export class CautiousTextContent implements UpdatingOpcode, Bounds {
  private block: Nullable<TryOpcode> = null;

  constructor(
    private node: SimpleText,
    private reference: Reference,
    private lastValue: string,
    private routine: number,
    private scope: Scope,
    private dynamicScope: DynamicScope,
    // Text needs no destruction. A block made later joins this parent.
    private destroyableParent: Destroyable,
    private context: EvaluationContext
  ) {}

  parentElement(): SimpleElement {
    let { block } = this;
    return block === null ? (this.node.parentNode as SimpleElement) : block.parentElement();
  }

  firstNode(): SimpleNode {
    let { block } = this;
    return block === null ? this.node : block.firstNode();
  }

  lastNode(): SimpleNode {
    let { block } = this;
    return block === null ? this.node : block.lastNode();
  }

  evaluate(vm: UpdatingVM) {
    let { block } = this;

    if (block !== null) {
      block.evaluate(vm);
      return;
    }

    let value = valueForRef(this.reference);

    if (value === this.lastValue) return;

    if (toContentType(value) !== ContentType.String) {
      this.renderAsBlock();
      return;
    }

    let normalized = isEmpty(value) ? '' : isString(value) ? value : String(value);

    if (normalized !== this.lastValue) {
      this.node.nodeValue = this.lastValue = normalized;
    }
  }

  // Replaces the text node with a block that runs the full append routine,
  // like the block that the routine would have made on the first render.
  private renderAsBlock(): void {
    let { node, context } = this;

    let bounds = new ResettableBlockImpl(node.parentNode as SimpleElement);
    bounds.didAppendNode(node);

    let closure = new Closure(
      {
        pc: this.routine,
        scope: this.scope,
        dynamicScope: this.dynamicScope,
        stack: [this.reference],
      },
      context
    );

    let block = (this.block = new TryOpcode(closure, context, bounds, []));

    associateDestroyableChild(this.destroyableParent, block);
    block.handleException();
  }
}

APPEND_OPCODES.add(VM_APPEND_DOCUMENT_FRAGMENT_OP, (vm) => {
  let reference = check(vm.stack.pop(), CheckReference);

  let value = check(valueForRef(reference), CheckDocumentFragment);

  vm.tree().appendDynamicFragment(value);
});

APPEND_OPCODES.add(VM_APPEND_NODE_OP, (vm) => {
  let reference = check(vm.stack.pop(), CheckReference);

  let value = check(valueForRef(reference), CheckNode);

  vm.tree().appendDynamicNode(value);
});
