use pest::Parser;
use pest_derive::Parser;
use wasm_bindgen::prelude::*;

mod ast;
mod builder;
mod errors;

#[derive(Parser)]
#[grammar = "glimmer.pest"]
pub struct GlimmerParser;

/// Parse a Glimmer/Handlebars template string and return an ASTv1 Template as a JSON string.
///
/// The JS side parses the JSON into a plain object then decorates it with
/// SourceSpans, non-enumerable getters, etc. This avoids a wasm-bindgen
/// serde bridge and keeps the wasm binary smaller.
#[wasm_bindgen(js_name = "parseTemplateToJson")]
pub fn parse_template_to_json(source: &str, src_name: Option<String>) -> Result<String, String> {
    let result = GlimmerParser::parse(Rule::Template, source);

    match result {
        Ok(pairs) => {
            let template = builder::build_template(pairs, source, src_name.as_deref());
            serde_json::to_string(&template).map_err(|e| format!("Serialization error: {e}"))
        }
        Err(pest_error) => {
            let parse_error = errors::convert_pest_error(&pest_error, source, src_name.as_deref());
            Err(serde_json::to_string(&parse_error)
                .unwrap_or_else(|_| format!("Parse error: {pest_error}")))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_simple_text() {
        let result = GlimmerParser::parse(Rule::Template, "Hello world");
        assert!(result.is_ok(), "Failed to parse simple text: {:?}", result.err());
    }

    #[test]
    fn test_parse_mustache() {
        let result = GlimmerParser::parse(Rule::Template, "{{foo}}");
        assert!(result.is_ok(), "Failed to parse mustache: {:?}", result.err());
    }

    #[test]
    fn test_parse_element() {
        let result = GlimmerParser::parse(Rule::Template, "<div>hello</div>");
        assert!(result.is_ok(), "Failed to parse element: {:?}", result.err());
    }

    #[test]
    fn test_parse_self_closing() {
        let result = GlimmerParser::parse(Rule::Template, "<br />");
        assert!(result.is_ok(), "Failed to parse self-closing: {:?}", result.err());
    }

    #[test]
    fn test_parse_block() {
        let result = GlimmerParser::parse(Rule::Template, "{{#if cond}}yes{{else}}no{{/if}}");
        assert!(result.is_ok(), "Failed to parse block: {:?}", result.err());
    }

    #[test]
    fn test_parse_element_with_attrs() {
        let result = GlimmerParser::parse(Rule::Template, r#"<div class="foo" id={{bar}}>content</div>"#);
        assert!(result.is_ok(), "Failed to parse element with attrs: {:?}", result.err());
    }

    #[test]
    fn test_parse_mustache_comment() {
        let result = GlimmerParser::parse(Rule::Template, "{{!-- this is a comment --}}");
        assert!(result.is_ok(), "Failed to parse mustache comment: {:?}", result.err());
    }

    #[test]
    fn test_parse_html_comment() {
        let result = GlimmerParser::parse(Rule::Template, "<!-- html comment -->");
        assert!(result.is_ok(), "Failed to parse html comment: {:?}", result.err());
    }

    #[test]
    fn test_parse_component() {
        let result = GlimmerParser::parse(Rule::Template, "<MyComponent @arg={{val}} />");
        assert!(result.is_ok(), "Failed to parse component: {:?}", result.err());
    }

    #[test]
    fn test_parse_block_params() {
        let result = GlimmerParser::parse(Rule::Template, "{{#each items as |item index|}}{{item}}{{/each}}");
        assert!(result.is_ok(), "Failed to parse block params: {:?}", result.err());
    }

    #[test]
    fn test_parse_named_block() {
        let result = GlimmerParser::parse(Rule::Template, "<MyComponent><:header>Title</:header></MyComponent>");
        assert!(result.is_ok(), "Failed to parse named block: {:?}", result.err());
    }

    #[test]
    fn test_parse_sub_expression() {
        let result = GlimmerParser::parse(Rule::Template, "{{(helper arg)}}");
        assert!(result.is_ok(), "Failed to parse sub expression: {:?}", result.err());
    }

    #[test]
    fn test_parse_triple_mustache() {
        let result = GlimmerParser::parse(Rule::Template, "{{{raw}}}");
        assert!(result.is_ok(), "Failed to parse triple mustache: {:?}", result.err());
    }

    #[test]
    fn test_parse_concat_attr() {
        let result = GlimmerParser::parse(Rule::Template, r#"<div class="foo {{bar}} baz"></div>"#);
        assert!(result.is_ok(), "Failed to parse concat attr: {:?}", result.err());
    }

    #[test]
    fn test_parse_splattributes() {
        let result = GlimmerParser::parse(Rule::Template, "<div ...attributes></div>");
        assert!(result.is_ok(), "Failed to parse splattributes: {:?}", result.err());
    }

    #[test]
    fn test_parse_modifier() {
        let result = GlimmerParser::parse(Rule::Template, r#"<div {{on "click" this.handleClick}}></div>"#);
        assert!(result.is_ok(), "Failed to parse modifier: {:?}", result.err());
    }

    #[test]
    fn test_parse_hash_pairs() {
        let result = GlimmerParser::parse(Rule::Template, "{{component name=value class=\"foo\"}}");
        assert!(result.is_ok(), "Failed to parse hash pairs: {:?}", result.err());
    }

    #[test]
    fn test_parse_this_path() {
        let result = GlimmerParser::parse(Rule::Template, "{{this.foo}}");
        assert!(result.is_ok(), "Failed to parse this path: {:?}", result.err());
    }

    #[test]
    fn test_parse_at_path() {
        let result = GlimmerParser::parse(Rule::Template, "{{@name}}");
        assert!(result.is_ok(), "Failed to parse at path: {:?}", result.err());
    }

    #[test]
    fn test_parse_void_element() {
        let result = GlimmerParser::parse(Rule::Template, "<input type=\"text\">");
        assert!(result.is_ok(), "Failed to parse void element: {:?}", result.err());
    }

    #[test]
    fn test_parse_escaped_mustache() {
        let result = GlimmerParser::parse(Rule::Template, "\\{{not a mustache}}");
        assert!(result.is_ok(), "Failed to parse escaped mustache: {:?}", result.err());
    }
}
