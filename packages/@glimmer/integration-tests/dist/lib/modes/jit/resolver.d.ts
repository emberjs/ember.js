import { JitRuntimeResolver, TemplateMeta, AnnotatedModuleLocator, Option, ComponentDefinition, Template, Invocation } from '@glimmer/interfaces';
import { LookupType, TestJitRegistry } from './registry';
export default class TestJitRuntimeResolver implements JitRuntimeResolver {
    readonly registry: TestJitRegistry;
    lookup(type: LookupType, name: string, referrer?: Option<TemplateMeta<AnnotatedModuleLocator>>): Option<number>;
    getInvocation(_locator: TemplateMeta<AnnotatedModuleLocator>): Invocation;
    compilable(locator: TemplateMeta<AnnotatedModuleLocator>): Template;
    lookupHelper(name: string, referrer?: Option<TemplateMeta<AnnotatedModuleLocator>>): Option<number>;
    lookupModifier(name: string, referrer?: Option<TemplateMeta<AnnotatedModuleLocator>>): Option<number>;
    lookupComponent(name: string, referrer: Option<TemplateMeta<AnnotatedModuleLocator>>): Option<ComponentDefinition>;
    lookupPartial(name: string, referrer?: Option<TemplateMeta<AnnotatedModuleLocator>>): Option<number>;
    resolve<T>(handle: number): T;
}
//# sourceMappingURL=resolver.d.ts.map