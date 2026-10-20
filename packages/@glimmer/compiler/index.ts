export {
  buildStatement,
  buildStatements,
  c,
  NEWLINE,
  ProgramSymbols,
  s,
  unicode,
} from './lib/builder/builder';
export { type BuilderStatement } from './lib/builder/builder-interface';
export { defaultId, precompile, precompileJSON, type PrecompileOptions } from './lib/compiler';

// exported only for tests!
export { default as WireFormatDebugger } from './lib/wire-format-debug';

// EXPERIMENTAL: compile strict-mode templates directly to DOM operations
export {
  CodegenError,
  codegenBabelPlugin,
  type CodegenBabelPluginOptions,
  compileToDOM,
  type CompileToDOMOptions,
  generate as generateDOM,
  type GenerateOptions as GenerateDOMOptions,
  ImportCollector,
} from './lib/codegen';
