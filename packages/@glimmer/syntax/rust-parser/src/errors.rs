//! Rich error reporting for Glimmer template parse errors.
//!
//! Converts pest parse errors into structured error objects with:
//! - Exact source locations (line/column)
//! - Source context (the offending line with a visual pointer)
//! - Human-readable error messages
//! - Suggestions for common mistakes

use pest::error::{Error as PestError, ErrorVariant, LineColLocation};

use crate::ast::{ErrorContext, ParseError, SourceLocation, SourcePosition};
use crate::Rule;

/// Convert a pest parse error into a structured ParseError with rich context.
pub fn convert_pest_error(
    error: &PestError<Rule>,
    source: &str,
    src_name: Option<&str>,
) -> ParseError {
    let (line, col) = match error.line_col {
        LineColLocation::Pos((line, col)) => (line, col),
        LineColLocation::Span((line, col), _) => (line, col),
    };

    // Convert to 0-based column for Glimmer compatibility
    let column = if col > 0 { col - 1 } else { 0 };

    let loc = SourceLocation {
        start: SourcePosition { line, column },
        end: SourcePosition { line, column },
    };

    let message = build_error_message(error, src_name);
    let context = build_error_context(source, line, column, error);

    ParseError {
        message,
        loc,
        context: Some(context),
    }
}

fn build_error_message(error: &PestError<Rule>, src_name: Option<&str>) -> String {
    let location_prefix = match src_name {
        Some(name) => format!("in {name}: "),
        None => String::new(),
    };

    match &error.variant {
        ErrorVariant::ParsingError {
            positives,
            negatives,
        } => {
            let mut msg = format!("{location_prefix}Parse error");

            if !positives.is_empty() {
                let expected: Vec<String> = positives
                    .iter()
                    .map(|r| rule_to_human_readable(r))
                    .filter(|s| !s.is_empty())
                    .collect();

                if !expected.is_empty() {
                    msg.push_str(&format!(", expected {}", expected.join(", ")));
                }
            }

            if !negatives.is_empty() {
                let unexpected: Vec<String> = negatives
                    .iter()
                    .map(|r| rule_to_human_readable(r))
                    .filter(|s| !s.is_empty())
                    .collect();

                if !unexpected.is_empty() {
                    msg.push_str(&format!(", unexpected {}", unexpected.join(", ")));
                }
            }

            msg
        }
        ErrorVariant::CustomError { message } => {
            format!("{location_prefix}{message}")
        }
    }
}

fn build_error_context(
    source: &str,
    line: usize,
    column: usize,
    error: &PestError<Rule>,
) -> ErrorContext {
    let lines: Vec<&str> = source.lines().collect();
    let source_line = if line > 0 && line <= lines.len() {
        lines[line - 1].to_string()
    } else {
        String::new()
    };

    // Build a visual pointer like:
    //   <div class="foo">
    //   -----^
    let pointer = format!("{}^", "-".repeat(column));

    let suggestion = generate_suggestion(error, &source_line, column);

    ErrorContext {
        source_line,
        pointer,
        suggestion,
    }
}

/// Generate helpful suggestions for common template errors.
fn generate_suggestion(
    error: &PestError<Rule>,
    source_line: &str,
    column: usize,
) -> Option<String> {
    let context = if column < source_line.len() {
        &source_line[column..]
    } else {
        ""
    };

    // Check for common mistakes

    // Unclosed mustache: {{ without }}
    if context.starts_with("{{") && !source_line[column..].contains("}}") {
        return Some("It looks like this mustache expression is not closed. Add '}}' to close it.".to_string());
    }

    // Empty mustache: {{}}
    if context.starts_with("{{}}") {
        return Some(
            "Empty mustache expressions are not allowed. Add an expression like {{myVariable}}.".to_string(),
        );
    }

    // Unclosed element
    if context.starts_with('<') && !context.starts_with("</") && !context.contains('>') {
        return Some("This element tag appears to be unclosed. Add '>' or '/>' to close it.".to_string());
    }

    // Mismatched closing tag
    if context.starts_with("</") {
        return Some("Check that this closing tag matches its corresponding opening tag.".to_string());
    }

    // Missing space in block params
    if context.contains("as|") {
        return Some(
            "Block parameters require a space between 'as' and '|'. Use 'as |param|' instead of 'as|param|'.".to_string(),
        );
    }

    // Suggest escaping if {{ appears in text content
    if let ErrorVariant::ParsingError { positives, .. } = &error.variant {
        if positives.iter().any(|r| matches!(r, Rule::TextContent)) {
            return Some(
                "If you want to display literal '{{', escape it with '\\{{'.".to_string(),
            );
        }
    }

    None
}

/// Convert a pest Rule into a human-readable name for error messages.
fn rule_to_human_readable(rule: &Rule) -> String {
    match rule {
        Rule::Template => "template".to_string(),
        Rule::TextContent => "text content".to_string(),
        Rule::Mustache | Rule::DoubleMustache => "mustache expression '{{...}}'".to_string(),
        Rule::TripleMustache => {
            "raw/triple mustache expression '{{{...}}}'".to_string()
        }
        Rule::BlockStatement => "block statement '{{#...}}'".to_string(),
        Rule::BlockOpen => "block opening '{{#...}}'".to_string(),
        Rule::BlockClose => "block closing '{{/...}}'".to_string(),
        Rule::Element | Rule::NormalElement => "HTML element".to_string(),
        Rule::SelfClosingElement => "self-closing element '<.../>'".to_string(),
        Rule::VoidElement => "void element".to_string(),
        Rule::OpenTag => "opening tag '<...>'".to_string(),
        Rule::CloseTag => "closing tag '</...>'".to_string(),
        Rule::TagName => "tag name".to_string(),
        Rule::PathExpression => "path expression".to_string(),
        Rule::SubExpression => "sub-expression '(...)'".to_string(),
        Rule::StringLiteral => "string literal".to_string(),
        Rule::NumberLiteral => "number literal".to_string(),
        Rule::BooleanLiteral => "boolean literal".to_string(),
        Rule::NullLiteral => "'null'".to_string(),
        Rule::UndefinedLiteral => "'undefined'".to_string(),
        Rule::HashPair => "hash pair 'key=value'".to_string(),
        Rule::AttrName => "attribute name".to_string(),
        Rule::AttrWithValue => "attribute".to_string(),
        Rule::HtmlComment => "HTML comment '<!-- -->'".to_string(),
        Rule::MustacheComment | Rule::MustacheCommentLong | Rule::MustacheCommentShort => {
            "mustache comment '{{!...}}'".to_string()
        }
        Rule::BlockParams => "block parameters 'as |...|'".to_string(),
        Rule::Splattributes => "'...attributes'".to_string(),
        Rule::EOI => "end of input".to_string(),
        _ => String::new(), // Skip less interesting rules
    }
}
