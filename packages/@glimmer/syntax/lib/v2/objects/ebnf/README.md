This directory contains an EBNF representation of the Glimmer grammar (as represented by ASTv2). It uses [W3C-style EBNF][w3c].

You can view [a live railroad diagram][railroad] of the EBNF.

The `wfc.md` file contains Well-Formedness constraints, which are additional constraints that cannot be expressed directly in terms of EBNF. In particular, they enforce that opening and closing tags must match in various Glimmer constructs.

The current EBNF is sloppy about whitespace rules, but W3C EBNF provides a way to mark productions as `ws: explicit` to indicate that whitespace must be explicitly indicated, and that should be sufficient to fully specify the whitespace rules.

[w3c]: https://www.w3.org/TR/xml/#sec-notation
[railroad]: https://codepen.io/wycats/live/qBZgoXb
