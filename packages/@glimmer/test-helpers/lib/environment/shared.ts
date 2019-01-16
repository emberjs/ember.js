import {
  Dict,
  Option,
  SerializedTemplateWithLazyBlock,
  AnnotatedModuleLocator,
  TemplateMeta,
  Template,
} from '@glimmer/interfaces';
import { precompile, PrecompileOptions } from '@glimmer/compiler';
import { templateFactory, TemplateFactory } from '@glimmer/opcode-compiler';
import { templateMeta } from '@glimmer/util';

export type Attrs = Dict<any>;
export type AttrsDiff = { oldAttrs: Option<Attrs>; newAttrs: Attrs };

export function createTemplate<Locator>(
  templateSource: string,
  options?: PrecompileOptions
): TemplateFactory<Locator> {
  let wrapper: SerializedTemplateWithLazyBlock<Locator> = JSON.parse(
    precompile(templateSource, options)
  );
  return templateFactory<Locator>(wrapper);
}

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
  meta?: AnnotatedModuleLocator
): Template<TemplateMeta<AnnotatedModuleLocator>> {
  let wrapper = JSON.parse(precompile(template));
  let factory = templateFactory<AnnotatedModuleLocator>(wrapper);
  return factory.create(templateMeta(meta || DEFAULT_TEST_META));
}
