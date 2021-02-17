export * from './lib/program-context';

export { debugCompiler } from './lib/compiler';

export { compileStatements, compilable } from './lib/compilable-template';

export * from './lib/opcode-builder/context';
export * from './lib/opcode-builder/delegate';

export {
  InvokeStaticBlockWithStack as invokeStaticBlockWithStack,
  InvokeStaticBlock as invokeStaticBlock,
} from './lib/opcode-builder/helpers/blocks';
export { compileStd } from './lib/opcode-builder/helpers/stdlib';
export { meta } from './lib/opcode-builder/helpers/shared';

export { StdLib } from './lib/opcode-builder/stdlib';

export { PartialDefinitionImpl } from './lib/partial-template';

export {
  default as templateFactory,
  templateCacheCounters,
  TemplateFactoryWithIdAndMeta,
  TemplateWithIdAndReferrer,
} from './lib/template';

export { WrappedBuilder } from './lib/wrapped-component';

export { EMPTY_BLOCKS } from './lib/utils';
