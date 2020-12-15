import { isConstRef, valueForRef } from '@glimmer/reference';
import {
  check,
  CheckString,
  CheckSafeString,
  CheckNode,
  CheckDocumentFragment,
} from '@glimmer/debug';

import { APPEND_OPCODES } from '../../opcodes';
import { isCurriedComponentDefinition } from '../../component/curried-component';
import { CheckReference } from './-debug-strip';
import { isEmpty, isSafeString, isFragment, isNode, shouldCoerce } from '../../dom/normalize';
import DynamicTextContent from '../../vm/content/text';
import { ContentType, Op } from '@glimmer/interfaces';
import { AssertFilter } from './vm';
import { hasInternalComponentManager, hasInternalHelperManager } from '@glimmer/manager';
import { DEBUG } from '@glimmer/env';
import { isCurriedHelperDefinition } from '../../helpers/curried-helper';

function toContentType(value: unknown) {
  if (shouldCoerce(value)) {
    return ContentType.String;
  } else if (isCurriedComponentDefinition(value) || hasInternalComponentManager(value as object)) {
    return ContentType.Component;
  } else if (isCurriedHelperDefinition(value) || hasInternalHelperManager(value as object)) {
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
  if (typeof value !== 'function' && (typeof value !== 'object' || value === null)) {
    return ContentType.String;
  }

  if (isCurriedComponentDefinition(value) || hasInternalComponentManager(value as object)) {
    return ContentType.Component;
  } else {
    if (DEBUG && !isCurriedHelperDefinition(value) && !hasInternalHelperManager(value as object)) {
      throw new Error(
        `Attempted use a dynamic value as a component or helper, but that value did not have an associated component or helper manager. The value was: ${value}`
      );
    }

    return ContentType.Helper;
  }
}

APPEND_OPCODES.add(Op.ContentType, (vm) => {
  let reference = check(vm.stack.peek(), CheckReference);

  vm.stack.pushSmallInt(toContentType(valueForRef(reference)));

  if (!isConstRef(reference)) {
    vm.updateWith(new AssertFilter(reference, toContentType));
  }
});

APPEND_OPCODES.add(Op.DynamicContentType, (vm) => {
  let reference = check(vm.stack.peek(), CheckReference);

  vm.stack.pushSmallInt(toDynamicContentType(valueForRef(reference)));

  if (!isConstRef(reference)) {
    vm.updateWith(new AssertFilter(reference, toDynamicContentType));
  }
});

APPEND_OPCODES.add(Op.AppendHTML, (vm) => {
  let reference = check(vm.stack.popJs(), CheckReference);

  let rawValue = valueForRef(reference);
  let value = isEmpty(rawValue) ? '' : String(rawValue);

  vm.elements().appendDynamicHTML(value);
});

APPEND_OPCODES.add(Op.AppendSafeHTML, (vm) => {
  let reference = check(vm.stack.popJs(), CheckReference);

  let rawValue = check(valueForRef(reference), CheckSafeString).toHTML();
  let value = isEmpty(rawValue) ? '' : check(rawValue, CheckString);

  vm.elements().appendDynamicHTML(value);
});

APPEND_OPCODES.add(Op.AppendText, (vm) => {
  let reference = check(vm.stack.popJs(), CheckReference);

  let rawValue = valueForRef(reference);
  let value = isEmpty(rawValue) ? '' : String(rawValue);

  let node = vm.elements().appendDynamicText(value);

  if (!isConstRef(reference)) {
    vm.updateWith(new DynamicTextContent(node, reference, value));
  }
});

APPEND_OPCODES.add(Op.AppendDocumentFragment, (vm) => {
  let reference = check(vm.stack.popJs(), CheckReference);

  let value = check(valueForRef(reference), CheckDocumentFragment);

  vm.elements().appendDynamicFragment(value);
});

APPEND_OPCODES.add(Op.AppendNode, (vm) => {
  let reference = check(vm.stack.popJs(), CheckReference);

  let value = check(valueForRef(reference), CheckNode);

  vm.elements().appendDynamicNode(value);
});
