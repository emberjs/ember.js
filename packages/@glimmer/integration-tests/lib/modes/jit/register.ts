import { TestJitRegistry } from './registry';
import {
  Option,
  Helper as GlimmerHelper,
  InternalModifierManager,
  TemplateFactory,
  ResolutionTimeConstants,
  CurriedType,
} from '@glimmer/interfaces';
import { EmberishCurlyComponent } from '../../components/emberish-curly';
import { GlimmerishComponent } from '../../components/emberish-glimmer';
import { UserHelper, createHelperRef } from '../../helpers';
import {
  TestModifierConstructor,
  TestModifierDefinitionState,
  TestModifierManager,
} from '../../modifiers';
import { ComponentKind, ComponentTypes } from '../../components';
import { CurriedValue, curry, templateOnlyComponent } from '@glimmer/runtime';
import { createTemplate } from '../../compile';
import {
  getInternalComponentManager,
  setComponentTemplate,
  setInternalHelperManager,
  setInternalModifierManager,
} from '@glimmer/manager';

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

export function registerEmberishCurlyComponent(
  registry: TestJitRegistry,
  name: string,
  Component: Option<ComponentTypes['Curly']>,
  layoutSource: Option<string>
): void {
  let ComponentClass = Component || class extends EmberishCurlyComponent {};

  registerSomeComponent(
    registry,
    name,
    layoutSource !== null ? createTemplate(layoutSource) : null,
    ComponentClass
  );
}

export function registerGlimmerishComponent(
  registry: TestJitRegistry,
  name: string,
  Component: Option<ComponentTypes['Glimmer']>,
  layoutSource: string
): void {
  if (name.indexOf('-') !== -1) {
    throw new Error('DEPRECATED: dasherized components');
  }
  let ComponentClass = Component || class extends GlimmerishComponent {};

  registerSomeComponent(registry, name, createTemplate(layoutSource), ComponentClass);
}

export function registerHelper(registry: TestJitRegistry, name: string, helper: UserHelper) {
  let state = {};
  let glimmerHelper: GlimmerHelper = (args) => createHelperRef(helper, args);
  setInternalHelperManager(glimmerHelper, state);
  registry.register('helper', name, state);
}

export function registerInternalHelper(
  registry: TestJitRegistry,
  name: string,
  helper: GlimmerHelper
) {
  let state = {};
  setInternalHelperManager(helper, state);
  registry.register('helper', name, state);
}

export function registerInternalModifier(
  registry: TestJitRegistry,
  name: string,
  manager: InternalModifierManager<unknown, object>,
  state: object
) {
  setInternalModifierManager(manager, state);
  registry.register('modifier', name, state);
}

export function registerModifier(
  registry: TestJitRegistry,
  name: string,
  ModifierClass?: TestModifierConstructor
) {
  let state = new TestModifierDefinitionState(ModifierClass);
  let manager = new TestModifierManager();
  setInternalModifierManager(manager, state);
  registry.register('modifier', name, state);
}

export function registerComponent<K extends ComponentKind>(
  registry: TestJitRegistry,
  type: K,
  name: string,
  layout: string,
  Class?: ComponentTypes[K]
): void {
  switch (type) {
    case 'Glimmer':
      registerGlimmerishComponent(registry, name, Class as ComponentTypes['Glimmer'], layout);
      break;
    case 'Curly':
      registerEmberishCurlyComponent(registry, name, Class as ComponentTypes['Curly'], layout);
      break;

    case 'Dynamic':
      registerEmberishCurlyComponent(
        registry,
        name,
        (Class as any) as typeof EmberishCurlyComponent,
        layout
      );
      break;
    case 'TemplateOnly':
      registerTemplateOnlyComponent(registry, name, layout);
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

  return curry(
    CurriedType.Component,
    constants.resolvedComponent(definition, name),
    {},
    null,
    true
  );
}
