export * from './lib/interfaces';

export {
  ATTRS_BLOCK,
  CompileOptions,
  Macros,
  TemplateOptions
} from './lib/syntax';

export {
  AbstractTemplate,
  CompileTimeLookup,
  LazyOpcodeBuilder,
  EagerOpcodeBuilder,
  OpcodeBuilder,
  OpcodeBuilderConstructor,
  SimpleOpcodeBuilder,
  STDLib
} from './lib/opcode-builder';

export {
  default as CompilableTemplate,
  ICompilableTemplate
} from './lib/compilable-template';

export {
  debug,
  debugSlice,
  logOpcode
} from './lib/debug';

export {
  WrappedBuilder,
} from './lib/wrapped-component';
