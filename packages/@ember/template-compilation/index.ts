import { DEBUG } from '@glimmer/env';
import type { TemplateFactory } from '@glimmer/interfaces';
import type * as ETC from 'ember-template-compiler';

// (UN)SAFETY: the public API is that people can import and use this.
// Ember's own build even emits it.
// So we define it as having the type which makes that work.
//
// However, in practice it is supplied by the build, *for* the build,
// and will *not* be present at runtime.
// The actual value here is `undefined` in prod.
// In dev it is a function which throws a somewhat nicer error.
// This is janky, but... here we are.
interface PrecompileTemplate {
  (
    templateString: string,
    options?: {
      strictMode?: boolean;
      scope?: () => Record<string, unknown>;
      moduleName?: string;
    }
  ): TemplateFactory;
}

export let __emberTemplateCompiler: undefined | typeof ETC;
export const compileTemplate: typeof ETC.compile = (...args: Parameters<typeof ETC.compile>) => {
  if (!__emberTemplateCompiler) {
    throw new Error(
      'Attempted to call `compileTemplate` without first loading the runtime template compiler.'
    );
  }
  return __emberTemplateCompiler.compile(...args);
};

export let precompileTemplate: PrecompileTemplate;

if (DEBUG) {
  precompileTemplate = () => {
    throw new Error(
      'Attempted to call `precompileTemplate` at runtime, but this API is meant to be used at compile time. You should use `compileTemplate` instead.'
    );
  };
}

export function __registerTemplateCompiler(c: typeof ETC) {
  __emberTemplateCompiler = c;
}
