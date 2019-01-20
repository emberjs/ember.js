import { CompilerDelegate } from '@glimmer/bundle-compiler';
import { ComponentCapabilities, ModuleLocator, TemplateMeta } from '@glimmer/interfaces';
import { WrappedLocator } from '../../components/test-component';
import { AotCompilerRegistry } from './registry';
export interface CapabilitiesState {
    capabilities: ComponentCapabilities;
}
export default class AotCompilerDelegate implements CompilerDelegate<WrappedLocator> {
    private registry;
    constructor(registry: AotCompilerRegistry);
    hasComponentInScope(componentName: string, referrer: TemplateMeta<WrappedLocator>): boolean;
    resolveComponent(componentName: string, referrer: TemplateMeta<WrappedLocator>): ModuleLocator;
    getComponentCapabilities(meta: TemplateMeta<WrappedLocator>): ComponentCapabilities;
    hasHelperInScope(helperName: string, referrer: TemplateMeta<WrappedLocator>): boolean;
    resolveHelper(helperName: string, referrer: TemplateMeta<WrappedLocator>): ModuleLocator;
    hasModifierInScope(modifierName: string, referrer: TemplateMeta<WrappedLocator>): boolean;
    resolveModifier(modifierName: string, referrer: TemplateMeta<WrappedLocator>): ModuleLocator;
    hasPartialInScope(_partialName: string, _referrer: TemplateMeta<WrappedLocator>): boolean;
    resolvePartial(_partialName: string, _referrer: TemplateMeta<WrappedLocator>): ModuleLocator;
}
//# sourceMappingURL=compiler-delegate.d.ts.map