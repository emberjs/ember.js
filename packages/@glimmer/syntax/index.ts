export { Source } from './lib/source/source';
export { default as builders } from './lib/v1/public-builders';
export * as ASTv1 from './lib/v1/api';
export * as ASTv2 from './lib/v2-a/api';
export { normalize } from './lib/v2-a/normalize';
export { SymbolTable, BlockSymbolTable, ProgramSymbolTable } from './lib/symbol-table';
export { GlimmerSyntaxError } from './lib/syntax-error';
export {
  preprocess,
  ASTPluginBuilder,
  ASTPluginEnvironment,
  Syntax,
  TemplateIdFn,
  PrecompileOptions,
} from './lib/parser/tokenizer-event-handlers';
export { default as print } from './lib/generation/print';
export { default as Walker } from './lib/traversal/walker';
export { default as traverse } from './lib/traversal/traverse';
export { cannotRemoveNode, cannotReplaceNode } from './lib/traversal/errors';
export { default as WalkerPath } from './lib/traversal/path';

export { SourceSlice } from './lib/source/slice';
export { SourceSpan } from './lib/source/span';
export {
  SpanList,
  maybeLoc,
  MaybeHasSourceSpan,
  loc,
  HasSourceSpan,
  hasSpan,
} from './lib/source/span-list';
export { PreprocessOptions } from './lib/parser/tokenizer-event-handlers';

export { node } from './lib/v2-a/objects/node';

/** @deprecated use WalkerPath instead */
export { default as Path } from './lib/traversal/walker';

/** @deprecated use ASTv1 instead */
export * as AST from './lib/v1/api';
