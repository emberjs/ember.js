//! Converts pest parse tree (Pairs) into ASTv1 node structures.

use pest::iterators::{Pair, Pairs};

use crate::ast::*;
use crate::Rule;

/// Compute (line, column) from a byte offset into the source string.
/// Lines are 1-based, columns are 0-based (matching Glimmer conventions).
fn offset_to_position(source: &str, offset: usize) -> SourcePosition {
    let mut line = 1;
    let mut col = 0;

    for (i, ch) in source.char_indices() {
        if i >= offset {
            break;
        }
        if ch == '\n' {
            line += 1;
            col = 0;
        } else {
            col += 1;
        }
    }

    SourcePosition { line, column: col }
}

fn span_to_loc(source: &str, pair: &Pair<'_, Rule>) -> SourceLocation {
    let span = pair.as_span();
    SourceLocation {
        start: offset_to_position(source, span.start()),
        end: offset_to_position(source, span.end()),
    }
}

fn default_strip() -> StripFlags {
    StripFlags {
        open: false,
        close: false,
    }
}

pub fn build_template(pairs: Pairs<'_, Rule>, source: &str, _src_name: Option<&str>) -> Template {
    let mut body = vec![];

    for pair in pairs {
        match pair.as_rule() {
            Rule::Template => {
                for inner in pair.into_inner() {
                    if let Some(stmt) = build_statement(inner, source) {
                        body.push(stmt);
                    }
                }
            }
            _ => {
                if let Some(stmt) = build_statement(pair, source) {
                    body.push(stmt);
                }
            }
        }
    }

    let loc = SourceLocation {
        start: SourcePosition { line: 1, column: 0 },
        end: offset_to_position(source, source.len()),
    };

    Template {
        node_type: "Template",
        body,
        block_params: vec![],
        loc,
    }
}

fn build_statement(pair: Pair<'_, Rule>, source: &str) -> Option<Statement> {
    match pair.as_rule() {
        Rule::TextContent => Some(Statement::Text(build_text_node(pair, source))),
        Rule::EscapedMustache => Some(Statement::Text(build_escaped_mustache(pair, source))),
        Rule::Mustache | Rule::DoubleMustache | Rule::TripleMustache => {
            Some(Statement::Mustache(build_mustache(pair, source)))
        }
        Rule::BlockStatement => Some(Statement::Block(build_block_statement(pair, source))),
        Rule::HtmlComment => Some(Statement::Comment(build_html_comment(pair, source))),
        Rule::MustacheComment | Rule::MustacheCommentLong | Rule::MustacheCommentShort => {
            Some(Statement::MustacheComment(build_mustache_comment(
                pair, source,
            )))
        }
        Rule::Element | Rule::NormalElement | Rule::SelfClosingElement | Rule::VoidElement => {
            Some(Statement::Element(build_element(pair, source)))
        }
        Rule::EOI => None,
        _ => None,
    }
}

fn build_text_node(pair: Pair<'_, Rule>, source: &str) -> TextNode {
    let loc = span_to_loc(source, &pair);
    TextNode {
        node_type: "TextNode",
        chars: pair.as_str().to_string(),
        loc,
    }
}

fn build_escaped_mustache(pair: Pair<'_, Rule>, source: &str) -> TextNode {
    let loc = span_to_loc(source, &pair);
    // \{{ becomes {{
    TextNode {
        node_type: "TextNode",
        chars: "{{".to_string(),
        loc,
    }
}

fn build_mustache(pair: Pair<'_, Rule>, source: &str) -> MustacheStatement {
    let loc = span_to_loc(source, &pair);

    // Unwrap outer Mustache wrapper if present
    let actual = if pair.as_rule() == Rule::Mustache {
        pair.into_inner().next().expect("Mustache has inner rule")
    } else {
        pair
    };

    let is_triple = matches!(actual.as_rule(), Rule::TripleMustache);

    let mut strip_open = false;
    let mut strip_close = false;
    let mut path = None;
    let mut params = vec![];
    let mut hash_pairs = vec![];

    // Navigate into the mustache: might be DoubleMustache/TripleMustache > MustacheBody
    let inner = unwrap_to_body(actual);

    for child in inner {
        match child.as_rule() {
            Rule::StripOpen => strip_open = true,
            Rule::StripClose => strip_close = true,
            Rule::MustacheBody => {
                let (p, pars, hp) = build_mustache_body(child, source);
                path = Some(p);
                params = pars;
                hash_pairs = hp;
            }
            Rule::PathExpression => {
                if path.is_none() {
                    path = Some(build_expression_from_path(child, source));
                }
            }
            Rule::SubExpression => {
                if path.is_none() {
                    path = Some(build_sub_expression(child, source));
                }
            }
            Rule::Param => {
                params.push(build_param(child, source));
            }
            Rule::HashPair => {
                hash_pairs.push(build_hash_pair(child, source));
            }
            _ => {
                // Recurse into wrapper rules
                if let Some(inner_pair) = unwrap_single(child) {
                    match inner_pair.as_rule() {
                        Rule::MustacheBody => {
                            let (p, pars, hp) = build_mustache_body(inner_pair, source);
                            path = Some(p);
                            params = pars;
                            hash_pairs = hp;
                        }
                        _ => {}
                    }
                }
            }
        }
    }

    let path = path.unwrap_or_else(|| {
        Expression::Path(PathExpression {
            node_type: "PathExpression",
            original: String::new(),
            head: PathHead::Var(VarHead {
                node_type: "VarHead",
                name: String::new(),
                original: String::new(),
                loc: loc.clone(),
            }),
            tail: vec![],

            loc: loc.clone(),
        })
    });

    let hash_loc = if hash_pairs.is_empty() {
        loc.clone()
    } else {
        SourceLocation {
            start: hash_pairs.first().unwrap().loc.start.clone(),
            end: hash_pairs.last().unwrap().loc.end.clone(),
        }
    };

    MustacheStatement {
        node_type: "MustacheStatement",
        path,
        params,
        hash: Hash {
            node_type: "Hash",
            pairs: hash_pairs,
            loc: hash_loc,
        },
        trusting: is_triple,
        strip: StripFlags {
            open: strip_open,
            close: strip_close,
        },
        loc,
    }
}

