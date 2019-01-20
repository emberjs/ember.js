// used by ember-compiler
export {
  preprocess,
  PreprocessOptions,
  ASTPlugin,
  ASTPluginBuilder,
  ASTPluginEnvironment,
  Syntax,
} from './lib/parser/tokenizer-event-handlers';

// needed for tests only
export { default as builders } from './lib/builders';
export {
  default as TraversalError,
  cannotRemoveNode,
  cannotReplaceNode,
  cannotReplaceOrRemoveInKeyHandlerYet,
} from './lib/traversal/errors';
export { default as traverse } from './lib/traversal/traverse';
export * from './lib/traversal/visitor';
export { default as Walker } from './lib/traversal/walker';
export { default as print } from './lib/generation/print';

// errors
export { default as SyntaxError } from './lib/errors/syntax-error';

// AST
import * as AST from './lib/types/nodes';
export { AST };
export { isLiteral, printLiteral } from './lib/utils';
