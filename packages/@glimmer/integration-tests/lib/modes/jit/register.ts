import { TestJitRegistry } from './registry';
import { BasicComponentManager, BasicComponent } from '../../components/basic';
import {
  BASIC_CAPABILITIES,
  STATIC_TAGLESS_CAPABILITIES,
  CURLY_CAPABILITIES,
} from '../../components/capabilities';
import {
  Option,
  Helper as GlimmerHelper,
  ModifierManager,
  ComponentManager,
  ComponentCapabilities,
  ComponentDefinition,
} from '@glimmer/interfaces';
import {
  EmberishCurlyComponent,
  EmberishCurlyComponentManager,
} from '../../components/emberish-curly';
import {
  EmberishGlimmerComponent,
  EMBERISH_GLIMMER_CAPABILITIES,
  EmberishGlimmerComponentManager,
} from '../../components/emberish-glimmer';
import { UserHelper, HelperReference } from '../../helpers';
import {
  TestModifierConstructor,
  TestModifierDefinitionState,
  TestModifierManager,
} from '../../modifiers';
import { PartialDefinition } from '@glimmer/opcode-compiler';
import TestJitRuntimeResolver from './resolver';
import { ComponentKind, ComponentTypes } from '../../components';
import { TestComponentDefinitionState } from '../../components/test-component';
import { locatorFor } from '../../locator';
import { CurriedComponentDefinition, curry } from '@glimmer/runtime';
import { preprocess } from '../../compile';
import { StaticTaglessComponentManager } from '../../components/static-tagless';

const BASIC_COMPONENT_MANAGER = new BasicComponentManager();
const EMBERISH_CURLY_COMPONENT_MANAGER = new EmberishCurlyComponentManager();
const EMBERISH_GLIMMER_COMPONENT_MANAGER = new EmberishGlimmerComponentManager();
const STATIC_TAGLESS_COMPONENT_MANAGER = new StaticTaglessComponentManager();

export function registerTemplate(
  registry: TestJitRegistry,
  name: string,
  source: string
): { name: string; handle: number } {
  return { name, handle: registry.register('template-source', name, source) };
}

export function registerBasicComponent(
  registry: TestJitRegistry,
  name: string,
  Component: ComponentTypes['Basic'],
  layoutSource: string
): void {
  if (name.indexOf('-') !== -1) {
    throw new Error('DEPRECATED: dasherized components');
  }

  let { handle } = registerTemplate(registry, name, layoutSource);

  registerSomeComponent(
    registry,
    name,
    'Basic',
    BASIC_COMPONENT_MANAGER,
    handle,
    Component,
    BASIC_CAPABILITIES
  );
}

export function registerStaticTaglessComponent(
  registry: TestJitRegistry,
  name: string,
  Component: ComponentTypes['Basic'],
  layoutSource: string
): void {
  let { handle } = registerTemplate(registry, name, layoutSource);

  registerSomeComponent(
    registry,
    name,
    'Fragment',
    STATIC_TAGLESS_COMPONENT_MANAGER,
    handle,
    Component,
    STATIC_TAGLESS_CAPABILITIES
  );
}

export function registerEmberishCurlyComponent(
  registry: TestJitRegistry,
  name: string,
  Component: Option<ComponentTypes['Curly']>,
  layoutSource: Option<string>
): void {
  let layout: Option<{ name: string; handle: number }> = null;

  if (layoutSource !== null) {
    layout = registerTemplate(registry, name, layoutSource);
  }

  let handle = layout ? layout.handle : null;
  let ComponentClass = Component || EmberishCurlyComponent;

  registerSomeComponent(
    registry,
    name,
    'Curly',
    EMBERISH_CURLY_COMPONENT_MANAGER,
    handle,
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

  let { handle } = registerTemplate(registry, name, layoutSource);

  let ComponentClass = Component || EmberishGlimmerComponent;

  registerSomeComponent(
    registry,
    name,
    'Glimmer',
    EMBERISH_GLIMMER_COMPONENT_MANAGER,
    handle,
    ComponentClass,
    EMBERISH_GLIMMER_CAPABILITIES
  );
}

export function registerHelper(
  registry: TestJitRegistry,
  name: string,
  helper: UserHelper
): GlimmerHelper {
  let glimmerHelper: GlimmerHelper = args => new HelperReference(helper, args);
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
  manager: ModifierManager<unknown, unknown>,
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
  let definition = new PartialDefinition(name, preprocess(source));
  registry.register('partial', name, definition);
  return definition;
}

export function resolveHelper(
  resolver: TestJitRuntimeResolver,
  helperName: string
): Option<GlimmerHelper> {
  let handle = resolver.lookupHelper(helperName);
  return typeof handle === 'number' ? resolver.resolve<GlimmerHelper>(handle) : null;
}

export function resolvePartial(
  resolver: TestJitRuntimeResolver,
  partialName: string
): Option<PartialDefinition> {
  let handle = resolver.lookupPartial(partialName);
  return typeof handle === 'number' ? resolver.resolve<PartialDefinition>(handle) : null;
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
        Class as typeof EmberishCurlyComponent,
        layout
      );
      break;
    case 'Basic':
    case 'Fragment':
      registerBasicComponent(registry, name, Class as typeof BasicComponent, layout);
      break;
  }
}

function registerSomeComponent(
  registry: TestJitRegistry,
  name: string,
  type: ComponentKind,
  manager: ComponentManager<unknown, unknown>,
  layout: Option<number>,
  ComponentClass: unknown,
  capabilities: ComponentCapabilities
) {
  let state: TestComponentDefinitionState = {
    name,
    type,
    layout,
    locator: locatorFor({ module: name, name: 'default' }),
    capabilities,
    ComponentClass,
  };

  let definition = {
    state,
    manager,
  };

  registry.register('component', name, definition);
  return definition;
}

export function componentHelper(
  resolver: TestJitRuntimeResolver,
  registry: TestJitRegistry,
  name: string
): Option<CurriedComponentDefinition> {
  let handle = registry.lookupComponentHandle(name);

  if (handle === null) return null;

  let spec = resolver.resolve<ComponentDefinition>(handle);
  return curry(spec);
}