fn build_mustache_body(
    pair: Pair<'_, Rule>,
    source: &str,
) -> (Expression, Vec<Expression>, Vec<HashPair>) {
    let mut path = None;
    let mut params = vec![];
    let mut hash_pairs = vec![];

    for child in pair.into_inner() {
        match child.as_rule() {
            Rule::PathExpression => {
                if path.is_none() {
                    path = Some(build_expression_from_path(child, source));
                } else {
                    params.push(build_expression_from_path(child, source));
                }
            }
            Rule::SubExpression => {
                if path.is_none() {
                    path = Some(build_sub_expression(child, source));
                } else {
                    params.push(build_sub_expression(child, source));
                }
            }
            Rule::StringLiteral | Rule::DoubleQuotedString | Rule::SingleQuotedString => {
                let expr = build_string_literal(child, source);
                if path.is_none() {
                    path = Some(expr);
                } else {
                    params.push(expr);
                }
            }
            Rule::NumberLiteral => {
                let expr = build_number_literal(child, source);
                if path.is_none() {
                    path = Some(expr);
                } else {
                    params.push(expr);
                }
            }
            Rule::BooleanLiteral => {
                let expr = build_boolean_literal(child, source);
                if path.is_none() {
                    path = Some(expr);
                } else {
                    params.push(expr);
                }
            }
            Rule::UndefinedLiteral => {
                let expr = build_undefined_literal(child, source);
                if path.is_none() {
                    path = Some(expr);
                } else {
                    params.push(expr);
                }
            }
            Rule::NullLiteral => {
                let expr = build_null_literal(child, source);
                if path.is_none() {
                    path = Some(expr);
                } else {
                    params.push(expr);
                }
            }
            Rule::Param => {
                params.push(build_param(child, source));
            }
            Rule::HashPair => {
                hash_pairs.push(build_hash_pair(child, source));
            }
            _ => {}
        }
    }

    let path = path.unwrap_or_else(|| {
        Expression::Path(PathExpression {
            node_type: "PathExpression",
            original: String::new(),
            head: PathHead::Var(VarHead {
                node_type: "VarHead",
                name: String::new(),
                original: String::new(),
                loc: SourceLocation {
                    start: SourcePosition { line: 1, column: 0 },
                    end: SourcePosition { line: 1, column: 0 },
                },
            }),
            tail: vec![],

            loc: SourceLocation {
                start: SourcePosition { line: 1, column: 0 },
                end: SourcePosition { line: 1, column: 0 },
            },
        })
    });

    (path, params, hash_pairs)
}

fn build_param(pair: Pair<'_, Rule>, source: &str) -> Expression {
    let inner = pair.into_inner().next().expect("Param must have inner expression");
    build_expression(inner, source)
}

fn build_expression(pair: Pair<'_, Rule>, source: &str) -> Expression {
    match pair.as_rule() {
        Rule::PathExpression => build_expression_from_path(pair, source),
        Rule::SubExpression => build_sub_expression(pair, source),
        Rule::StringLiteral | Rule::DoubleQuotedString | Rule::SingleQuotedString => {
            build_string_literal(pair, source)
        }
        Rule::NumberLiteral => build_number_literal(pair, source),
        Rule::BooleanLiteral => build_boolean_literal(pair, source),
        Rule::UndefinedLiteral => build_undefined_literal(pair, source),
        Rule::NullLiteral => build_null_literal(pair, source),
        // For Param and other wrapper rules, descend
        _ => {
            if let Some(inner) = pair.into_inner().next() {
                build_expression(inner, source)
            } else {
                panic!("Unexpected rule in expression position");
            }
        }
    }
}

fn build_expression_from_path(pair: Pair<'_, Rule>, source: &str) -> Expression {
    Expression::Path(build_path_expression(pair, source))
}

fn build_path_expression(pair: Pair<'_, Rule>, source: &str) -> PathExpression {
    let loc = span_to_loc(source, &pair);
    let original = pair.as_str().to_string();

    let (head, tail) = parse_path_parts(&original, &loc);

    PathExpression {
        node_type: "PathExpression",
        original,
        head,
        tail,
        loc,
    }
}

