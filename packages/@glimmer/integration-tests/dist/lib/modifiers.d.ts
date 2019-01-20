import { SimpleElement } from '@simple-dom/interface';
import { Dict, ModifierManager, GlimmerTreeChanges, Destroyable, DynamicScope, VMArguments, CapturedArguments } from '@glimmer/interfaces';
import { Tag } from '@glimmer/reference';
export interface TestModifierConstructor {
    new (): TestModifierInstance;
}
export interface TestModifierInstance {
    element?: SimpleElement;
    didInsertElement(_params: unknown[], _hash: Dict<unknown>): void;
    didUpdate(_params: unknown[], _hash: Dict<unknown>): void;
    willDestroyElement(): void;
}
export declare class TestModifierDefinitionState {
    instance?: TestModifierInstance;
    constructor(Klass?: TestModifierConstructor);
}
export declare class TestModifierManager implements ModifierManager<TestModifier, TestModifierDefinitionState> {
    installedElements: SimpleElement[];
    updatedElements: SimpleElement[];
    destroyedModifiers: TestModifier[];
    create(element: SimpleElement, state: TestModifierDefinitionState, args: VMArguments, _dynamicScope: DynamicScope, dom: GlimmerTreeChanges): TestModifier;
    getTag({ args: { tag } }: TestModifier): Tag;
    install({ element, args, dom, state }: TestModifier): void;
    update({ element, args, dom, state }: TestModifier): void;
    getDestructor(modifier: TestModifier): Destroyable;
}
export declare class TestModifier {
    element: SimpleElement;
    state: TestModifierDefinitionState;
    args: CapturedArguments;
    dom: GlimmerTreeChanges;
    constructor(element: SimpleElement, state: TestModifierDefinitionState, args: CapturedArguments, dom: GlimmerTreeChanges);
}
//# sourceMappingURL=modifiers.d.ts.map