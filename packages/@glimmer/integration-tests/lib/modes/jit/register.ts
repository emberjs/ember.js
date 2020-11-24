import { TestJitRegistry } from './registry';
import { TEMPLATE_ONLY_CAPABILITIES, CURLY_CAPABILITIES } from '../../components/capabilities';
import {
  Option,
  Helper as GlimmerHelper,
  InternalModifierManager,
  InternalComponentManager,
  InternalComponentCapabilities,
  PartialDefinition,
  TemplateFactory,
} from '@glimmer/interfaces';
import {
  EmberishCurlyComponent,
  EmberishCurlyComponentManager,
} from '../../components/emberish-curly';
import { GlimmerishComponent } from '../../components/emberish-glimmer';
import { UserHelper, createHelperRef } from '../../helpers';
import {
  TestModifierConstructor,
  TestModifierDefinitionState,
  TestModifierManager,
} from '../../modifiers';
import { PartialDefinitionImpl } from '@glimmer/opcode-compiler';
import { ComponentKind, ComponentTypes } from '../../components';
import { TestComponentDefinitionState } from '../../components/test-component';
import {
  CurriedComponentDefinition,
  curry,
  templateOnlyComponent,
  TemplateOnlyComponentManager,
} from '@glimmer/runtime';
import { createTemplate, preprocess } from '../../compile';
import { getInternalComponentManager, setComponentTemplate } from '@glimmer/manager';
import { expect } from '@glimmer/util';

const TEMPLATE_ONLY_COMPONENT_MANAGER = new TemplateOnlyComponentManager();
const EMBERISH_CURLY_COMPONENT_MANAGER = new EmberishCurlyComponentManager();

export function registerTemplateOnlyComponent(
  registry: TestJitRegistry,
  name: string,
  layoutSource: string
): void {
  registerSomeComponent(
    registry,
    name,
    TEMPLATE_ONLY_COMPONENT_MANAGER,
    createTemplate(layoutSource),
    templateOnlyComponent(),
    TEMPLATE_ONLY_CAPABILITIES
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
    EMBERISH_CURLY_COMPONENT_MANAGER,
    layoutSource !== null ? createTemplate(layoutSource) : null,
    ComponentClass,
    CURLY_CAPABILITIES
  );
}

export function registerEmberishGlimmerComponent(
  registry: TestJitRegistry,
  name: string,
  Component: Option<ComponentTypes['Glimmer']>,
  layoutSource: string
): void {
  if (name.indexOf('-') !== -1) {
    throw new Error('DEPRECATED: dasherized components');
  }
  let ComponentClass = Component || class extends GlimmerishComponent {};

  let manager = expect(
    getInternalComponentManager(undefined, ComponentClass),
    'TEST BUG: expected a component manager'
  );

  registerSomeComponent(
    registry,
    name,
    manager,
    createTemplate(layoutSource),
    ComponentClass,
    manager.getCapabilities({})
  );
}

export function registerHelper(
  registry: TestJitRegistry,
  name: string,
  helper: UserHelper
): GlimmerHelper {
  let glimmerHelper: GlimmerHelper = (args) => createHelperRef(helper, args.capture());
  registry.register('helper', name, glimmerHelper);
  return glimmerHelper;
}

export function registerInternalHelper(
  registry: TestJitRegistry,
  name: string,
  helper: GlimmerHelper
): GlimmerHelper {
  registry.register('helper', name, helper);
  return helper;
}

export function registerInternalModifier(
  registry: TestJitRegistry,
  name: string,
  manager: InternalModifierManager<unknown, unknown>,
  state: unknown
) {
  registry.register('modifier', name, { manager, state });
}

export function registerModifier(
  registry: TestJitRegistry,
  name: string,
  ModifierClass?: TestModifierConstructor
) {
  let state = new TestModifierDefinitionState(ModifierClass);
  let manager = new TestModifierManager();
  registry.register('modifier', name, { manager, state });
  return { manager, state };
}

export function registerPartial(
  registry: TestJitRegistry,
  name: string,
  source: string
): PartialDefinition {
  let definition = new PartialDefinitionImpl(name, preprocess(source));
  registry.register('partial', name, definition);
  return definition;
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
      registerEmberishGlimmerComponent(registry, name, Class as ComponentTypes['Glimmer'], layout);
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
  manager: InternalComponentManager<unknown, unknown>,
  templateFactory: TemplateFactory | null,
  ComponentClass: object,
  capabilities: InternalComponentCapabilities
) {
  let state: TestComponentDefinitionState = {
    name,
    capabilities,
    ComponentClass,
    template: null,
  };

  if (templateFactory) {
    setComponentTemplate(templateFactory, ComponentClass);
  }

  let definition = {
    state,
    manager,
  };

  registry.register('component', name, definition);
  return definition;
}

export function componentHelper(
  registry: TestJitRegistry,
  name: string
): Option<CurriedComponentDefinition> {
  let definition = registry.lookupComponent(name);

  if (definition === null) return null;

  return curry(definition);
}
