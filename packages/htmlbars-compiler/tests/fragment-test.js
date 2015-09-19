//import FragmentOpcodeCompiler from "../htmlbars-compiler/fragment-opcode-compiler";
//import FragmentJavaScriptCompiler from "../htmlbars-compiler/fragment-javascript-compiler";
//import DOMHelper from "../dom-helper";
//import { preprocess } from "../htmlbars-syntax/parser";
//import { equalHTML, getTextContent } from "../htmlbars-test-helpers";
//var xhtmlNamespace = "http://www.w3.org/1999/xhtml",
//svgNamespace = "http://www.w3.org/2000/svg";
//function fragmentFor(ast) {
//[> jshint evil: true <]
//var fragmentOpcodeCompiler = new FragmentOpcodeCompiler(),
//fragmentCompiler = new FragmentJavaScriptCompiler();
//var opcodes = fragmentOpcodeCompiler.compile(ast);
//var program = fragmentCompiler.compile(opcodes);
//var fn = new Function("env", 'return ' + program)();
//return fn({ dom: new DOMHelper() });
//}
//QUnit.module('fragment');
//test('compiles a fragment', function () {
//var ast = preprocess("<div>{{foo}} bar {{baz}}</div>");
//var divNode = fragmentFor(ast).firstChild;
//equalHTML(divNode, "<div><!----> bar <!----></div>");
//});
//if (document && document.createElementNS) {
//test('compiles an svg fragment', function () {
//var ast = preprocess("<div><svg><circle/><foreignObject><span></span></foreignObject></svg></div>");
//var divNode = fragmentFor(ast).firstChild;
//equal( divNode.childNodes[0].namespaceURI, svgNamespace,
//'svg has the right namespace' );
//equal( divNode.childNodes[0].childNodes[0].namespaceURI, svgNamespace,
//'circle has the right namespace' );
//equal( divNode.childNodes[0].childNodes[1].namespaceURI, svgNamespace,
//'foreignObject has the right namespace' );
//equal( divNode.childNodes[0].childNodes[1].childNodes[0].namespaceURI, xhtmlNamespace,
//'span has the right namespace' );
//});
//}
//test('compiles an svg element with classes', function () {
//var ast = preprocess('<svg class="red right hand"></svg>');
//var svgNode = fragmentFor(ast).firstChild;
//equal(svgNode.getAttribute('class'), 'red right hand');
//});
//if (document && document.createElementNS) {
//test('compiles an svg element with proper namespace', function () {
//var ast = preprocess('<svg><use xlink:title="nice-title"></use></svg>');
//var svgNode = fragmentFor(ast).firstChild;
//equal(svgNode.childNodes[0].getAttributeNS('http://www.w3.org/1999/xlink', 'title'), 'nice-title');
//equal(svgNode.childNodes[0].attributes[0].namespaceURI, 'http://www.w3.org/1999/xlink');
//equal(svgNode.childNodes[0].attributes[0].name, 'xlink:title');
//equal(svgNode.childNodes[0].attributes[0].localName, 'title');
//equal(svgNode.childNodes[0].attributes[0].value, 'nice-title');
//});
//}
//test('converts entities to their char/string equivalent', function () {
//var ast = preprocess("<div title=\"&quot;Foo &amp; Bar&quot;\">lol &lt; &#60;&#x3c; &#x3C; &LT; &NotGreaterFullEqual; &Borksnorlax;</div>");
//var divNode = fragmentFor(ast).firstChild;
//equal(divNode.getAttribute('title'), '"Foo & Bar"');
//equal(getTextContent(divNode), "lol < << < < ≧̸ &Borksnorlax;");
//});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZnJhZ21lbnQtdGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9odG1sYmFycy1jb21waWxlci90ZXN0cy9mcmFnbWVudC10ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLHFGQUFxRjtBQUNyRiw2RkFBNkY7QUFDN0Ysd0NBQXdDO0FBQ3hDLHlEQUF5RDtBQUN6RCx1RUFBdUU7QUFFdkUsc0RBQXNEO0FBQ2xELDhDQUE4QztBQUVsRCw2QkFBNkI7QUFDM0IseUJBQXlCO0FBQ3pCLDREQUE0RDtBQUN4RCxzREFBc0Q7QUFFMUQsb0RBQW9EO0FBQ3BELGtEQUFrRDtBQUVsRCxzREFBc0Q7QUFFdEQsc0NBQXNDO0FBQ3hDLEdBQUc7QUFFSCwyQkFBMkI7QUFFM0IsMkNBQTJDO0FBQ3pDLHlEQUF5RDtBQUN6RCw0Q0FBNEM7QUFFNUMsdURBQXVEO0FBQ3pELEtBQUs7QUFFTCw2Q0FBNkM7QUFDM0MsZ0RBQWdEO0FBQzlDLHNHQUFzRztBQUN0Ryw0Q0FBNEM7QUFFNUMsMERBQTBEO0FBQ25ELGtDQUFrQztBQUN6Qyx3RUFBd0U7QUFDakUscUNBQXFDO0FBQzVDLHdFQUF3RTtBQUNqRSw0Q0FBNEM7QUFDbkQsd0ZBQXdGO0FBQ2pGLG1DQUFtQztBQUM1QyxLQUFLO0FBQ1AsR0FBRztBQUVILDREQUE0RDtBQUMxRCw2REFBNkQ7QUFDN0QsNENBQTRDO0FBRTVDLHlEQUF5RDtBQUMzRCxLQUFLO0FBRUwsNkNBQTZDO0FBQzNDLHFFQUFxRTtBQUNuRSwwRUFBMEU7QUFDMUUsNENBQTRDO0FBRTVDLHFHQUFxRztBQUNyRywwRkFBMEY7QUFDMUYsaUVBQWlFO0FBQ2pFLGdFQUFnRTtBQUNoRSxpRUFBaUU7QUFDbkUsS0FBSztBQUVQLEdBQUc7QUFFSCx5RUFBeUU7QUFDdkUsOElBQThJO0FBQzlJLDRDQUE0QztBQUU1QyxzREFBc0Q7QUFDdEQsa0VBQWtFO0FBQ3BFLEtBQUsifQ==