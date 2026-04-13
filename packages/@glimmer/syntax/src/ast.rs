//! ASTv1-compatible node types for Glimmer templates.
//!
//! These types serialize to JSON that matches the shape expected by
//! @glimmer/syntax's ASTv1 types. The JS side converts plain location
//! objects into SourceSpan instances.

use serde::Serialize;

#[derive(Debug, Serialize, Clone)]
pub struct SourcePosition {
    pub line: usize,
    pub column: usize,
}

#[derive(Debug, Serialize, Clone)]
pub struct SourceLocation {
    pub start: SourcePosition,
    pub end: SourcePosition,
}

// -- Template & Block --------------------------------------------------------

#[derive(Debug, Serialize)]
pub struct Template {
    #[serde(rename = "type")]
    pub node_type: &'static str, // "Template"
    pub body: Vec<Statement>,
    #[serde(rename = "blockParams")]
    pub block_params: Vec<String>,
    pub loc: SourceLocation,
}

#[derive(Debug, Serialize)]
pub struct Block {
    #[serde(rename = "type")]
    pub node_type: &'static str, // "Block"
    pub body: Vec<Statement>,
    pub params: Vec<VarHead>,
    #[serde(rename = "blockParams")]
    pub block_params: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub chained: Option<bool>,
    pub loc: SourceLocation,
}

// -- Statements --------------------------------------------------------------

#[derive(Debug, Serialize)]
#[serde(untagged)]
pub enum Statement {
    Mustache(MustacheStatement),
    Block(BlockStatement),
    Comment(CommentStatement),
    MustacheComment(MustacheCommentStatement),
    Element(ElementNode),
    Text(TextNode),
}

#[derive(Debug, Serialize)]
pub struct MustacheStatement {
    #[serde(rename = "type")]
    pub node_type: &'static str, // "MustacheStatement"
    pub path: Expression,
    pub params: Vec<Expression>,
    pub hash: Hash,
    pub trusting: bool,
    pub escaped: bool,
    pub strip: StripFlags,
    pub loc: SourceLocation,
}

#[derive(Debug, Serialize)]
pub struct BlockStatement {
    #[serde(rename = "type")]
    pub node_type: &'static str, // "BlockStatement"
    pub path: Expression,
    pub params: Vec<Expression>,
    pub hash: Hash,
    pub program: Block,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub inverse: Option<Block>,
    #[serde(rename = "openStrip")]
    pub open_strip: StripFlags,
    #[serde(rename = "inverseStrip")]
    pub inverse_strip: StripFlags,
    #[serde(rename = "closeStrip")]
    pub close_strip: StripFlags,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub chained: Option<bool>,
    pub loc: SourceLocation,
}

#[derive(Debug, Serialize)]
pub struct CommentStatement {
    #[serde(rename = "type")]
    pub node_type: &'static str, // "CommentStatement"
    pub value: String,
    pub loc: SourceLocation,
}

#[derive(Debug, Serialize)]
pub struct MustacheCommentStatement {
    #[serde(rename = "type")]
    pub node_type: &'static str, // "MustacheCommentStatement"
    pub value: String,
    pub loc: SourceLocation,
}

#[derive(Debug, Serialize)]
pub struct TextNode {
    #[serde(rename = "type")]
    pub node_type: &'static str, // "TextNode"
    pub chars: String,
    pub loc: SourceLocation,
}

// -- Element -----------------------------------------------------------------

#[derive(Debug, Serialize)]
pub struct ElementNode {
    #[serde(rename = "type")]
    pub node_type: &'static str, // "ElementNode"
    pub path: PathExpression,
    #[serde(rename = "selfClosing")]
    pub self_closing: bool,
    pub attributes: Vec<AttrNode>,
    pub params: Vec<VarHead>,
    pub modifiers: Vec<ElementModifierStatement>,
    pub comments: Vec<MustacheCommentStatement>,
    pub children: Vec<Statement>,
    #[serde(rename = "openTag")]
    pub open_tag: SourceLocation,
    #[serde(rename = "closeTag")]
    pub close_tag: Option<SourceLocation>,
    pub tag: String,
    #[serde(rename = "blockParams")]
    pub block_params: Vec<String>,
    pub loc: SourceLocation,
}

#[derive(Debug, Serialize)]
pub struct ElementModifierStatement {
    #[serde(rename = "type")]
    pub node_type: &'static str, // "ElementModifierStatement"
    pub path: Expression,
    pub params: Vec<Expression>,
    pub hash: Hash,
    pub loc: SourceLocation,
}

// -- Attributes --------------------------------------------------------------

#[derive(Debug, Serialize)]
pub struct AttrNode {
    #[serde(rename = "type")]
    pub node_type: &'static str, // "AttrNode"
    pub name: String,
    pub value: AttrValue,
    pub loc: SourceLocation,
}

#[derive(Debug, Serialize)]
#[serde(untagged)]
pub enum AttrValue {
    Text(TextNode),
    Mustache(MustacheStatement),
    Concat(ConcatStatement),
}

