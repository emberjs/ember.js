import { precompile as rawPrecompile, PrecompileOptions } from '@glimmer/compiler';
import {
  AnnotatedModuleLocator,
  Environment,
  SerializedTemplateWithLazyBlock,
  Template,
  TemplateFactory,
  WireFormat,
} from '@glimmer/interfaces';
import { templateFactory } from '@glimmer/opcode-compiler';
import { assign } from '@glimmer/util';

export const DEFAULT_TEST_META: AnnotatedModuleLocator = Object.freeze({
  kind: 'unknown',
  meta: {},
  module: 'some/template',
  name: 'default',
});

// TODO: This fundamentally has little to do with testing and
// most tests should just use a more generic preprocess, extracted
// out of the test environment.
export function preprocess(
  template: string,
  meta?: AnnotatedModuleLocator,
  options?: PrecompileOptions
): Template<AnnotatedModuleLocator> {
  let wrapper = JSON.parse(rawPrecompile(template, options));
  let factory = templateFactory<AnnotatedModuleLocator>(wrapper);
  return factory.create(meta || DEFAULT_TEST_META);
}

export function createTemplate(
  templateSource: string,
  options?: PrecompileOptions
): TemplateFactory {
  let wrapper: SerializedTemplateWithLazyBlock<AnnotatedModuleLocator> = JSON.parse(
    rawPrecompile(templateSource, options)
  );

  let factory = templateFactory<AnnotatedModuleLocator>(wrapper);

  return (owner: unknown) => factory.create(owner);
}

export interface TestCompileOptions extends PrecompileOptions {
  env: Environment;
}

export function precompile(
  string: string,
  options?: TestCompileOptions
): WireFormat.SerializedTemplate<unknown> {
  let wrapper: WireFormat.SerializedTemplateWithLazyBlock<unknown> = JSON.parse(
    rawPrecompile(string, options)
  );

  return assign(wrapper, { block: JSON.parse(wrapper.block) });
}
