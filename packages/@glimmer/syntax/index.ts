export { default as print } from './lib/generation/print';
export { getVoidTags, isVoidTag } from './lib/generation/printer';
export { sortByLoc } from './lib/generation/util';
export { getTemplateLocals } from './lib/get-template-locals';
export { isKeyword, KEYWORDS_TYPES, type KeywordType } from './lib/keywords';
export type { PreprocessOptions } from './lib/parser/tokenizer-event-handlers';
export {
  type ASTPlugin,
  type ASTPluginBuilder,
  type ASTPluginEnvironment,
  type PrecompileOptions,
  type PrecompileOptionsWithLexicalScope,
  preprocess,
  type Syntax,
  type TemplateIdFn,
} from './lib/parser/tokenizer-event-handlers';
export * as src from './lib/source/api';
export { SourceSlice } from './lib/source/slice';
export {
  type HasSourceSpan,
  hasSpan,
  loc,
  type MaybeHasSourceSpan,
  maybeLoc,
  SpanList,
} from './lib/source/span-list';
export { BlockSymbolTable, ProgramSymbolTable, SymbolTable } from './lib/symbol-table';
export { generateSyntaxError, type GlimmerSyntaxError } from './lib/syntax-error';
export { cannotRemoveNode, cannotReplaceNode } from './lib/traversal/errors';
export { default as WalkerPath } from './lib/traversal/path';
export { default as traverse } from './lib/traversal/traverse';
export type { NodeVisitor } from './lib/traversal/visitor';
export { default as Walker } from './lib/traversal/walker';
export * as ASTv1 from './lib/v1/api';
export { default as builders } from './lib/v1/public-builders';
export { default as visitorKeys } from './lib/v1/visitor-keys';
export * as ASTv2 from './lib/v2/api';
export { normalize } from './lib/v2/normalize';
export { node } from './lib/v2/objects/node';

/** @deprecated use WalkerPath instead */
export { default as Path } from './lib/traversal/walker';

/** @deprecated use ASTv1 instead */
export * as AST from './lib/v1/api';
