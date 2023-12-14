import { DEBUG } from '@glimmer/env';
export let __emberTemplateCompiler;
export const compileTemplate = (...args) => {
  if (!__emberTemplateCompiler) {
    throw new Error('Attempted to call `compileTemplate` without first loading the runtime template compiler.');
  }
  return __emberTemplateCompiler.compile(...args);
};
export let precompileTemplate;
if (DEBUG) {
  precompileTemplate = () => {
    throw new Error('Attempted to call `precompileTemplate` at runtime, but this API is meant to be used at compile time. You should use `compileTemplate` instead.');
  };
}
export function __registerTemplateCompiler(c) {
  __emberTemplateCompiler = c;
}