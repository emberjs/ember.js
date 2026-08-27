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
export {
  defaultId,
  precompile,
  precompileModule,
  type PrecompiledModule,
  type PrecompileModuleOptions,
  precompileJSON,
  type PrecompileOptions,
} from './lib/compiler';

// exported only for tests!
export { default as WireFormatDebugger } from './lib/wire-format-debug';
export type { LexicalKeyword, OpImport, PrinterOptions } from './lib/wire-format-module';