fn parse_path_parts(original: &str, loc: &SourceLocation) -> (PathHead, Vec<String>) {
    let segments: Vec<&str> = original.split('.').collect();

    if segments.is_empty() {
        return (
            PathHead::Var(VarHead {
                node_type: "VarHead",
                name: String::new(),
                original: String::new(),
                loc: loc.clone(),
            }),
            vec![],
        );
    }

    let first = segments[0];
    let tail: Vec<String> = segments[1..].iter().map(|s| s.to_string()).collect();

    // Calculate head location (just the first segment)
    let head_loc = SourceLocation {
        start: loc.start.clone(),
        end: SourcePosition {
            line: loc.start.line,
            column: loc.start.column + first.len(),
        },
    };

    if first == "this" {
        (
            PathHead::This(ThisHead {
                node_type: "ThisHead",
                original: "this",
                loc: head_loc,
            }),
            tail,
        )
    } else if first.starts_with('@') {
        (
            PathHead::At(AtHead {
                node_type: "AtHead",
                name: first.to_string(),
                original: first.to_string(),
                loc: head_loc,
            }),
            tail,
        )
    } else if first.starts_with("../") || first == ".." {
        // Parent reference: ../foo or ../../foo
        // The entire parent ref sequence is the head
        let mut depth = 0;
        let mut remaining = original;
        while remaining.starts_with("../") {
            depth += 1;
            remaining = &remaining[3..];
        }

        let head_name = if remaining.contains('.') {
            remaining.split('.').next().unwrap_or(remaining)
        } else {
            remaining
        };

        let var_tail: Vec<String> = if remaining.contains('.') {
            remaining
                .split('.')
                .skip(1)
                .map(|s| s.to_string())
                .collect()
        } else {
            vec![]
        };

        (
            PathHead::Var(VarHead {
                node_type: "VarHead",
                name: head_name.to_string(),
                original: format!("{}{}", "../".repeat(depth), head_name),
                loc: head_loc,
            }),
            var_tail,
        )
    } else {
        (
            PathHead::Var(VarHead {
                node_type: "VarHead",
                name: first.to_string(),
                original: first.to_string(),
                loc: head_loc,
            }),
            tail,
        )
    }
}

fn build_sub_expression(pair: Pair<'_, Rule>, source: &str) -> Expression {
    let loc = span_to_loc(source, &pair);
    let mut path = None;
    let mut params = vec![];
    let mut hash_pairs = vec![];

    for child in pair.into_inner() {
        match child.as_rule() {
            Rule::PathExpression => {
                if path.is_none() {
                    path = Some(build_expression_from_path(child, source));
                } else {
                    params.push(build_expression_from_path(child, source));
                }
            }
            Rule::SubExpression => {
                if path.is_none() {
                    path = Some(build_sub_expression(child, source));
                } else {
                    params.push(build_sub_expression(child, source));
                }
            }
            Rule::Param => {
                params.push(build_param(child, source));
            }
            Rule::HashPair => {
                hash_pairs.push(build_hash_pair(child, source));
            }
            Rule::StringLiteral | Rule::DoubleQuotedString | Rule::SingleQuotedString => {
                let expr = build_string_literal(child, source);
                if path.is_none() {
                    path = Some(expr);
                } else {
                    params.push(expr);
                }
            }
            Rule::NumberLiteral => {
                let expr = build_number_literal(child, source);
                if path.is_none() {
                    path = Some(expr);
                } else {
                    params.push(expr);
                }
            }
            Rule::BooleanLiteral => {
                let expr = build_boolean_literal(child, source);
                if path.is_none() {
                    path = Some(expr);
                } else {
                    params.push(expr);
                }
            }
            Rule::UndefinedLiteral => {
                let expr = build_undefined_literal(child, source);
                if path.is_none() {
                    path = Some(expr);
                } else {
                    params.push(expr);
                }
            }
            Rule::NullLiteral => {
                let expr = build_null_literal(child, source);
                if path.is_none() {
                    path = Some(expr);
                } else {
                    params.push(expr);
                }
            }
            _ => {}
        }
    }

    let path = path.expect("SubExpression must have a path");

    let hash_loc = if hash_pairs.is_empty() {
        loc.clone()
    } else {
        SourceLocation {
            start: hash_pairs.first().unwrap().loc.start.clone(),
            end: hash_pairs.last().unwrap().loc.end.clone(),
        }
    };

    Expression::SubExpression(Box::new(SubExpression {
        node_type: "SubExpression",
        path,
        params,
        hash: Hash {
            node_type: "Hash",
            pairs: hash_pairs,
            loc: hash_loc,
        },
        loc,
    }))
}

fn build_string_literal(pair: Pair<'_, Rule>, source: &str) -> Expression {
    let loc = span_to_loc(source, &pair);
    let raw = pair.as_str();

    // Remove surrounding quotes
    let value = if (raw.starts_with('"') && raw.ends_with('"'))
        || (raw.starts_with('\'') && raw.ends_with('\''))
    {
        raw[1..raw.len() - 1].to_string()
    } else {
        // might be a wrapper rule
        let inner = pair.into_inner().next();
        if let Some(inner_pair) = inner {
            let inner_raw = inner_pair.as_str();
            if (inner_raw.starts_with('"') && inner_raw.ends_with('"'))
                || (inner_raw.starts_with('\'') && inner_raw.ends_with('\''))
            {
                inner_raw[1..inner_raw.len() - 1].to_string()
            } else {
                inner_raw.to_string()
            }
        } else {
            raw.to_string()
        }
    };

    // Unescape backslash sequences
    let unescaped = value.replace("\\\"", "\"").replace("\\'", "'").replace("\\\\", "\\");

    Expression::StringLiteral(StringLiteral {
        node_type: "StringLiteral",
        value: unescaped.clone(),
        original: unescaped,
        loc,
    })
}

