import type {
  CapturedPositionalArguments,
  Environment,
  ModifierDefinition,
  ModifierDefinitionState,
  ModifierInstance,
  Nullable,
  Owner,
  UpdatingOpcode,
  UpdatingVM,
} from '@glimmer/interfaces';
import type { Reference } from '@glimmer/reference';
import type { Revision, Tag } from '@glimmer/validator';
import {
  CURRIED_MODIFIER,
  VM_CLOSE_ELEMENT_OP,
  VM_COMMENT_OP,
  VM_DYNAMIC_ATTR_OP,
  VM_DYNAMIC_MODIFIER_OP,
  VM_FLUSH_ELEMENT_OP,
  VM_MODIFIER_OP,
  VM_OPEN_DYNAMIC_ELEMENT_OP,
  VM_OPEN_ELEMENT_OP,
  VM_POP_REMOTE_ELEMENT_OP,
  VM_PUSH_REMOTE_ELEMENT_OP,
  VM_STATIC_ATTR_OP,
  VM_TEXT_OP,
} from '@glimmer/constants';
import {
  check,
  CheckElement,
  CheckMaybe,
  CheckNode,
  CheckNullable,
  CheckString,
} from '@glimmer/debug';
import { debugToString, expect } from '@glimmer/debug-util';
import { associateDestroyableChild, destroy, registerDestructor } from '@glimmer/destroyable';
import { getInternalModifierManager } from '@glimmer/manager';
import { createComputeRef, isConstRef, valueForRef } from '@glimmer/reference';
import { isObject } from '@glimmer/util';
import { consumeTag, CURRENT_TAG, validateTag, valueForTag } from '@glimmer/validator';
import { $t0 } from '@glimmer/vm';

import type { CurriedValue } from '../../curried-value';
import type { DynamicAttribute } from '../../vm/attributes/dynamic';

import { isCurriedType, resolveCurriedValue } from '../../curried-value';
import { APPEND_OPCODES } from '../../opcodes';
import { createCapturedArgs } from '../../vm/arguments';
import { CheckArguments, CheckOperations, CheckReference } from './-debug-strip';
import { Assert } from './vm';

APPEND_OPCODES.add(VM_TEXT_OP, (vm, { op1: text }) => {
  vm.tree().appendText(vm.constants.getValue(text));
});

APPEND_OPCODES.add(VM_COMMENT_OP, (vm, { op1: text }) => {
  vm.tree().appendComment(vm.constants.getValue(text));
});

APPEND_OPCODES.add(VM_OPEN_ELEMENT_OP, (vm, { op1: tag }) => {
  vm.tree().openElement(vm.constants.getValue(tag));
});

APPEND_OPCODES.add(VM_OPEN_DYNAMIC_ELEMENT_OP, (vm) => {
  let tagName = check(valueForRef(check(vm.stack.pop(), CheckReference)), CheckString);
  vm.tree().openElement(tagName);
});

APPEND_OPCODES.add(VM_PUSH_REMOTE_ELEMENT_OP, (vm) => {
  let elementRef = check(vm.stack.pop(), CheckReference);
  let insertBeforeRef = check(vm.stack.pop(), CheckReference);
  let guidRef = check(vm.stack.pop(), CheckReference);

  let element = check(valueForRef(elementRef), CheckElement);
  let insertBefore = check(valueForRef(insertBeforeRef), CheckMaybe(CheckNullable(CheckNode)));
  let guid = valueForRef(guidRef) as string;

  if (!isConstRef(elementRef)) {
    vm.updateWith(new Assert(elementRef));
  }

  if (insertBefore !== undefined && !isConstRef(insertBeforeRef)) {
    vm.updateWith(new Assert(insertBeforeRef));
  }

  let block = vm.tree().pushRemoteElement(element, guid, insertBefore);
  if (block) vm.associateDestroyable(block);

  if (vm.env.debugRenderTree !== undefined) {
    // Note that there is nothing to update – when the args for an
    // {{#in-element}} changes it gets torn down and a new one is
    // re-created/rendered in its place (see the `Assert`s above)
    let args = createCapturedArgs(
      insertBefore === undefined ? {} : { insertBefore: insertBeforeRef },
      [elementRef]
    );

    vm.env.debugRenderTree.create(block, {
      type: 'keyword',
      name: 'in-element',
      args,
      instance: null,
    });

    registerDestructor(block, () => {
      vm.env.debugRenderTree?.willDestroy(block);
    });
  }
});

