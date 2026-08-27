import type {
  SerializedTemplateBlock,
  SerializedTemplateWithLazyBlock,
  TemplateFactory,
} from '@glimmer/interfaces';

import { ensureLegacyOps } from './syntax/legacy';
import createTemplateFactory, { type SerializedTemplateWithOps } from './template-core';

export {
  templateCacheCounters,
  type TemplateFactoryWithIdAndMeta,
  type TemplateWithIdAndReferrer,
} from './template-core';

/**
 * Accepts either a JSON block (the historical wire format) or a block whose
 * opcodes are imported objects. A JSON block needs every op, so this module
 * pulls all of them in. Build output that imports its ops must use
 * `./template-core` instead.
 */
export default function templateFactory(
  serialized: SerializedTemplateWithLazyBlock | SerializedTemplateWithOps
): TemplateFactory {
  let { block } = serialized;

  if (typeof block === 'string') {
    ensureLegacyOps();
    block = JSON.parse(block) as SerializedTemplateBlock;
  }

  return createTemplateFactory({ ...serialized, block });
}
