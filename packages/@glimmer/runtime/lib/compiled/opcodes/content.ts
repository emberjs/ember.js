import { Reference } from '@glimmer/reference';
import { Tag, isConstTagged } from '@glimmer/validator';
import {
  check,
  CheckString,
  CheckSafeString,
  CheckNode,
  CheckDocumentFragment,
} from '@glimmer/debug';

import { APPEND_OPCODES } from '../../opcodes';
import { ConditionalReference } from '../../references';
import {
  isCurriedComponentDefinition,
  isComponentDefinition,
} from '../../component/curried-component';
import { CheckPathReference } from './-debug-strip';
import { isEmpty, isSafeString, isFragment, isNode, shouldCoerce } from '../../dom/normalize';
import DynamicTextContent from '../../vm/content/text';
import { ContentType, Op, Dict, Maybe } from '@glimmer/interfaces';

export class IsCurriedComponentDefinitionReference extends ConditionalReference {
  static create(inner: Reference<unknown>): IsCurriedComponentDefinitionReference {
    return new ConditionalReference(inner, isCurriedComponentDefinition);
  }
}

export class ContentTypeReference implements Reference<ContentType> {
  public tag: Tag;

  constructor(private inner: Reference<unknown>) {
    this.tag = inner.tag;
  }

  value(): ContentType {
    let value = this.inner.value() as Maybe<Dict>;

    if (shouldCoerce(value)) {
      return ContentType.String;
    } else if (isComponentDefinition(value)) {
      return ContentType.Component;
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
}

APPEND_OPCODES.add(Op.AppendHTML, vm => {
  let reference = check(vm.stack.pop(), CheckPathReference);

  let rawValue = reference.value();
  let value = isEmpty(rawValue) ? '' : String(rawValue);

  vm.elements().appendDynamicHTML(value);
});

APPEND_OPCODES.add(Op.AppendSafeHTML, vm => {
  let reference = check(vm.stack.pop(), CheckPathReference);

  let rawValue = check(reference.value(), CheckSafeString).toHTML();
  let value = isEmpty(rawValue) ? '' : check(rawValue, CheckString);

  vm.elements().appendDynamicHTML(value);
});

APPEND_OPCODES.add(Op.AppendText, vm => {
  let reference = check(vm.stack.pop(), CheckPathReference);

  let rawValue = reference.value();
  let value = isEmpty(rawValue) ? '' : String(rawValue);

  let node = vm.elements().appendDynamicText(value);

  if (!isConstTagged(reference)) {
    vm.updateWith(new DynamicTextContent(node, reference, value));
  }
});

APPEND_OPCODES.add(Op.AppendDocumentFragment, vm => {
  let reference = check(vm.stack.pop(), CheckPathReference);

  let value = check(reference.value(), CheckDocumentFragment);

  vm.elements().appendDynamicFragment(value);
});

APPEND_OPCODES.add(Op.AppendNode, vm => {
  let reference = check(vm.stack.pop(), CheckPathReference);

  let value = check(reference.value(), CheckNode);

  vm.elements().appendDynamicNode(value);
});
