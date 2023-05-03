This document outlines the Well Formedness Constraints in `ASTv2.ebnf`.

# Element Type Match

The literal characters of the `HtmlTagName` that appear in the opening and closing of a `SimpleElement` (before the first whitespace character) must be identical.

# Component Tag Match

The literal characters of the `ExpressionNode` that appear in the opening and closing of an `InvokeComponent` (before the first whitespace character) must be identical.

# Block Tag Match

The literal characters of the `ExpressionNode` that appear in the opening and closing of an `InvokeComponent` (before the first whitespace character) must be identical.

> This might not be literally true, and we should try to figure out what the Handlebars parser does here


