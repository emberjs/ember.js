import { DEBUG } from '@glimmer/env';
import type { TemplateFactory } from '@glimmer/interfaces';

export { compile as compileTemplate } from 'ember-template-compiler';

interface CommonOptions {
  moduleName?: string;
}

interface LooseModeOptions extends CommonOptions {
  strictMode?: false;
}

interface StrictModeOptions extends CommonOptions {
  strictMode: true;
  scope: () => Record<string, unknown>;
}

// (UN)SAFETY: the public API is that people can import and use this (and indeed
// it is emitted as part of Ember's build!), so we define it as having the type
// which makes that work. However, in practice it is supplied by the build,
// *for* the build, and will *not* be present at runtime, so the actual value
// here is `undefined` in prod; in dev it is a function which throws a somewhat
// nicer error. This is janky, but... here we are.
interface PrecompileTemplate {
  (templateString: string, options?: LooseModeOptions): TemplateFactory;
  (templateString: string, options: StrictModeOptions): TemplateFactory;
}

export let precompileTemplate: PrecompileTemplate;

if (DEBUG) {
  precompileTemplate = () => {
    throw new Error(
      'Attempted to call `precompileTemplate` at runtime, but this API is meant to be used at compile time. You should use `compileTemplate` instead.'
    );
  };
}
