export { compilable, compileStatements } from './lib/compilable-template';
export { debugCompiler } from './lib/compiler';
export * from './lib/opcode-builder/context';
export * from './lib/opcode-builder/delegate';
export {
  InvokeStaticBlock as invokeStaticBlock,
  InvokeStaticBlockWithStack as invokeStaticBlockWithStack,
} from './lib/opcode-builder/helpers/blocks';
export { meta } from './lib/opcode-builder/helpers/shared';
export {
  CAUTIOUS_APPEND,
  CAUTIOUS_NON_DYNAMIC_APPEND,
  MAIN,
  TRUSTING_APPEND,
  TRUSTING_NON_DYNAMIC_APPEND,
} from './lib/opcode-builder/helpers/stdlib';
export { StdlibImpl } from './lib/opcode-builder/stdlib';
export * from './lib/program-context';
export {
  templateCacheCounters,
  default as templateFactory,
  type TemplateFactoryWithIdAndMeta,
  type TemplateWithIdAndReferrer,
} from './lib/template';
export { EMPTY_BLOCKS } from './lib/utils';
export { WrappedBuilder } from './lib/wrapped-component';
