import { preprocess } from "htmlbars/parser";
import { HTMLElement, BlockElement } from "htmlbars/ast";
import { compile } from "htmlbars/compiler";
import { registerMacro, removeMacro } from "htmlbars/macros";

export { preprocess, compile, HTMLElement, BlockElement, removeMacro, registerMacro };