APPEND_OPCODES.add(VM_POP_REMOTE_ELEMENT_OP, (vm) => {
  let bounds = vm.tree().popRemoteElement();

  if (vm.env.debugRenderTree !== undefined) {
    // The RemoteLiveBlock is also its bounds
    vm.env.debugRenderTree.didRender(bounds, bounds);
  }
});

APPEND_OPCODES.add(VM_FLUSH_ELEMENT_OP, (vm) => {
  let operations = check(vm.fetchValue($t0), CheckOperations);
  let modifiers: Nullable<ModifierInstance[]> = null;

  if (operations) {
    modifiers = operations.flush(vm);
    vm.loadValue($t0, null);
  }

  vm.tree().flushElement(modifiers);
});

APPEND_OPCODES.add(VM_CLOSE_ELEMENT_OP, (vm) => {
  let modifiers = vm.tree().closeElement();

  if (modifiers !== null) {
    modifiers.forEach((modifier) => {
      vm.env.scheduleInstallModifier(modifier);
      const d = modifier.manager.getDestroyable(modifier.state);

      if (d !== null) {
        vm.associateDestroyable(d);
      }
    });
  }
});

APPEND_OPCODES.add(VM_MODIFIER_OP, (vm, { op1: handle }) => {
  if (vm.env.isInteractive === false) {
    return;
  }

  let owner = vm.getOwner();
  let args = check(vm.stack.pop(), CheckArguments);
  let definition = vm.constants.getValue<ModifierDefinition>(handle);

  let { manager } = definition;

  let { constructing } = vm.tree();

  let capturedArgs = args.capture();
  let state = manager.create(
    owner,
    expect(constructing, 'BUG: ElementModifier could not find the element it applies to'),
    definition.state,
    capturedArgs
  );

  let instance: ModifierInstance = {
    manager,
    state,
    definition,
  };

  let operations = expect(
    check(vm.fetchValue($t0), CheckOperations),
    'BUG: ElementModifier could not find operations to append to'
  );

  operations.addModifier(vm, instance, capturedArgs);

  let tag = manager.getTag(state);

  if (tag !== null) {
    consumeTag(tag);
    return vm.updateWith(new UpdateModifierOpcode(tag, instance));
  }
});

APPEND_OPCODES.add(VM_DYNAMIC_MODIFIER_OP, (vm) => {
  if (vm.env.isInteractive === false) {
    return;
  }

  let { stack } = vm;
  let ref = check(stack.pop(), CheckReference);
  let args = check(stack.pop(), CheckArguments).capture();
  let { positional: outerPositional, named: outerNamed } = args;

  let { constructing } = vm.tree();
  let initialOwner = vm.getOwner();

  let instanceRef = createComputeRef(() => {
    let value = valueForRef(ref);
    let owner: Owner;

    if (!isObject(value)) {
      return;
    }

    let hostDefinition: CurriedValue | ModifierDefinitionState;

    if (isCurriedType(value, CURRIED_MODIFIER)) {
      let {
        definition: resolvedDefinition,
        owner: curriedOwner,
        positional,
        named,
      } = resolveCurriedValue(value);

      hostDefinition = resolvedDefinition;
      owner = curriedOwner;

      if (positional !== undefined) {
        args.positional = positional.concat(outerPositional) as CapturedPositionalArguments;
      }

      if (named !== undefined) {
        args.named = Object.assign({}, ...named, outerNamed);
      }
    } else {
      hostDefinition = value;
      owner = initialOwner;
    }

    let manager = getInternalModifierManager(hostDefinition, true);

    if (manager === null) {
      if (import.meta.env.DEV) {
        throw new Error(
          `Expected a dynamic modifier definition, but received an object or function that did not have a modifier manager associated with it. The dynamic invocation was \`{{${
            ref.debugLabel
          }}}\`, and the incorrect definition is the value at the path \`${
            ref.debugLabel
          }\`, which was: ${debugToString?.(hostDefinition)}`
        );
      } else {
        throw new Error('BUG: modifier manager expected');
      }
    }

    let definition = {
      resolvedName: null,
      manager,
      state: hostDefinition,
    };

    let state = manager.create(
      owner,
      expect(constructing, 'BUG: ElementModifier could not find the element it applies to'),
      definition.state,
      args
    );

    return {
      manager,
      state,
      definition,
    };
  });

  let instance = valueForRef(instanceRef);
  let tag = null;

  if (instance !== undefined) {
    let operations = expect(
      check(vm.fetchValue($t0), CheckOperations),
      'BUG: ElementModifier could not find operations to append to'
    );

    operations.addModifier(vm, instance, args);

    tag = instance.manager.getTag(instance.state);

    if (tag !== null) {
      consumeTag(tag);
    }
  }

  if (!isConstRef(ref) || tag) {
    return vm.updateWith(new UpdateDynamicModifierOpcode(tag, instance, instanceRef));
  }
});

