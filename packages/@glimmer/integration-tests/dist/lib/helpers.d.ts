import { Dict, VMArguments } from '@glimmer/interfaces';
import { Tag, VersionedPathReference, Reference } from '@glimmer/reference';
export declare type UserHelper = (args: ReadonlyArray<unknown>, named: Dict<unknown>) => unknown;
export declare class HelperReference implements VersionedPathReference<unknown> {
    private helper;
    private args;
    tag: Tag;
    constructor(helper: UserHelper, args: VMArguments);
    value(): unknown;
    get(prop: string): SimplePathReference;
}
export declare class SimplePathReference<T = unknown> implements VersionedPathReference<T> {
    private parent;
    private property;
    tag: Tag;
    constructor(parent: Reference<T>, property: string);
    value(): T;
    get(prop: string): VersionedPathReference;
}
//# sourceMappingURL=helpers.d.ts.map