#[derive(Debug, Serialize)]
pub struct ConcatStatement {
    #[serde(rename = "type")]
    pub node_type: &'static str, // "ConcatStatement"
    pub parts: Vec<AttrPart>,
    pub loc: SourceLocation,
}

#[derive(Debug, Serialize)]
#[serde(untagged)]
pub enum AttrPart {
    Text(TextNode),
    Mustache(MustacheStatement),
}

// -- Expressions -------------------------------------------------------------

#[derive(Debug, Serialize)]
#[serde(untagged)]
pub enum Expression {
    SubExpression(Box<SubExpression>),
    Path(PathExpression),
    StringLiteral(StringLiteral),
    BooleanLiteral(BooleanLiteral),
    NumberLiteral(NumberLiteral),
    UndefinedLiteral(UndefinedLiteral),
    NullLiteral(NullLiteral),
}

#[derive(Debug, Serialize)]
pub struct SubExpression {
    #[serde(rename = "type")]
    pub node_type: &'static str, // "SubExpression"
    pub path: Expression,
    pub params: Vec<Expression>,
    pub hash: Hash,
    pub loc: SourceLocation,
}

#[derive(Debug, Serialize)]
pub struct PathExpression {
    #[serde(rename = "type")]
    pub node_type: &'static str, // "PathExpression"
    pub original: String,
    pub head: PathHead,
    pub tail: Vec<String>,
    pub parts: Vec<String>,
    pub loc: SourceLocation,
}

#[derive(Debug, Serialize)]
#[serde(untagged)]
pub enum PathHead {
    This(ThisHead),
    At(AtHead),
    Var(VarHead),
}

#[derive(Debug, Serialize)]
pub struct ThisHead {
    #[serde(rename = "type")]
    pub node_type: &'static str, // "ThisHead"
    pub original: &'static str,  // "this"
    pub loc: SourceLocation,
}

#[derive(Debug, Serialize)]
pub struct AtHead {
    #[serde(rename = "type")]
    pub node_type: &'static str, // "AtHead"
    pub name: String,
    pub original: String,
    pub loc: SourceLocation,
}

#[derive(Debug, Serialize, Clone)]
pub struct VarHead {
    #[serde(rename = "type")]
    pub node_type: &'static str, // "VarHead"
    pub name: String,
    pub original: String,
    pub loc: SourceLocation,
}

// -- Literals ----------------------------------------------------------------

#[derive(Debug, Serialize)]
pub struct StringLiteral {
    #[serde(rename = "type")]
    pub node_type: &'static str, // "StringLiteral"
    pub value: String,
    pub original: String,
    pub loc: SourceLocation,
}

#[derive(Debug, Serialize)]
pub struct BooleanLiteral {
    #[serde(rename = "type")]
    pub node_type: &'static str, // "BooleanLiteral"
    pub value: bool,
    pub original: bool,
    pub loc: SourceLocation,
}

#[derive(Debug, Serialize)]
pub struct NumberLiteral {
    #[serde(rename = "type")]
    pub node_type: &'static str, // "NumberLiteral"
    pub value: f64,
    pub original: f64,
    pub loc: SourceLocation,
}

#[derive(Debug, Serialize)]
pub struct UndefinedLiteral {
    #[serde(rename = "type")]
    pub node_type: &'static str, // "UndefinedLiteral"
    pub loc: SourceLocation,
}

#[derive(Debug, Serialize)]
pub struct NullLiteral {
    #[serde(rename = "type")]
    pub node_type: &'static str, // "NullLiteral"
    // value and original are both `null` in ASTv1
    pub value: Option<()>,
    pub original: Option<()>,
    pub loc: SourceLocation,
}

// -- Hash --------------------------------------------------------------------

#[derive(Debug, Serialize)]
pub struct Hash {
    #[serde(rename = "type")]
    pub node_type: &'static str, // "Hash"
    pub pairs: Vec<HashPair>,
    pub loc: SourceLocation,
}

#[derive(Debug, Serialize)]
pub struct HashPair {
    #[serde(rename = "type")]
    pub node_type: &'static str, // "HashPair"
    pub key: String,
    pub value: Expression,
    pub loc: SourceLocation,
}

// -- Strip Flags -------------------------------------------------------------

#[derive(Debug, Serialize)]
pub struct StripFlags {
    pub open: bool,
    pub close: bool,
}

// -- Parse Error -------------------------------------------------------------

#[derive(Debug, Serialize)]
pub struct ParseError {
    pub message: String,
    pub loc: SourceLocation,
    /// Source context lines around the error for rich error display
    pub context: Option<ErrorContext>,
}

#[derive(Debug, Serialize)]
pub struct ErrorContext {
    /// The source line where the error occurred
    pub source_line: String,
    /// A visual pointer showing where in the line the error is
    pub pointer: String,
    /// Suggestion for how to fix, if available
    pub suggestion: Option<String>,
}
