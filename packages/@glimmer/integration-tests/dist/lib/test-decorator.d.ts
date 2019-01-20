export declare type DeclaredComponentKind = 'glimmer' | 'curly' | 'dynamic' | 'basic' | 'fragment';
export interface ComponentTestMeta {
    kind?: DeclaredComponentKind;
    skip?: boolean | DeclaredComponentKind;
}
export declare function test(meta: ComponentTestMeta): MethodDecorator;
export declare function test(_target: Object | ComponentTestMeta, _name?: string, descriptor?: PropertyDescriptor): PropertyDescriptor | void;
//# sourceMappingURL=test-decorator.d.ts.map