export class UpdateModifierOpcode implements UpdatingOpcode {
  private lastUpdated: Revision;

  constructor(
    private tag: Tag,
    private modifier: ModifierInstance
  ) {
    this.lastUpdated = valueForTag(tag);
  }

  evaluate(vm: UpdatingVM) {
    let { modifier, tag, lastUpdated } = this;

    consumeTag(tag);

    if (!validateTag(tag, lastUpdated)) {
      vm.env.scheduleUpdateModifier(modifier);
      this.lastUpdated = valueForTag(tag);
    }
  }
}

export class UpdateDynamicModifierOpcode implements UpdatingOpcode {
  private lastUpdated: Revision;

  constructor(
    private tag: Tag | null,
    private instance: ModifierInstance | undefined,
    private instanceRef: Reference<ModifierInstance | undefined>
  ) {
    this.lastUpdated = valueForTag(tag ?? CURRENT_TAG);
  }

  evaluate(vm: UpdatingVM) {
    let { tag, lastUpdated, instance, instanceRef } = this;

    let newInstance = valueForRef(instanceRef);

    if (newInstance !== instance) {
      if (instance !== undefined) {
        let destroyable = instance.manager.getDestroyable(instance.state);

        if (destroyable !== null) {
          destroy(destroyable);
        }
      }

      if (newInstance !== undefined) {
        let { manager, state } = newInstance;
        let destroyable = manager.getDestroyable(state);

        if (destroyable !== null) {
          associateDestroyableChild(this, destroyable);
        }

        tag = manager.getTag(state);

        if (tag !== null) {
          this.lastUpdated = valueForTag(tag);
        }

        this.tag = tag;
        vm.env.scheduleInstallModifier(newInstance);
      }

      this.instance = newInstance;
    } else if (tag !== null && !validateTag(tag, lastUpdated)) {
      vm.env.scheduleUpdateModifier(instance!);
      this.lastUpdated = valueForTag(tag);
    }

    if (tag !== null) {
      consumeTag(tag);
    }
  }
}

APPEND_OPCODES.add(VM_STATIC_ATTR_OP, (vm, { op1: _name, op2: _value, op3: _namespace }) => {
  let name = vm.constants.getValue<string>(_name);
  let value = vm.constants.getValue<string>(_value);
  let namespace = _namespace ? vm.constants.getValue<string>(_namespace) : null;

  vm.tree().setStaticAttribute(name, value, namespace);
});

APPEND_OPCODES.add(VM_DYNAMIC_ATTR_OP, (vm, { op1: _name, op2: _trusting, op3: _namespace }) => {
  let name = vm.constants.getValue<string>(_name);
  let trusting = vm.constants.getValue<boolean>(_trusting);
  let reference = check(vm.stack.pop(), CheckReference);
  let value = valueForRef(reference);
  let namespace = _namespace ? vm.constants.getValue<string>(_namespace) : null;

  let attribute = vm.tree().setDynamicAttribute(name, value, trusting, namespace);

  if (!isConstRef(reference)) {
    vm.updateWith(new UpdateDynamicAttributeOpcode(reference, attribute, vm.env));
  }
});

export class UpdateDynamicAttributeOpcode implements UpdatingOpcode {
  private updateRef: Reference;

  constructor(reference: Reference<unknown>, attribute: DynamicAttribute, env: Environment) {
    let initialized = false;

    this.updateRef = createComputeRef(() => {
      let value = valueForRef(reference);

      if (initialized === true) {
        attribute.update(value, env);
      } else {
        initialized = true;
      }
    });

    valueForRef(this.updateRef);
  }

  evaluate() {
    valueForRef(this.updateRef);
  }
}
