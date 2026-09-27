
%x mu emu com raw escl

%{

function strip(start, end) {
  return yytext = yytext.substring(start, yyleng - end + start);
}

%}

LEFT_STRIP    "~"
RIGHT_STRIP   "~"

LOOKAHEAD           [=~}\s\/.)\]|]
LITERAL_LOOKAHEAD   [~}\s)\]]

/*
ID is the inverse of control characters.
Control characters ranges:
  [\s]          Whitespace
  [!"#%-,\./]   !, ", #, %, &, ', (, ), *, +, ,, ., /,  Exceptions in range: $, -
  [;->@]        ;, <, =, >, @,                          Exceptions in range: :, ?
  [\[-\^`]      [, \, ], ^, `,                          Exceptions in range: _
  [\{-~]        {, |, }, ~
*/
ID    [^\s!"#%-,\.\/;->@\[-\^`\{-~]+/{LOOKAHEAD}

%%

[^\x00]*?/("{{")                {
                                   if(yytext.slice(-2) === "\\\\") {
                                     strip(0,1);
                                     this.begin("mu");
                                   } else if(yytext.slice(-1) === "\\") {
                                     strip(0,1);
                                     this.begin("emu");
                                   } else {
                                     this.begin("mu");
                                   }
                                   if(yytext) return 'CONTENT';
                                 }

[^\x00]+                         return 'CONTENT';

// marks CONTENT up to the next mustache or escaped mustache
<emu>[^\x00]{2,}?/("{{"|"\\{{"|"\\\\{{"|<<EOF>>) {
                                   this.popState();
                                   return 'CONTENT';
                                 }

// nested raw block will create stacked 'raw' condition
<raw>"{{{{"/[^/]                 this.begin('raw'); return 'CONTENT';
<raw>"{{{{/"[^\s!"#%-,\.\/;->@\[-\^`\{-~]+/[=}\s\/.]"}}}}" {
                                  this.popState();
                                  // Should be using `this.topState()` below, but it currently
                                  // returns the second top instead of the first top. Opened an
                                  // issue about it at https://github.com/zaach/jison/issues/291
                                  if (this.conditionStack[this.conditionStack.length-1] === 'raw') {
                                    return 'CONTENT';
                                  } else {
                                    strip(5, 9);
                                    return 'END_RAW_BLOCK';
                                  }
                                 }
<raw>[^\x00]+?/("{{{{")          { return 'CONTENT'; }

<com>[\s\S]*?"--"{RIGHT_STRIP}?"}}" {
  this.popState();
  return 'COMMENT';
}

<mu>"("                          return 'OPEN_SEXPR';
<mu>")"                          return 'CLOSE_SEXPR';

<mu>"[" {
  if (yy.syntax.square === 'string') {
    this.unput(yytext);
    // escaped literal
    this.begin('escl');
  } else {
    return 'OPEN_ARRAY';
  }
}
<mu>"]"                          return 'CLOSE_ARRAY';


<mu>"{{{{"                       { return 'OPEN_RAW_BLOCK'; }
<mu>"}}}}"                       {
                                  this.popState();
                                  this.begin('raw');
                                  return 'CLOSE_RAW_BLOCK';
                                 }
<mu>"{{"{LEFT_STRIP}?">"         return 'OPEN_PARTIAL';
<mu>"{{"{LEFT_STRIP}?"#>"        return 'OPEN_PARTIAL_BLOCK';
<mu>"{{"{LEFT_STRIP}?"#""*"?     return 'OPEN_BLOCK';
<mu>"{{"{LEFT_STRIP}?"/"         return 'OPEN_ENDBLOCK';
<mu>"{{"{LEFT_STRIP}?"^"\s*{RIGHT_STRIP}?"}}"        this.popState(); return 'INVERSE';
<mu>"{{"{LEFT_STRIP}?\s*"else"\s*{RIGHT_STRIP}?"}}"  this.popState(); return 'INVERSE';
<mu>"{{"{LEFT_STRIP}?"^"         return 'OPEN_INVERSE';
<mu>"{{"{LEFT_STRIP}?\s*"else"   return 'OPEN_INVERSE_CHAIN';
<mu>"{{"{LEFT_STRIP}?"{"         return 'OPEN_UNESCAPED';
<mu>"{{"{LEFT_STRIP}?"&"         return 'OPEN';
<mu>"{{"{LEFT_STRIP}?"!--" {
  this.unput(yytext);
  this.popState();
  this.begin('com');
}
<mu>"{{"{LEFT_STRIP}?"!"[\s\S]*?"}}" {
  this.popState();
  return 'COMMENT';
}
<mu>"{{"{LEFT_STRIP}?"*"?        return 'OPEN';

<mu>"="                          return 'EQUALS';
<mu>".."                         return 'ID';
<mu>"."/{LOOKAHEAD}              return 'ID';
<mu>".#"                         return 'PRIVATE_SEP';
<mu>[\/.]                        return 'SEP';
<mu>\s+                          // ignore whitespace
<mu>"}"{RIGHT_STRIP}?"}}"        this.popState(); return 'CLOSE_UNESCAPED';
<mu>{RIGHT_STRIP}?"}}"           this.popState(); return 'CLOSE';
<mu>'"'("\\"["]|[^"])*'"'        yytext = strip(1,2).replace(/\\"/g,'"'); return 'STRING';
<mu>"'"("\\"[']|[^'])*"'"        yytext = strip(1,2).replace(/\\'/g,"'"); return 'STRING';
<mu>"@"                          return 'DATA';
<mu>"true"/{LITERAL_LOOKAHEAD}   return 'BOOLEAN';
<mu>"false"/{LITERAL_LOOKAHEAD}  return 'BOOLEAN';
<mu>"undefined"/{LITERAL_LOOKAHEAD} return 'UNDEFINED';
<mu>"null"/{LITERAL_LOOKAHEAD}   return 'NULL';
<mu>\-?[0-9]+(?:\.[0-9]+)?/{LITERAL_LOOKAHEAD} return 'NUMBER';
<mu>"as"\s+"|"                   return 'OPEN_BLOCK_PARAMS';
<mu>"|"                          return 'CLOSE_BLOCK_PARAMS';

<mu>{ID}                         return 'ID';

<escl>'['('\\]'|[^\]])*']' {
  yytext = yytext.replace(/\\([\\\]])/g,'$1');
  this.popState();
  return 'ID';
}

<mu>.                            return 'INVALID';

<INITIAL,mu><<EOF>>              return 'EOF';
