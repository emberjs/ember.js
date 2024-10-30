/// Builder ///

export type BUILDER_LITERAL = 0;
export const BUILDER_LITERAL: BUILDER_LITERAL = 0;

export type BUILDER_COMMENT = 1;
export const BUILDER_COMMENT: BUILDER_COMMENT = 1;

export type BUILDER_APPEND = 2;
export const BUILDER_APPEND: BUILDER_APPEND = 2;

export type BUILDER_MODIFIER = 3;
export const BUILDER_MODIFIER: BUILDER_MODIFIER = 3;

export type BUILDER_DYNAMIC_COMPONENT = 4;
export const BUILDER_DYNAMIC_COMPONENT: BUILDER_DYNAMIC_COMPONENT = 4;

export type BUILDER_GET = 5;
export const BUILDER_GET: BUILDER_GET = 5;

export type BUILDER_CONCAT = 6;
export const BUILDER_CONCAT: BUILDER_CONCAT = 6;

export type BUILDER_HAS_BLOCK = 7;
export const BUILDER_HAS_BLOCK: BUILDER_HAS_BLOCK = 7;

export type BUILDER_HAS_BLOCK_PARAMS = 8;
export const BUILDER_HAS_BLOCK_PARAMS: BUILDER_HAS_BLOCK_PARAMS = 8;

/// HeadKind ///

export type BLOCK_HEAD = 'Block';
export const BLOCK_HEAD: BLOCK_HEAD = 'Block';

export type CALL_HEAD = 'Call';
export const CALL_HEAD: CALL_HEAD = 'Call';

export type ELEMENT_HEAD = 'Element';
export const ELEMENT_HEAD: ELEMENT_HEAD = 'Element';

export type APPEND_PATH_HEAD = 'AppendPath';
export const APPEND_PATH_HEAD: APPEND_PATH_HEAD = 'AppendPath';

export type APPEND_EXPR_HEAD = 'AppendExpr';
export const APPEND_EXPR_HEAD: APPEND_EXPR_HEAD = 'AppendExpr';

export type LITERAL_HEAD = 'Literal';
export const LITERAL_HEAD: LITERAL_HEAD = 'Literal';

export type MODIFIER_HEAD = 'Modifier';
export const MODIFIER_HEAD: MODIFIER_HEAD = 'Modifier';

export type DYNAMIC_COMPONENT_HEAD = 'DynamicComponent';
export const DYNAMIC_COMPONENT_HEAD: DYNAMIC_COMPONENT_HEAD = 'DynamicComponent';

export type COMMENT_HEAD = 'Comment';
export const COMMENT_HEAD: COMMENT_HEAD = 'Comment';

export type SPLAT_HEAD = 'Splat';
export const SPLAT_HEAD: SPLAT_HEAD = 'Splat';

export type KEYWORD_HEAD = 'Keyword';
export const KEYWORD_HEAD: KEYWORD_HEAD = 'Keyword';

export type HeadKind =
  | BLOCK_HEAD
  | CALL_HEAD
  | ELEMENT_HEAD
  | APPEND_PATH_HEAD
  | APPEND_EXPR_HEAD
  | LITERAL_HEAD
  | MODIFIER_HEAD
  | DYNAMIC_COMPONENT_HEAD
  | COMMENT_HEAD
  | SPLAT_HEAD
  | KEYWORD_HEAD;

/// VariableKind ///

export type LOCAL_VAR = 'Local';
export const LOCAL_VAR: LOCAL_VAR = 'Local';

export type FREE_VAR = 'Free';
export const FREE_VAR: FREE_VAR = 'Free';

export type ARG_VAR = 'Arg';
export const ARG_VAR: ARG_VAR = 'Arg';

export type BLOCK_VAR = 'Block';
export const BLOCK_VAR: BLOCK_VAR = 'Block';

export type THIS_VAR = 'This';
export const THIS_VAR: THIS_VAR = 'This';

export type VariableKind = LOCAL_VAR | FREE_VAR | ARG_VAR | BLOCK_VAR | THIS_VAR;

/// ExpressionKind ///

export type LITERAL_EXPR = 'Literal';
export const LITERAL_EXPR: LITERAL_EXPR = 'Literal';

export type CALL_EXPR = 'Call';
export const CALL_EXPR: CALL_EXPR = 'Call';

export type GET_PATH_EXPR = 'GetPath';
export const GET_PATH_EXPR: GET_PATH_EXPR = 'GetPath';

export type GET_VAR_EXPR = 'GetVar';
export const GET_VAR_EXPR: GET_VAR_EXPR = 'GetVar';

export type CONCAT_EXPR = 'Concat';
export const CONCAT_EXPR: CONCAT_EXPR = 'Concat';

export type HAS_BLOCK_EXPR = 'HasBlock';
export const HAS_BLOCK_EXPR: HAS_BLOCK_EXPR = 'HasBlock';

export type HAS_BLOCK_PARAMS_EXPR = 'HasBlockParams';
export const HAS_BLOCK_PARAMS_EXPR: HAS_BLOCK_PARAMS_EXPR = 'HasBlockParams';

export type ExpressionKind =
  | LITERAL_EXPR
  | CALL_EXPR
  | GET_PATH_EXPR
  | GET_VAR_EXPR
  | CONCAT_EXPR
  | HAS_BLOCK_EXPR
  | HAS_BLOCK_PARAMS_EXPR;
