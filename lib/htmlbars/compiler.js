import { preprocess } from "htmlbars/parser";
import { compileAST } from "htmlbars/compiler-utils";

function compile(string, options) {
  var ast = preprocess(string);
  return compileAST(ast, options);
}

export { compile };