fn build_number_literal(pair: Pair<'_, Rule>, source: &str) -> Expression {
    let loc = span_to_loc(source, &pair);
    let value: f64 = pair.as_str().parse().unwrap_or(0.0);

    Expression::NumberLiteral(NumberLiteral {
        node_type: "NumberLiteral",
        value,
        original: value,
        loc,
    })
}

fn build_boolean_literal(pair: Pair<'_, Rule>, source: &str) -> Expression {
    let loc = span_to_loc(source, &pair);
    let value = pair.as_str() == "true";

    Expression::BooleanLiteral(BooleanLiteral {
        node_type: "BooleanLiteral",
        value,
        original: value,
        loc,
    })
}

fn build_undefined_literal(pair: Pair<'_, Rule>, source: &str) -> Expression {
    let loc = span_to_loc(source, &pair);
    Expression::UndefinedLiteral(UndefinedLiteral {
        node_type: "UndefinedLiteral",
        loc,
    })
}

fn build_null_literal(pair: Pair<'_, Rule>, source: &str) -> Expression {
    let loc = span_to_loc(source, &pair);
    Expression::NullLiteral(NullLiteral {
        node_type: "NullLiteral",
        value: None,
        original: None,
        loc,
    })
}

fn build_hash_pair(pair: Pair<'_, Rule>, source: &str) -> HashPair {
    let loc = span_to_loc(source, &pair);
    let mut key = String::new();
    let mut value = None;

    for child in pair.into_inner() {
        match child.as_rule() {
            Rule::HashKey => {
                key = child.as_str().to_string();
            }
            _ => {
                value = Some(build_expression(child, source));
            }
        }
    }

    HashPair {
        node_type: "HashPair",
        key,
        value: value.expect("HashPair must have a value"),
        loc,
    }
}

fn build_block_statement(pair: Pair<'_, Rule>, source: &str) -> BlockStatement {
    let loc = span_to_loc(source, &pair);
    let mut path = None;
    let mut params_expr = vec![];
    let mut hash_pairs = vec![];
    let mut block_params = vec![];
    let mut body = vec![];
    let mut inverse: Option<Block> = None;
    let mut open_strip = default_strip();
    let mut close_strip = default_strip();
    let mut inverse_strip = default_strip();

    for child in pair.into_inner() {
        match child.as_rule() {
            Rule::BlockOpen => {
                for sub in child.into_inner() {
                    match sub.as_rule() {
                        Rule::StripOpen => open_strip.open = true,
                        Rule::StripClose => open_strip.close = true,
                        Rule::CallExpression => {
                            let (p, pars, hp) = build_call_expression(sub, source);
                            path = Some(p);
                            params_expr = pars;
                            hash_pairs = hp;
                        }
                        Rule::BlockParams => {
                            block_params = build_block_params(sub);
                        }
                        _ => {}
                    }
                }
            }
            Rule::BlockClose => {
                for sub in child.into_inner() {
                    match sub.as_rule() {
                        Rule::StripOpen => close_strip.open = true,
                        Rule::StripClose => close_strip.close = true,
                        _ => {}
                    }
                }
            }
            Rule::InverseChain => {
                let (inv, inv_strip) = build_inverse_chain(child, source);
                inverse = Some(inv);
                inverse_strip = inv_strip;
            }
            _ => {
                if let Some(stmt) = build_statement(child, source) {
                    body.push(stmt);
                }
            }
        }
    }

    let path = path.expect("BlockStatement must have a path");

    let program_loc = if body.is_empty() {
        loc.clone()
    } else {
        SourceLocation {
            start: body.first().map(|s| stmt_loc(s).start.clone()).unwrap_or(loc.start.clone()),
            end: body.last().map(|s| stmt_loc(s).end.clone()).unwrap_or(loc.end.clone()),
        }
    };

    let var_heads: Vec<VarHead> = block_params
        .iter()
        .map(|name| VarHead {
            node_type: "VarHead",
            name: name.clone(),
            original: name.clone(),
            loc: loc.clone(), // approximate
        })
        .collect();

    let hash_loc = if hash_pairs.is_empty() {
        loc.clone()
    } else {
        SourceLocation {
            start: hash_pairs.first().unwrap().loc.start.clone(),
            end: hash_pairs.last().unwrap().loc.end.clone(),
        }
    };

    BlockStatement {
        node_type: "BlockStatement",
        path,
        params: params_expr,
        hash: Hash {
            node_type: "Hash",
            pairs: hash_pairs,
            loc: hash_loc,
        },
        program: Block {
            node_type: "Block",
            body,
            params: var_heads,
            block_params,
            chained: false,
            loc: program_loc,
        },
        inverse,
        open_strip,
        inverse_strip,
        close_strip,
        loc,
    }
}

