import TemplateCompiler from "../htmlbars-compiler/template-compiler";
import { preprocess } from "../htmlbars-syntax/parser";

QUnit.module("TemplateCompiler");

function countNamespaceChanges(template) {
  var ast = preprocess(template);
  var compiler = new TemplateCompiler();
  var program = compiler.compile(ast);
  var matches = program.match(/dom\.setNamespace/g);
  return matches ? matches.length : 0;
}

test("it omits unnecessary namespace changes", function () {
  equal(countNamespaceChanges('<div></div>'), 0);  // sanity check
  equal(countNamespaceChanges('<div><svg></svg></div><svg></svg>'), 1);
  equal(countNamespaceChanges('<div><svg></svg></div><div></div>'), 2);
  equal(countNamespaceChanges('<div><svg><title>foobar</title></svg></div><svg></svg>'), 1);
  equal(countNamespaceChanges('<div><svg><title><h1>foobar</h1></title></svg></div><svg></svg>'), 3);
});
