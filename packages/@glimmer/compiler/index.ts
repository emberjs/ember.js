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
export * from '@glimmer/constants';

// exported only for tests!
export { default as WireFormatDebugger } from './lib/wire-format-debug';
