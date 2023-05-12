// Statements
export type AppendOpcode = 1;
export type TrustingAppendOpcode = 2;
export type CommentOpcode = 3;
export type ModifierOpcode = 4;
export type StrictModifierOpcode = 5;
export type BlockOpcode = 6;
export type StrictBlockOpcode = 7;
export type ComponentOpcode = 8;

export type OpenElementOpcode = 10;
export type OpenElementWithSplatOpcode = 11;
export type FlushElementOpcode = 12;
export type CloseElementOpcode = 13;
export type StaticAttrOpcode = 14;
export type DynamicAttrOpcode = 15;
export type ComponentAttrOpcode = 16;

export type AttrSplatOpcode = 17;
export type YieldOpcode = 18;

export type DynamicArgOpcode = 20;
export type StaticArgOpcode = 21;
export type TrustingDynamicAttrOpcode = 22;
export type TrustingComponentAttrOpcode = 23;
export type StaticComponentAttrOpcode = 24;

export type DebuggerOpcode = 26;

// Expressions
export type UndefinedOpcode = 27;
export type CallOpcode = 28;
export type ConcatOpcode = 29;

// Get
// Get a local value via symbol
export type GetSymbolOpcode = 30; // GetPath + 0-2,
// Lexical symbols are values that are in scope in the template in strict mode
export type GetLexicalSymbolOpcode = 32;
// If a free variable is not a lexical symbol in strict mode, it must be a keyword.
// FIXME: Why does this make it to the wire format in the first place?
export type GetStrictKeywordOpcode = 31;

// `{{x}}` in append position (might be a helper or component invocation, otherwise fall back to `this`)
export type GetFreeAsComponentOrHelperHeadOrThisFallbackOpcode = 34;
// a component or helper (`{{<expr> x}}` in append position)
export type GetFreeAsComponentOrHelperHeadOpcode = 35;
// a helper or `this` fallback `attr={{x}}`
export type GetFreeAsHelperHeadOrThisFallbackOpcode = 36;
// a helper or `this` fallback (deprecated) `@arg={{x}}`
export type GetFreeAsDeprecatedHelperHeadOrThisFallbackOpcode = 99;
// a call head `(x)`
export type GetFreeAsHelperHeadOpcode = 37;
export type GetFreeAsModifierHeadOpcode = 38;
export type GetFreeAsComponentHeadOpcode = 39;

// Keyword Statements
export type InElementOpcode = 40;
export type IfOpcode = 41;
export type EachOpcode = 42;
export type WithOpcode = 43;
export type LetOpcode = 44;
export type WithDynamicVarsOpcode = 45;
export type InvokeComponentOpcode = 46;

// Keyword Expressions
export type HasBlockOpcode = 48;
export type HasBlockParamsOpcode = 49;
export type CurryOpcode = 50;
export type NotOpcode = 51;
export type IfInlineOpcode = 52;
export type GetDynamicVarOpcode = 53;
export type LogOpcode = 54;

export type GetStartOpcode = GetSymbolOpcode;
export type GetEndOpcode = GetFreeAsComponentHeadOpcode;
export type GetLooseFreeStartOpcode = GetFreeAsComponentOrHelperHeadOrThisFallbackOpcode;
export type GetLooseFreeEndOpcode = GetFreeAsComponentHeadOpcode;
export type GetContextualFreeStartOpcode = GetFreeAsComponentOrHelperHeadOrThisFallbackOpcode;

export type GetContextualFreeOpcode =
  | GetFreeAsComponentOrHelperHeadOrThisFallbackOpcode
  | GetFreeAsComponentOrHelperHeadOpcode
  | GetFreeAsHelperHeadOrThisFallbackOpcode
  | GetFreeAsHelperHeadOpcode
  | GetFreeAsModifierHeadOpcode
  | GetFreeAsComponentHeadOpcode
  | GetStrictKeywordOpcode;

export type AttrOpcode =
  | StaticAttrOpcode
  | StaticComponentAttrOpcode
  | DynamicAttrOpcode
  | TrustingDynamicAttrOpcode
  | ComponentAttrOpcode
  | TrustingComponentAttrOpcode;
