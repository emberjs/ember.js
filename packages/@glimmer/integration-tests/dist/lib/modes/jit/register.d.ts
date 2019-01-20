import { TestJitRegistry } from './registry';
import { Option, Helper as GlimmerHelper, ModifierManager } from '@glimmer/interfaces';
import { UserHelper } from '../../helpers';
import { TestModifierConstructor, TestModifierDefinitionState, TestModifierManager } from '../../modifiers';
import { PartialDefinition } from '@glimmer/opcode-compiler';
import TestJitRuntimeResolver from './resolver';
import { ComponentKind, ComponentTypes } from '../../components';
import { CurriedComponentDefinition } from '@glimmer/runtime';
export declare function registerTemplate(registry: TestJitRegistry, name: string, source: string): {
    name: string;
    handle: number;
};
export declare function registerBasicComponent(registry: TestJitRegistry, name: string, Component: ComponentTypes['Basic'], layoutSource: string): void;
export declare function registerStaticTaglessComponent(registry: TestJitRegistry, name: string, Component: ComponentTypes['Basic'], layoutSource: string): void;
export declare function registerEmberishCurlyComponent(registry: TestJitRegistry, name: string, Component: Option<ComponentTypes['Curly']>, layoutSource: Option<string>): void;
export declare function registerEmberishGlimmerComponent(registry: TestJitRegistry, name: string, Component: Option<ComponentTypes['Glimmer']>, layoutSource: string): void;
export declare function registerHelper(registry: TestJitRegistry, name: string, helper: UserHelper): GlimmerHelper;
export declare function registerInternalHelper(registry: TestJitRegistry, name: string, helper: GlimmerHelper): GlimmerHelper;
export declare function registerInternalModifier(registry: TestJitRegistry, name: string, manager: ModifierManager<unknown, unknown>, state: unknown): void;
export declare function registerModifier(registry: TestJitRegistry, name: string, ModifierClass?: TestModifierConstructor): {
    manager: TestModifierManager;
    state: TestModifierDefinitionState;
};
export declare function registerPartial(registry: TestJitRegistry, name: string, source: string): PartialDefinition;
export declare function resolveHelper(resolver: TestJitRuntimeResolver, helperName: string): Option<GlimmerHelper>;
export declare function resolvePartial(resolver: TestJitRuntimeResolver, partialName: string): Option<PartialDefinition>;
export declare function registerComponent<K extends ComponentKind>(registry: TestJitRegistry, type: K, name: string, layout: string, Class?: ComponentTypes[K]): void;
export declare function componentHelper(resolver: TestJitRuntimeResolver, registry: TestJitRegistry, name: string): Option<CurriedComponentDefinition>;
//# sourceMappingURL=register.d.ts.map