fn build_call_expression(
    pair: Pair<'_, Rule>,
    source: &str,
) -> (Expression, Vec<Expression>, Vec<HashPair>) {
    let mut path = None;
    let mut params = vec![];
    let mut hash_pairs = vec![];

    for child in pair.into_inner() {
        match child.as_rule() {
            Rule::PathExpression => {
                if path.is_none() {
                    path = Some(build_expression_from_path(child, source));
                } else {
                    params.push(build_expression_from_path(child, source));
                }
            }
            Rule::SubExpression => {
                if path.is_none() {
                    path = Some(build_sub_expression(child, source));
                } else {
                    params.push(build_sub_expression(child, source));
                }
            }
            Rule::Param => {
                params.push(build_param(child, source));
            }
            Rule::HashPair => {
                hash_pairs.push(build_hash_pair(child, source));
            }
            Rule::StringLiteral | Rule::DoubleQuotedString | Rule::SingleQuotedString => {
                let expr = build_string_literal(child, source);
                if path.is_none() {
                    path = Some(expr);
                } else {
                    params.push(expr);
                }
            }
            Rule::NumberLiteral => {
                let expr = build_number_literal(child, source);
                if path.is_none() {
                    path = Some(expr);
                } else {
                    params.push(expr);
                }
            }
            Rule::BooleanLiteral => {
                let expr = build_boolean_literal(child, source);
                if path.is_none() {
                    path = Some(expr);
                } else {
                    params.push(expr);
                }
            }
            _ => {}
        }
    }

    let path = path.expect("CallExpression must have a path");
    (path, params, hash_pairs)
}

fn build_block_params(pair: Pair<'_, Rule>) -> Vec<String> {
    let mut params = vec![];

    for child in pair.into_inner() {
        match child.as_rule() {
            Rule::BlockParamList => {
                for param in child.into_inner() {
                    if param.as_rule() == Rule::BlockParamName {
                        params.push(param.as_str().to_string());
                    }
                }
            }
            _ => {}
        }
    }

    params
}

/// Build a Block for an InverseChain.
///
/// Handles both plain `{{else}}...` and `{{else if cond}}...` chains.
/// For `{{else if cond}}`, the returned Block contains a single nested
/// BlockStatement with `program.chained = true`, matching the legacy
/// handlebars parser's transformation.
///
/// Returns (block, open_strip_flags).
fn build_inverse_chain(pair: Pair<'_, Rule>, source: &str) -> (Block, StripFlags) {
    let loc = span_to_loc(source, &pair);
    let mut strip = default_strip();
    let mut body = vec![];
    let mut else_call: Option<ElseCallInfo> = None;
    let mut block_params: Vec<String> = vec![];
    let mut nested_inverse: Option<Block> = None;
    let mut nested_inverse_strip = default_strip();

    for child in pair.into_inner() {
        match child.as_rule() {
            Rule::InverseBlock => {
                // Unwrap to get the actual InverseSimple or InverseElseBlock
                for inner in child.into_inner() {
                    match inner.as_rule() {
                        Rule::InverseSimple => {
                            for sub in inner.into_inner() {
                                match sub.as_rule() {
                                    Rule::StripOpen => strip.open = true,
                                    Rule::StripClose => strip.close = true,
                                    _ => {}
                                }
                            }
                        }
                        Rule::InverseElseBlock => {
                            let info = parse_inverse_else_block(inner, source);
                            strip = info.strip.clone();
                            else_call = Some(info);
                        }
                        _ => {}
                    }
                }
            }
            Rule::InverseChain => {
                let (inv, inv_strip) = build_inverse_chain(child, source);
                nested_inverse = Some(inv);
                nested_inverse_strip = inv_strip;
            }
            _ => {
                if let Some(stmt) = build_statement(child, source) {
                    body.push(stmt);
                }
            }
        }
    }

    // If this inverse chain starts with `{{else if ...}}`, transform the
    // entire body into a single nested BlockStatement with chained=true.
    if let Some(info) = else_call {
        let program_loc = if body.is_empty() {
            loc.clone()
        } else {
            SourceLocation {
                start: body.first().map(|s| stmt_loc(s).start.clone()).unwrap_or(loc.start.clone()),
                end: body.last().map(|s| stmt_loc(s).end.clone()).unwrap_or(loc.end.clone()),
            }
        };
        let var_heads = block_params_to_var_heads(&block_params, &loc);

        let hash_loc = if info.hash_pairs.is_empty() {
            loc.clone()
        } else {
            SourceLocation {
                start: info.hash_pairs.first().unwrap().loc.start.clone(),
                end: info.hash_pairs.last().unwrap().loc.end.clone(),
            }
        };

        let nested_block = BlockStatement {
            node_type: "BlockStatement",
            path: info.path,
            params: info.params,
            hash: Hash {
                node_type: "Hash",
                pairs: info.hash_pairs,
                loc: hash_loc,
            },
            program: Block {
                node_type: "Block",
                body,
                params: var_heads,
                block_params: block_params.clone(),
                chained: false,
                loc: program_loc,
            },
            inverse: nested_inverse,
            open_strip: info.strip,
            inverse_strip: nested_inverse_strip,
            close_strip: default_strip(),
            loc: loc.clone(),
        };

        return (
            Block {
                node_type: "Block",
                body: vec![Statement::Block(nested_block)],
                params: vec![],
                block_params: vec![],
                chained: true, // marks this inverse as `{{else if}}` chained
                loc,
            },
            strip,
        );
    }

    // Plain `{{else}}` branch — merge body and nested inverse content
    let mut merged_body = body;
    if let Some(inv) = nested_inverse {
        merged_body.extend(inv.body);
    }

    (
        Block {
            node_type: "Block",
            body: merged_body,
            params: vec![],
            block_params: vec![],
            chained: false,
            loc,
        },
        strip,
    )
}

struct ElseCallInfo {
    path: Expression,
    params: Vec<Expression>,
    hash_pairs: Vec<HashPair>,
    strip: StripFlags,
}

