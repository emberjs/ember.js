import { preprocess } from "htmlbars/parser";
import { compileAST } from "htmlbars/compiler/utils";
import { domHelpers } from "htmlbars/runtime";
import { helpers } from "htmlbars/helpers";

export function compile(string, options) {
  return compileSpec(string, options)(domHelpers(helpers));
}

export function compileSpec(string, options) {
  var ast = preprocess(string, options);
  return compileAST(ast, options);
}
