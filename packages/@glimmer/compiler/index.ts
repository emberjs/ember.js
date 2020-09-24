export { defaultId, precompile, precompileJSON } from './lib/compiler';
export {
  ProgramSymbols,
  buildStatement,
  buildStatements,
  s,
  c,
  unicode,
  NEWLINE,
} from './lib/builder/builder';
export { BuilderStatement, Builder } from './lib/builder/builder-interface';

// exported only for tests
export { default as WireFormatDebugger } from './lib/wire-format-debug';