fn parse_inverse_else_block(pair: Pair<'_, Rule>, source: &str) -> ElseCallInfo {
    let mut strip = default_strip();
    let mut path = None;
    let mut params = vec![];
    let mut hash_pairs = vec![];

    for sub in pair.into_inner() {
        match sub.as_rule() {
            Rule::StripOpen => strip.open = true,
            Rule::StripClose => strip.close = true,
            Rule::CallExpression => {
                let (p, pars, hp) = build_call_expression(sub, source);
                path = Some(p);
                params = pars;
                hash_pairs = hp;
            }
            _ => {}
        }
    }

    ElseCallInfo {
        path: path.expect("InverseElseBlock must have a call expression"),
        params,
        hash_pairs,
        strip,
    }
}

fn build_html_comment(pair: Pair<'_, Rule>, source: &str) -> CommentStatement {
    let loc = span_to_loc(source, &pair);
    let mut value = String::new();

    for child in pair.into_inner() {
        if child.as_rule() == Rule::HtmlCommentContent {
            value = child.as_str().to_string();
        }
    }

    CommentStatement {
        node_type: "CommentStatement",
        value,
        loc,
    }
}

fn build_mustache_comment(pair: Pair<'_, Rule>, source: &str) -> MustacheCommentStatement {
    let loc = span_to_loc(source, &pair);
    let mut value = String::new();
    let mut strip = default_strip();

    let inner_pair = match pair.as_rule() {
        Rule::MustacheComment => pair.into_inner().next().unwrap(),
        _ => pair,
    };

    for child in inner_pair.into_inner() {
        match child.as_rule() {
            Rule::MustacheCommentLongContent | Rule::MustacheCommentShortContent => {
                value = child.as_str().to_string();
            }
            Rule::StripOpen => strip.open = true,
            Rule::StripClose => strip.close = true,
            _ => {}
        }
    }

    MustacheCommentStatement {
        node_type: "MustacheCommentStatement",
        value,
        strip,
        loc,
    }
}

fn build_element(pair: Pair<'_, Rule>, source: &str) -> ElementNode {
    let loc = span_to_loc(source, &pair);

    // Unwrap Element wrapper if present
    let inner_pair = match pair.as_rule() {
        Rule::Element => pair.into_inner().next().unwrap(),
        _ => pair,
    };

    match inner_pair.as_rule() {
        Rule::NormalElement => build_normal_element(inner_pair, source, loc),
        Rule::SelfClosingElement => build_self_closing_element(inner_pair, source, loc),
        Rule::VoidElement => build_void_element(inner_pair, source, loc),
        _ => panic!("Unexpected element type: {:?}", inner_pair.as_rule()),
    }
}

fn build_normal_element(
    pair: Pair<'_, Rule>,
    source: &str,
    loc: SourceLocation,
) -> ElementNode {
    let mut tag_name = String::new();
    let mut attributes = vec![];
    let mut modifiers = vec![];
    let mut comments = vec![];
    let mut block_params: Vec<String> = vec![];
    let mut children = vec![];
    let mut open_tag = loc.clone();
    let mut close_tag = None;

    for child in pair.into_inner() {
        match child.as_rule() {
            Rule::OpenTag => {
                open_tag = span_to_loc(source, &child);
                for sub in child.into_inner() {
                    match sub.as_rule() {
                        Rule::TagName => tag_name = sub.as_str().to_string(),
                        Rule::Splattributes => {
                            let attr_loc = span_to_loc(source, &sub);
                            attributes.push(AttrNode {
                                node_type: "AttrNode",
                                name: "...attributes".to_string(),
                                value: AttrValue::Text(TextNode {
                                    node_type: "TextNode",
                                    chars: String::new(),
                                    loc: attr_loc.clone(),
                                }),
                                loc: attr_loc,
                            });
                        }
                        Rule::AttrWithValue => {
                            attributes.push(build_attr_with_value(sub, source));
                        }
                        Rule::AttrNameOnly => {
                            attributes.push(build_attr_name_only(sub, source));
                        }
                        Rule::AttrModifier => {
                            modifiers.push(build_element_modifier(sub, source));
                        }
                        Rule::BlockParams => {
                            block_params = build_block_params(sub);
                        }
                        Rule::MustacheComment
                        | Rule::MustacheCommentLong
                        | Rule::MustacheCommentShort => {
                            comments.push(build_mustache_comment(sub, source));
                        }
                        _ => {}
                    }
                }
            }
            Rule::CloseTag => {
                close_tag = Some(span_to_loc(source, &child));
            }
            _ => {
                if let Some(stmt) = build_statement(child, source) {
                    children.push(stmt);
                }
            }
        }
    }

    let path = build_element_path(&tag_name, &loc);

    ElementNode {
        node_type: "ElementNode",
        path,
        self_closing: false,
        attributes,
        params: block_params_to_var_heads(&block_params, &loc),
        modifiers,
        comments,
        children,
        open_tag,
        close_tag,
        tag: tag_name,
        block_params,
        loc,
    }
}

