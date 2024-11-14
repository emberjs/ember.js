import {
  CURRIED_COMPONENT,
  CURRIED_HELPER,
  VM_APPEND_DOCUMENT_FRAGMENT_OP,
  VM_APPEND_HTML_OP,
  VM_APPEND_NODE_OP,
  VM_APPEND_SAFE_HTML_OP,
  VM_APPEND_TEXT_OP,
  VM_CONTENT_TYPE_OP,
  VM_DYNAMIC_CONTENT_TYPE_OP,
} from '@glimmer/constants';
import {
  check,
  CheckDocumentFragment,
  CheckNode,
  CheckSafeString,
  CheckString,
} from '@glimmer/debug';
import { hasInternalComponentManager, hasInternalHelperManager } from '@glimmer/manager';
import { isConstRef, valueForRef } from '@glimmer/reference';
import { isObject } from '@glimmer/util';
import { ContentType } from '@glimmer/vm';

import { isCurriedType } from '../../curried-value';
import { isEmpty, isFragment, isNode, isSafeString, shouldCoerce } from '../../dom/normalize';
import { APPEND_OPCODES } from '../../opcodes';
import DynamicTextContent from '../../vm/content/text';
import { CheckReference } from './-debug-strip';
import { AssertFilter } from './vm';

function toContentType(value: unknown) {
  if (shouldCoerce(value)) {
    return ContentType.String;
  } else if (
    isCurriedType(value, CURRIED_COMPONENT) ||
    hasInternalComponentManager(value as object)
  ) {
    return ContentType.Component;
  } else if (isCurriedType(value, CURRIED_HELPER) || hasInternalHelperManager(value as object)) {
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
  if (!isObject(value)) {
    return ContentType.String;
  }

  if (isCurriedType(value, CURRIED_COMPONENT) || hasInternalComponentManager(value)) {
    return ContentType.Component;
  } else {
    if (
      import.meta.env.DEV &&
      !isCurriedType(value, CURRIED_HELPER) &&
      !hasInternalHelperManager(value)
    ) {
      throw new Error(
        // eslint-disable-next-line @typescript-eslint/no-base-to-string
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

  vm.elements().appendDynamicHTML(value);
});

APPEND_OPCODES.add(VM_APPEND_SAFE_HTML_OP, (vm) => {
  let reference = check(vm.stack.pop(), CheckReference);

  let rawValue = check(valueForRef(reference), CheckSafeString).toHTML();
  let value = isEmpty(rawValue) ? '' : check(rawValue, CheckString);

  vm.elements().appendDynamicHTML(value);
});

APPEND_OPCODES.add(VM_APPEND_TEXT_OP, (vm) => {
  let reference = check(vm.stack.pop(), CheckReference);

  let rawValue = valueForRef(reference);
  let value = isEmpty(rawValue) ? '' : String(rawValue);

  let node = vm.elements().appendDynamicText(value);

  if (!isConstRef(reference)) {
    vm.updateWith(new DynamicTextContent(node, reference, value));
  }
});

APPEND_OPCODES.add(VM_APPEND_DOCUMENT_FRAGMENT_OP, (vm) => {
  let reference = check(vm.stack.pop(), CheckReference);

  let value = check(valueForRef(reference), CheckDocumentFragment);

  vm.elements().appendDynamicFragment(value);
});

APPEND_OPCODES.add(VM_APPEND_NODE_OP, (vm) => {
  let reference = check(vm.stack.pop(), CheckReference);

  let value = check(valueForRef(reference), CheckNode);

  vm.elements().appendDynamicNode(value);
});
