export {
  buildStatement,
  buildStatements,
  c,
  NEWLINE,
  ProgramSymbols,
  s,
  unicode,
} from './lib/builder/builder';
export { Builder, BuilderStatement } from './lib/builder/builder-interface';
export { defaultId, precompile, precompileJSON, PrecompileOptions } from './lib/compiler';

// exported only for tests
export { default as WireFormatDebugger } from './lib/wire-format-debug';
