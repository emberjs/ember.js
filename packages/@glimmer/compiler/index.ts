export { defaultId, precompile, PrecompileOptions } from './lib/compiler';
export {
  ProgramSymbols,
  buildStatement,
  buildStatements,
  s,
  c,
  unicode,
  NEWLINE,
} from './lib/builder';
export { BuilderStatement, Builder } from './lib/builder-interface';
export { default as TemplateCompiler } from './lib/template-compiler';

// exported only for tests
export { default as TemplateVisitor } from './lib/template-visitor';
export { default as WireFormatDebugger } from './lib/wire-format-debug';

export * from './lib/location';
