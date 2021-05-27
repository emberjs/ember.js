export let action: MethodDecorator;

// NOTE: The internal version of computed is TypeScript.
// However, it is more permissive than we want.
export function computed(...dependentKeys: string[]): MethodDecorator;

export { default } from '@ember/-internals/runtime/types/index';