fn build_self_closing_element(
    pair: Pair<'_, Rule>,
    source: &str,
    loc: SourceLocation,
) -> ElementNode {
    let mut tag_name = String::new();
    let mut attributes = vec![];
    let mut modifiers = vec![];
    let mut comments = vec![];
    let mut block_params: Vec<String> = vec![];

    for child in pair.into_inner() {
        match child.as_rule() {
            Rule::TagName => tag_name = child.as_str().to_string(),
            Rule::Splattributes => {
                let attr_loc = span_to_loc(source, &child);
                attributes.push(AttrNode {
                    node_type: "AttrNode",
                    name: "...attributes".to_string(),
                    value: AttrValue::Text(TextNode {
                        node_type: "TextNode",
                        chars: String::new(),
                        loc: attr_loc.clone(),
                    }),
                    loc: attr_loc,
                });
            }
            Rule::AttrWithValue => {
                attributes.push(build_attr_with_value(child, source));
            }
            Rule::AttrNameOnly => {
                attributes.push(build_attr_name_only(child, source));
            }
            Rule::AttrModifier => {
                modifiers.push(build_element_modifier(child, source));
            }
            Rule::BlockParams => {
                block_params = build_block_params(child);
            }
            Rule::MustacheComment | Rule::MustacheCommentLong | Rule::MustacheCommentShort => {
                comments.push(build_mustache_comment(child, source));
            }
            _ => {}
        }
    }

    let path = build_element_path(&tag_name, &loc);

    ElementNode {
        node_type: "ElementNode",
        path,
        self_closing: true,
        attributes,
        params: block_params_to_var_heads(&block_params, &loc),
        modifiers,
        comments,
        children: vec![],
        open_tag: loc.clone(),
        close_tag: None,
        tag: tag_name,
        block_params,
        loc,
    }
}

fn build_void_element(
    pair: Pair<'_, Rule>,
    source: &str,
    loc: SourceLocation,
) -> ElementNode {
    let mut tag_name = String::new();
    let mut attributes = vec![];
    let mut modifiers = vec![];
    let mut comments = vec![];
    let mut self_closing = false;

    for child in pair.into_inner() {
        match child.as_rule() {
            Rule::VoidTagName => tag_name = child.as_str().to_string(),
            Rule::TagEnd => {
                // `/>` marks a self-closing void element like <br />
                if child.as_str() == "/>" {
                    self_closing = true;
                }
            }
            Rule::Splattributes => {
                let attr_loc = span_to_loc(source, &child);
                attributes.push(AttrNode {
                    node_type: "AttrNode",
                    name: "...attributes".to_string(),
                    value: AttrValue::Text(TextNode {
                        node_type: "TextNode",
                        chars: String::new(),
                        loc: attr_loc.clone(),
                    }),
                    loc: attr_loc,
                });
            }
            Rule::AttrWithValue => {
                attributes.push(build_attr_with_value(child, source));
            }
            Rule::AttrNameOnly => {
                attributes.push(build_attr_name_only(child, source));
            }
            Rule::AttrModifier => {
                modifiers.push(build_element_modifier(child, source));
            }
            Rule::MustacheComment | Rule::MustacheCommentLong | Rule::MustacheCommentShort => {
                comments.push(build_mustache_comment(child, source));
            }
            _ => {}
        }
    }

    let path = build_element_path(&tag_name, &loc);

    ElementNode {
        node_type: "ElementNode",
        path,
        self_closing,
        attributes,
        params: vec![],
        modifiers,
        comments,
        children: vec![],
        open_tag: loc.clone(),
        close_tag: None,
        tag: tag_name,
        block_params: vec![],
        loc,
    }
}

fn build_element_path(tag_name: &str, loc: &SourceLocation) -> PathExpression {
    let segments: Vec<&str> = tag_name.split('.').collect();
    let head_name = segments[0];
    let tail: Vec<String> = segments[1..].iter().map(|s| s.to_string()).collect();

    let head_loc = SourceLocation {
        start: loc.start.clone(),
        end: SourcePosition {
            line: loc.start.line,
            column: loc.start.column + head_name.len(),
        },
    };

    // Match head type to its text: <this>, <@arg>, or <Var>/<:block>
    let head = if head_name == "this" {
        PathHead::This(ThisHead {
            node_type: "ThisHead",
            original: "this",
            loc: head_loc,
        })
    } else if head_name.starts_with('@') {
        PathHead::At(AtHead {
            node_type: "AtHead",
            name: head_name.to_string(),
            original: head_name.to_string(),
            loc: head_loc,
        })
    } else {
        PathHead::Var(VarHead {
            node_type: "VarHead",
            name: head_name.to_string(),
            original: head_name.to_string(),
            loc: head_loc,
        })
    };

    PathExpression {
        node_type: "PathExpression",
        original: tag_name.to_string(),
        head,
        tail,
        loc: loc.clone(),
    }
}

fn build_attr_with_value(pair: Pair<'_, Rule>, source: &str) -> AttrNode {
    let loc = span_to_loc(source, &pair);
    let mut name = String::new();
    let mut value = AttrValue::Text(TextNode {
        node_type: "TextNode",
        chars: String::new(),
        loc: loc.clone(),
    });

    for child in pair.into_inner() {
        match child.as_rule() {
            Rule::AttrName => {
                name = child.as_str().to_string();
            }
            Rule::QuotedAttrValue | Rule::DoubleQuotedAttrValue | Rule::SingleQuotedAttrValue => {
                value = build_quoted_attr_value(child, source);
            }
            Rule::UnquotedAttrValue => {
                value = build_unquoted_attr_value(child, source);
            }
            _ => {}
        }
    }

    AttrNode {
        node_type: "AttrNode",
        name,
        value,
        loc,
    }
}

