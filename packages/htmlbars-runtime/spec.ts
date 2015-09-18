enum StatementName {
	TEXT,
	COMMENT,
	UNKNOWN,
	MODIFIER,
	INLINE,
	BLOCK,
	COMPONENT,
	OPEN_ELEMENT,
	CLOSE_ELEMENT,
	STATIC_ATTR,
	DYNAMIC_ATTR
}



type TextSpec = [
	StatementName, // StatementName.TEXT
	string // content
];

type CommentSpec = [
	StatementName, // StatementName.COMMENT
	string // content 
];

type PathSpec = string[];

type UnknownSpec = [
	StatementName, // StatementName.UNKNOWN
	PathSpec,
	boolean // trusted
];

type ParamsSpec = ExpressionSpec[];
type HashSpec = any[]; // [string, Expression, string, Expression, ...]

type ModifierSpec = [
	StatementName, // StatementName.MODIFIER
	PathSpec,
	ParamsSpec,
	HashSpec
];

type InlineSpec = [
	StatementName, // StatementName.INLINE
	PathSpec,
	ParamsSpec,
	HashSpec
];

type BlockSpec = [
	StatementName, // StatementName.BLOCK
	PathSpec,
	ParamsSpec,
	HashSpec,
	number, // template index
	number  // inverse index
];

type ComponentSpec = [
	StatementName, // StatementName.BLOCK
	string, // tag
	HashSpec, // attrs
	number // template index
];

type OpenElementSpec = [
	StatementName, // StatementName.OPEN_ELEMENT
	string // tag
];

type CloseElementSpec = [
	StatementName // StatementName.CLOSE_ELEMENT
];

type StaticAttrSpec = [
	StatementName, // StatementName.STATIC_ATTR
	string, // name
	string, // value
	string // namespace
];

type DynamicAttrSpec = [
	StatementName, // StatementName.DYNAMIC_ATTR
	string, // name
	ExpressionSpec, // value
	string // namespace	
];

enum ExpressionName {
	GET,
	CONCAT,
	HELPER
}

type LiteralSpec = string | number | boolean;

type GetSpec = [
	ExpressionName, // ExpressionName.GET
	PathSpec
];

type ConcatSpec = [
	ExpressionName,
	ParamsSpec	
];

type HelperSpec = [
	ExpressionName, // ExpressionName.HELPER
	PathSpec,
	ParamsSpec,
	HashSpec
];

export type ExpressionSpec = any; // GetSpec | ConcatSpec | HelperSpec
export type Spec = any;