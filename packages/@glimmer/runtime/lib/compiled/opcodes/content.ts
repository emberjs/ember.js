import { DEBUG } from '@glimmer/env';
import {
  appendDynamicFragment,
  appendDynamicHTML,
  appendDynamicNode,
} from '../../vm/dynamic-content';
import { CURRIED_COMPONENT, CURRIED_HELPER } from '@glimmer/constants/lib/curried';
import {
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
import { isConstRef, valueForRef } from '@glimmer/reference/lib/reference';
import { isIndexable } from '@glimmer/util/lib/collections';
import { ContentType } from '@glimmer/vm/lib/content';

import { isCurriedType } from '../../curried-value';
import { isEmpty, isFragment, isNode, isSafeString, shouldCoerce } from '../../dom/normalize';
import { syscall } from '../../opcodes';
import DynamicTextContent from '../../vm/content/text';
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

export const CONTENT_TYPE_OP = /*#__PURE__*/ syscall(VM_CONTENT_TYPE_OP, (vm) => {
  let reference = check(vm.stack.peek(), CheckReference);

  vm.stack.push(toContentType(valueForRef(reference)));

  if (!isConstRef(reference)) {
    vm.updateWith(new AssertFilter(reference, toContentType));
  }
});

export const DYNAMIC_CONTENT_TYPE_OP = /*#__PURE__*/ syscall(VM_DYNAMIC_CONTENT_TYPE_OP, (vm) => {
  let reference = check(vm.stack.peek(), CheckReference);

  vm.stack.push(toDynamicContentType(valueForRef(reference)));

  if (!isConstRef(reference)) {
    vm.updateWith(new AssertFilter(reference, toDynamicContentType));
  }
});

export const APPEND_HTML_OP = /*#__PURE__*/ syscall(VM_APPEND_HTML_OP, (vm) => {
  let reference = check(vm.stack.pop(), CheckReference);

  let rawValue = valueForRef(reference);
  let value = isEmpty(rawValue) ? '' : String(rawValue);

  appendDynamicHTML(vm.tree(), value);
});

export const APPEND_SAFE_HTML_OP = /*#__PURE__*/ syscall(VM_APPEND_SAFE_HTML_OP, (vm) => {
  let reference = check(vm.stack.pop(), CheckReference);

  let rawValue = check(valueForRef(reference), CheckSafeString).toHTML();
  let value = isEmpty(rawValue) ? '' : check(rawValue, CheckString);

  appendDynamicHTML(vm.tree(), value);
});

export const APPEND_TEXT_OP = /*#__PURE__*/ syscall(VM_APPEND_TEXT_OP, (vm) => {
  let reference = check(vm.stack.pop(), CheckReference);

  let rawValue = valueForRef(reference);
  let value = isEmpty(rawValue) ? '' : String(rawValue);

  let node = vm.tree().appendDynamicText(value);

  if (!isConstRef(reference)) {
    vm.updateWith(new DynamicTextContent(node, reference, value));
  }
});

export const APPEND_DOCUMENT_FRAGMENT_OP = /*#__PURE__*/ syscall(
  VM_APPEND_DOCUMENT_FRAGMENT_OP,
  (vm) => {
    let reference = check(vm.stack.pop(), CheckReference);

    let value = check(valueForRef(reference), CheckDocumentFragment);

    appendDynamicFragment(vm.tree(), value);
  }
);

export const APPEND_NODE_OP = /*#__PURE__*/ syscall(VM_APPEND_NODE_OP, (vm) => {
  let reference = check(vm.stack.pop(), CheckReference);

  let value = check(valueForRef(reference), CheckNode);

  appendDynamicNode(vm.tree(), value);
});