fn build_attr_name_only(pair: Pair<'_, Rule>, source: &str) -> AttrNode {
    let loc = span_to_loc(source, &pair);
    let mut name = String::new();

    for child in pair.into_inner() {
        if child.as_rule() == Rule::AttrName {
            name = child.as_str().to_string();
        }
    }

    AttrNode {
        node_type: "AttrNode",
        name,
        value: AttrValue::Text(TextNode {
            node_type: "TextNode",
            chars: String::new(),
            loc: loc.clone(),
        }),
        loc,
    }
}

fn build_quoted_attr_value(pair: Pair<'_, Rule>, source: &str) -> AttrValue {
    let loc = span_to_loc(source, &pair);

    // Unwrap QuotedAttrValue -> DoubleQuotedAttrValue/SingleQuotedAttrValue
    let inner = match pair.as_rule() {
        Rule::QuotedAttrValue => pair.into_inner().next().unwrap(),
        _ => pair,
    };

    let mut parts: Vec<AttrPart> = vec![];

    for child in inner.into_inner() {
        match child.as_rule() {
            Rule::AttrText_DQ | Rule::AttrText_SQ => {
                let text_loc = span_to_loc(source, &child);
                parts.push(AttrPart::Text(TextNode {
                    node_type: "TextNode",
                    chars: child.as_str().to_string(),
                    loc: text_loc,
                }));
            }
            Rule::AttrMustache | Rule::DoubleMustache => {
                let mustache = build_mustache(child, source);
                parts.push(AttrPart::Mustache(mustache));
            }
            _ => {}
        }
    }

    let has_mustache = parts.iter().any(|p| matches!(p, AttrPart::Mustache(_)));

    if has_mustache {
        // Always produce ConcatStatement for quoted attrs with mustaches
        AttrValue::Concat(ConcatStatement {
            node_type: "ConcatStatement",
            parts,
            loc,
        })
    } else if parts.len() == 1 {
        match parts.into_iter().next().unwrap() {
            AttrPart::Text(t) => AttrValue::Text(t),
            AttrPart::Mustache(m) => AttrValue::Mustache(m),
        }
    } else {
        // Multiple text parts (shouldn't happen, but handle gracefully)
        let chars: String = parts
            .iter()
            .map(|p| match p {
                AttrPart::Text(t) => t.chars.clone(),
                AttrPart::Mustache(_) => String::new(),
            })
            .collect();
        AttrValue::Text(TextNode {
            node_type: "TextNode",
            chars,
            loc,
        })
    }
}

fn build_unquoted_attr_value(pair: Pair<'_, Rule>, source: &str) -> AttrValue {
    let inner = pair.into_inner().next().unwrap();

    match inner.as_rule() {
        Rule::UnquotedMustache | Rule::DoubleMustache => {
            AttrValue::Mustache(build_mustache(inner, source))
        }
        Rule::UnquotedTextValue => {
            let loc = span_to_loc(source, &inner);
            AttrValue::Text(TextNode {
                node_type: "TextNode",
                chars: inner.as_str().to_string(),
                loc,
            })
        }
        _ => {
            let loc = span_to_loc(source, &inner);
            AttrValue::Text(TextNode {
                node_type: "TextNode",
                chars: inner.as_str().to_string(),
                loc,
            })
        }
    }
}

fn build_element_modifier(pair: Pair<'_, Rule>, source: &str) -> ElementModifierStatement {
    let loc = span_to_loc(source, &pair);
    let mut path = None;
    let mut params = vec![];
    let mut hash_pairs = vec![];

    for child in pair.into_inner() {
        match child.as_rule() {
            Rule::CallExpression => {
                let (p, pars, hp) = build_call_expression(child, source);
                path = Some(p);
                params = pars;
                hash_pairs = hp;
            }
            Rule::StripOpen | Rule::StripClose => {}
            _ => {}
        }
    }

    let path = path.expect("ElementModifier must have a path");
    let hash_loc = if hash_pairs.is_empty() {
        loc.clone()
    } else {
        SourceLocation {
            start: hash_pairs.first().unwrap().loc.start.clone(),
            end: hash_pairs.last().unwrap().loc.end.clone(),
        }
    };

    ElementModifierStatement {
        node_type: "ElementModifierStatement",
        path,
        params,
        hash: Hash {
            node_type: "Hash",
            pairs: hash_pairs,
            loc: hash_loc,
        },
        loc,
    }
}

fn block_params_to_var_heads(params: &[String], loc: &SourceLocation) -> Vec<VarHead> {
    params
        .iter()
        .map(|name| VarHead {
            node_type: "VarHead",
            name: name.clone(),
            original: name.clone(),
            loc: loc.clone(),
        })
        .collect()
}

// -- Helpers -----------------------------------------------------------------

fn unwrap_to_body(pair: Pair<'_, Rule>) -> Vec<Pair<'_, Rule>> {
    let mut result = vec![];
    for child in pair.into_inner() {
        result.push(child);
    }
    result
}

fn unwrap_single(pair: Pair<'_, Rule>) -> Option<Pair<'_, Rule>> {
    pair.into_inner().next()
}

fn stmt_loc(stmt: &Statement) -> &SourceLocation {
    match stmt {
        Statement::Mustache(m) => &m.loc,
        Statement::Block(b) => &b.loc,
        Statement::Comment(c) => &c.loc,
        Statement::MustacheComment(c) => &c.loc,
        Statement::Element(e) => &e.loc,
        Statement::Text(t) => &t.loc,
    }
}
