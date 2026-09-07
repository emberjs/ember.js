import type { TemplateFactory } from '@glimmer/interfaces';

import { compilable } from './compilable-template';
import templateFactory, {
  type SerializedTemplateWithOps,
  type TemplateLayouts,
} from './template-core';
import { WrappedBuilder } from './wrapped-component';

/** Layouts that compile the block in the browser. */
export const JIT_LAYOUTS: TemplateLayouts = {
  asLayout: (layout, moduleName) => compilable(layout, moduleName),
  asWrappedLayout: (layout, moduleName) => new WrappedBuilder(layout, moduleName),
};

/**
 * The template factory for blocks whose opcodes are imported objects.
 * Compiled templates reach it through `@ember/template-factory/modular`.
 */
export default function createJitTemplateFactory(
  serialized: SerializedTemplateWithOps
): TemplateFactory {
  return templateFactory(serialized, JIT_LAYOUTS);
}
