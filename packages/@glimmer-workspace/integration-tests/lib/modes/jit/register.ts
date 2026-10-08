import GlimmerComponent from '@glimmer/component';
import type { Nullable, TemplateFactory } from '@glimmer/interfaces';
import { setComponentTemplate } from '@glimmer/manager';
import { templateOnlyComponent } from '@glimmer/runtime';

import type { ComponentKind, ComponentTypes } from '../../components';
import type { UserHelper } from '../../helpers';
import type { TestModifierConstructor } from '../../modifiers';
import type { TestOwner } from '../owner';

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

export function registerHelper(owner: TestOwner, name: string, helper: UserHelper) {
  registerHelperDefinition(owner, name, defineUserHelper(helper));
}

export function registerHelperDefinition(owner: TestOwner, name: string, definition: object) {
  owner.register(`helper:${name}`, definition, { instantiate: false });
}

export function registerModifier(
  owner: TestOwner,
  name: string,
  ModifierClass?: TestModifierConstructor
) {
  owner.register(`modifier:${name}`, defineTestModifier(ModifierClass), { instantiate: false });
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
