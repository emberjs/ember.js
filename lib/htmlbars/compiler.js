import { preprocess } from "htmlbars/parser";
import { HTMLElement, BlockElement } from "htmlbars/ast";
import { Compiler1 } from "htmlbars/compiler-pass1";
import { Compiler2 } from "htmlbars/compiler-pass2";
import { processOpcodes, prepareHelper, compileAST, invokeMethod, invokeFunction, helper, escapeString, quotedString, quotedArray, array, hash, pushElement, popElement, topElement, pushStack, pushStackLiteral, popStack, topStack } from "htmlbars/compiler-utils";

function compile(string, options) {
  var ast = preprocess(string);
  return compileAST(ast, options);
}

export { compile };
