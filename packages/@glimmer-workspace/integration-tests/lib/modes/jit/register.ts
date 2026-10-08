import GlimmerComponent from '@glimmer/component';
import type { Nullable, ResolutionTimeConstants, TemplateFactory } from '@glimmer/interfaces';
import type { CurriedValue } from '@glimmer/runtime';
import { CURRIED_COMPONENT } from '@glimmer/constants';
import { getInternalComponentManager, setComponentTemplate } from '@glimmer/manager';
import { curry, templateOnlyComponent } from '@glimmer/runtime';

import type { ComponentKind, ComponentTypes } from '../../components';
import type { UserHelper } from '../../helpers';
import type { TestModifierConstructor } from '../../modifiers';
import type { TestJitRegistry } from './registry';

import { createTemplate } from '../../compile';
import { defineUserHelper } from '../../helpers';
import { defineTestModifier } from '../../modifiers';

export function registerTemplateOnlyComponent(
  registry: TestJitRegistry,
  name: string,
  layoutSource: string
): void {
  registerSomeComponent(
    registry,
    name,
    createTemplate(layoutSource),
    templateOnlyComponent(undefined, name)
  );
}

export function registerGlimmerishComponent(
  registry: TestJitRegistry,
  name: string,
  Component: Nullable<ComponentTypes['Glimmer']>,
  layoutSource: Nullable<string>
): void {
  if (name.indexOf('-') !== -1) {
    throw new Error('DEPRECATED: dasherized components');
  }
  let ComponentClass = Component || class extends GlimmerComponent {};

  registerSomeComponent(registry, name, createTemplate(layoutSource), ComponentClass);
}

export function registerHelper(registry: TestJitRegistry, name: string, helper: UserHelper) {
  registry.register('helper', name, defineUserHelper(helper));
}

export function registerModifier(
  registry: TestJitRegistry,
  name: string,
  ModifierClass?: TestModifierConstructor
) {
  registry.register('modifier', name, defineTestModifier(ModifierClass));
}

export function registerComponent<K extends ComponentKind>(
  registry: TestJitRegistry,
  type: K,
  name: string,
  layout: Nullable<string>,
  Class?: ComponentTypes[K]
): void {
  switch (type) {
    case 'Glimmer':
      registerGlimmerishComponent(registry, name, Class as ComponentTypes['Glimmer'], layout);
      break;
    case 'TemplateOnly':
      registerTemplateOnlyComponent(registry, name, layout ?? '');
      break;
  }
}

function registerSomeComponent(
  registry: TestJitRegistry,
  name: string,
  templateFactory: TemplateFactory | null,
  ComponentClass: object
) {
  if (templateFactory) {
    setComponentTemplate(templateFactory, ComponentClass);
  }

  let manager = getInternalComponentManager(ComponentClass);

  let definition = {
    name,
    state: ComponentClass,
    manager,
    template: null,
  };

  registry.register('component', name, definition);
  return definition;
}

export function componentHelper(
  registry: TestJitRegistry,
  name: string,
  constants: ResolutionTimeConstants
): CurriedValue | null {
  let definition = registry.lookupComponent(name);

  if (definition === null) return null;

  return curry(CURRIED_COMPONENT, constants.resolvedComponent(definition, name), {}, null, true);
}
