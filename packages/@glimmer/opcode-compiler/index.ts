export * from './lib/interfaces';

export { ATTRS_BLOCK, CompileOptions, Macros } from './lib/syntax';

export { LazyCompilerOptions, LazyCompiler } from './lib/lazy';
export { compile } from './lib/compile';
export { AbstractCompiler, AnyAbstractCompiler, debugCompiler } from './lib/compiler';

export { CompilableBlock, CompilableProgram } from './lib/compilable-template';

export {
  LazyOpcodeBuilder,
  EagerOpcodeBuilder,
  OpcodeBuilder,
  OpcodeBuilderConstructor,
  StdOpcodeBuilder,
} from './lib/opcode-builder';

export { PartialDefinition } from './lib/partial-template';

export { default as templateFactory, TemplateFactory } from './lib/template';

export { debug, debugSlice, logOpcode } from './lib/debug';

export { WrappedBuilder } from './lib/wrapped-component';

export { EMPTY_BLOCKS } from './lib/utils';
