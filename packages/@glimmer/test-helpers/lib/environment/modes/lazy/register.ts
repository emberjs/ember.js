import LazyRuntimeResolver from './runtime-resolver';
import { ComponentKind } from '../../../interfaces';
import {
  BasicComponentFactory,
  BasicComponentManager,
  BASIC_CAPABILITIES,
} from '../../components/basic';
import {
  EmberishCurlyComponentManager,
  EmberishCurlyComponentFactory,
  CURLY_CAPABILITIES,
  EmberishCurlyComponent,
} from '../../components/emberish-curly';
import {
  EmberishGlimmerComponentManager,
  EmberishGlimmerComponent,
  EmberishGlimmerComponentFactory,
  EMBERISH_GLIMMER_CAPABILITIES,
} from '../../components/emberish-glimmer';
import {
  StaticTaglessComponentManager,
  STATIC_TAGLESS_CAPABILITIES,
} from '../../components/tagless';
import {
  Option,
  Helper as GlimmerHelper,
  ModifierManager,
  ComponentManager,
  ComponentCapabilities,
} from '@glimmer/interfaces';
import { UserHelper, HelperReference } from '../../helper';
import {
  TestModifierConstructor,
  TestModifierDefinitionState,
  TestModifierManager,
} from '../../modifier';
import { PartialDefinition } from '@glimmer/opcode-compiler';
import { preprocess } from '../../shared';
import { TestComponentDefinitionState, locatorFor } from '../../components';

const BASIC_COMPONENT_MANAGER = new BasicComponentManager();
const EMBERISH_CURLY_COMPONENT_MANAGER = new EmberishCurlyComponentManager();
const EMBERISH_GLIMMER_COMPONENT_MANAGER = new EmberishGlimmerComponentManager();
const STATIC_TAGLESS_COMPONENT_MANAGER = new StaticTaglessComponentManager();

export function registerTemplate(
  resolver: LazyRuntimeResolver,
  name: string,
  source: string
): { name: string; handle: number } {
  return { name, handle: resolver.register('template-source', name, source) };
}

export function registerBasicComponent(
  resolver: LazyRuntimeResolver,
  name: string,
  Component: BasicComponentFactory,
  layoutSource: string
): void {
  if (name.indexOf('-') !== -1) {
    throw new Error('DEPRECATED: dasherized components');
  }

  let { handle } = registerTemplate(resolver, name, layoutSource);

  registerComponent(
    resolver,
    name,
    'Basic',
    BASIC_COMPONENT_MANAGER,
    handle,
    Component,
    BASIC_CAPABILITIES
  );
}

export function registerStaticTaglessComponent(
  resolver: LazyRuntimeResolver,
  name: string,
  Component: BasicComponentFactory,
  layoutSource: string
): void {
  let { handle } = registerTemplate(resolver, name, layoutSource);

  registerComponent(
    resolver,
    name,
    'Fragment',
    STATIC_TAGLESS_COMPONENT_MANAGER,
    handle,
    Component,
    STATIC_TAGLESS_CAPABILITIES
  );
}

export function registerEmberishCurlyComponent(
  resolver: LazyRuntimeResolver,
  name: string,
  Component: Option<EmberishCurlyComponentFactory>,
  layoutSource: Option<string>
): void {
  let layout: Option<{ name: string; handle: number }> = null;

  if (layoutSource !== null) {
    layout = registerTemplate(resolver, name, layoutSource);
  }

  let handle = layout ? layout.handle : null;
  let ComponentClass = Component || EmberishCurlyComponent;

  registerComponent(
    resolver,
    name,
    'Curly',
    EMBERISH_CURLY_COMPONENT_MANAGER,
    handle,
    ComponentClass,
    CURLY_CAPABILITIES
  );
}

export function registerEmberishGlimmerComponent(
  resolver: LazyRuntimeResolver,
  name: string,
  Component: Option<EmberishGlimmerComponentFactory>,
  layoutSource: string
): void {
  if (name.indexOf('-') !== -1) {
    throw new Error('DEPRECATED: dasherized components');
  }

  let { handle } = registerTemplate(resolver, name, layoutSource);

  let ComponentClass = Component || EmberishGlimmerComponent;

  registerComponent(
    resolver,
    name,
    'Glimmer',
    EMBERISH_GLIMMER_COMPONENT_MANAGER,
    handle,
    ComponentClass,
    EMBERISH_GLIMMER_CAPABILITIES
  );
}

export function registerHelper(
  resolver: LazyRuntimeResolver,
  name: string,
  helper: UserHelper
): GlimmerHelper {
  let glimmerHelper: GlimmerHelper = args => new HelperReference(helper, args);
  resolver.register('helper', name, glimmerHelper);
  return glimmerHelper;
}

export function registerInternalHelper(
  resolver: LazyRuntimeResolver,
  name: string,
  helper: GlimmerHelper
): GlimmerHelper {
  resolver.register('helper', name, helper);
  return helper;
}

export function registerInternalModifier(
  resolver: LazyRuntimeResolver,
  name: string,
  manager: ModifierManager<unknown, unknown>,
  state: unknown
) {
  resolver.register('modifier', name, { manager, state });
}

export function registerModifier(
  resolver: LazyRuntimeResolver,
  name: string,
  ModifierClass?: TestModifierConstructor
) {
  let state = new TestModifierDefinitionState(ModifierClass);
  let manager = new TestModifierManager();
  resolver.register('modifier', name, { manager, state });
  return { manager, state };
}

export function registerPartial(
  resolver: LazyRuntimeResolver,
  name: string,
  source: string
): PartialDefinition {
  let definition = new PartialDefinition(name, preprocess(source));
  resolver.register('partial', name, definition);
  return definition;
}

export function resolveHelper(
  resolver: LazyRuntimeResolver,
  helperName: string
): Option<GlimmerHelper> {
  let handle = resolver.lookupHelper(helperName);
  return typeof handle === 'number' ? resolver.resolve<GlimmerHelper>(handle) : null;
}

export function resolvePartial(
  resolver: LazyRuntimeResolver,
  partialName: string
): Option<PartialDefinition> {
  let handle = resolver.lookupPartial(partialName);
  return typeof handle === 'number' ? resolver.resolve<PartialDefinition>(handle) : null;
}

function registerComponent(
  resolver: LazyRuntimeResolver,
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

  resolver.register('component', name, definition);
  return definition;
}
