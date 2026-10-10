import GlimmerComponent from '@glimmer/component';
import type { Nullable, ResolutionTimeConstants, TemplateFactory } from '@glimmer/interfaces';
import type { CurriedValue } from '@glimmer/runtime';
import { CURRIED_COMPONENT } from '@glimmer/constants';
import { setComponentTemplate } from '@glimmer/manager';
import { curry, templateOnlyComponent } from '@glimmer/runtime';

import type { ComponentKind, ComponentTypes } from '../../components';
import type { UserHelper } from '../../helpers';
import type { TestModifierConstructor } from '../../modifiers';
import type { TestOwner } from '../owner';
import type { TestJitRegistry } from './registry';
import type { TestJitRuntimeResolver } from './resolver';

import { createTemplate } from '../../compile';
import { defineUserHelper } from '../../helpers';
import { defineTestModifier } from '../../modifiers';

export function registerTemplateOnlyComponent(
  owner: TestOwner,
  name: string,
  layoutSource: string
): void {
  registerSomeComponent(
    owner,
    name,
    createTemplate(layoutSource),
    templateOnlyComponent(undefined, name)
  );
}

export function registerGlimmerishComponent(
  owner: TestOwner,
  name: string,
  Component: Nullable<ComponentTypes['Glimmer']>,
  layoutSource: Nullable<string>
): void {
  if (name.indexOf('-') !== -1) {
    throw new Error('DEPRECATED: dasherized components');
  }
  let ComponentClass = Component || class extends GlimmerComponent {};

  registerSomeComponent(owner, name, createTemplate(layoutSource), ComponentClass);
}

/**
 * A Glimmer component for the curly invocation kinds (`{{#test-component}}`,
 * `{{component this.componentName}}`), whose names may be dasherized.
 */
export function registerCurlyInvokedComponent(
  owner: TestOwner,
  name: string,
  Component: Nullable<ComponentTypes['Curly']>,
  layoutSource: Nullable<string>
): void {
  let ComponentClass = Component || class extends GlimmerComponent {};

  registerSomeComponent(owner, name, createTemplate(layoutSource), ComponentClass);
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
  owner: TestOwner,
  type: K,
  name: string,
  layout: Nullable<string>,
  Class?: ComponentTypes[K]
): void {
  switch (type) {
    case 'Glimmer':
      registerGlimmerishComponent(owner, name, Class as ComponentTypes['Glimmer'], layout);
      break;
    case 'Curly':
    case 'Dynamic':
      registerCurlyInvokedComponent(owner, name, Class as ComponentTypes['Curly'], layout);
      break;
    case 'TemplateOnly':
      registerTemplateOnlyComponent(owner, name, layout ?? '');
      break;
  }
}

function registerSomeComponent(
  owner: TestOwner,
  name: string,
  templateFactory: TemplateFactory | null,
  ComponentClass: object
) {
  if (templateFactory) {
    setComponentTemplate(templateFactory, ComponentClass);
  }

  owner.register(`component:${name}`, ComponentClass, { instantiate: false });
}

export function componentHelper(
  resolver: TestJitRuntimeResolver,
  owner: TestOwner,
  name: string,
  constants: ResolutionTimeConstants
): CurriedValue | null {
  let definition = resolver.lookupComponent(name, owner);

  if (definition === null) return null;

  return curry(CURRIED_COMPONENT, constants.resolvedComponent(definition, name), {}, null, true);
}
