//import HydrationOpcodeCompiler from "../htmlbars-compiler/hydration-opcode-compiler";
//import { preprocess } from "../htmlbars-syntax/parser";
//import { compile } from "../htmlbars-compiler/compiler";
//function opcodesFor(html, options) {
//var ast = preprocess(html, options),
//compiler1 = new HydrationOpcodeCompiler(options);
//compiler1.compile(ast);
//return compiler1.opcodes;
//}
//QUnit.module("HydrationOpcodeCompiler opcode generation");
//function loc(startCol, endCol, startLine=1, endLine=1, source=null) {
//return [
//'loc', [source, [startLine, startCol], [endLine, endCol]]
//];
//}
//function sloc(startCol, endCol, startLine=1, endLine=1, source=null) {
//return ['loc', [source, [startLine, startCol], [endLine, endCol]]];
//}
//function equalOpcodes(actual, expected) {
//let equiv = QUnit.equiv(actual, expected);
//let exString = "";
//let acString = "";
//let i = 0;
//for (; i<actual.length; i++) {
//let a = actual[i];
//let e = expected && expected[i];
//a = a ? JSON.stringify(a).replace(/"/g, "'") : "";
//e = e ? JSON.stringify(e).replace(/"/g, "'") : "";
//exString += e + "\n";
//acString += a + "\n";
//}
//if (expected) {
//for (; i<expected.length; i++) {
//let e = expected[i];
//e = e ? JSON.stringify(e).replace(/"/g, "'") : "";
//acString += "\n";
//exString += e + "\n";
//}
//}
//QUnit.push(equiv, acString, exString);
//}
//function equalStatements(actual, expected) {
//equalOpcodes(actual, expected);
//}
//function testCompile(string, templateSource, opcodes, ...statementList) {
//var template, childTemplates;
//QUnit.module(`Compiling ${string}: ${templateSource}`, {
//setup: function() {
//template = compile(templateSource).raw;
//childTemplates = template.children;
//}
//});
//test("opcodes", function() {
//equalOpcodes(opcodesFor(templateSource), opcodes);
//});
//let statements = statementList.shift();
//test("statements for the root template", function() {
//equalStatements(template.spec.statements, statements);
//});
//test("correct list of child templates", function() {
//equal(template.children.length, statementList.length, "list of child templates should match the expected list of statements");
//});
//for (let i=0, l=statementList.length; i<l; i++) {
//statementTest(statementList, i);
//}
//function statementTest(list, i) {
//test(`statements for template ${i}`, function() {
//equalStatements(childTemplates[i].spec.statements || [], list[i]);
//});
//}
//}
//let s = {
//content(path, loc) {
//return ['content', path, sloc(...loc)];
//},
//block(name, loc, template=null, params=[], hash=[], inverse=null) {
//return ['block', name, params, hash, template, inverse, sloc(...loc)];
//},
//inline(name, params=[], hash=[], loc=null) {
//return [ 'inline', name, params, hash, sloc(...loc) ];
//},
//element(name, params=[], hash=[], loc=null) {
//return [ 'element', name, params, hash, sloc(...loc) ];
//},
//attribute(name, expression) {
//return [ 'attribute', name, expression ];
//},
//component(path, attrs=[], template=null) {
//return [ 'component', path, attrs, template ];
//},
//get(path, loc) {
//return [ 'get', path, sloc(...loc) ];
//},
//concat(...args) {
//return [ 'concat', args ];
//},
//subexpr(name, params=[], hash=[], loc=null) {
//return [ 'subexpr', name, params, hash, sloc(...loc) ];
//}
//};
//QUnit.module(`Compiling <my-component> with isStatic plugin: <my-component />`);
//test("isStatic skips boundary nodes", function() {
//var ast = preprocess('<my-component />');
//ast.body[0].isStatic = true;
//var compiler1 = new HydrationOpcodeCompiler();
//compiler1.compile(ast);
//equalOpcodes(compiler1.opcodes, [
//['createMorph',[0,[],0,0,true]],
//['prepareObject',[0]],
//['pushLiteral',['my-component']],
//['printComponentHook',[0,0,['loc',[null,[1,0],[1,16]]]]]
//]);
//});
//testCompile("simple example", "<div>{{foo}} bar {{baz}}</div>", [
//[ "consumeParent", [ 0 ] ],
//[ "shareElement", [ 0 ] ],
//[ "createMorph", [ 0, [ 0 ], 0, 0, true ] ],
//[ "createMorph", [ 1, [ 0 ], 2, 2, true ] ],
//[ "pushLiteral", [ "foo" ] ],
//[ "printContentHook", [ loc(5, 12) ] ],
//[ "pushLiteral", [ "baz" ] ],
//[ "printContentHook", [ loc(17, 24) ] ],
//[ "popParent", [] ]
//], [
//s.content('foo', [ 5, 12 ]),
//s.content('baz', [ 17, 24 ])
//]);
//testCompile("simple block", "<div>{{#foo}}{{/foo}}</div>", [
//[ "consumeParent", [ 0 ] ],
//[ "createMorph", [ 0, [ 0 ], 0, 0, true ] ],
//[ "prepareObject", [ 0 ] ],
//[ "prepareArray", [ 0 ] ],
//[ "pushLiteral", [ "foo" ] ],
//[ "printBlockHook", [ 0, null, loc(5, 21) ] ],
//[ "popParent", [] ]
//], [
//s.block('foo', [ 5, 21 ], 0)
//], []);
//testCompile("simple block with block params", "<div>{{#foo as |bar baz|}}{{/foo}}</div>", [
//[ "consumeParent", [ 0 ] ],
//[ "createMorph", [ 0, [ 0 ], 0, 0, true ] ],
//[ "prepareObject", [ 0 ] ],
//[ "prepareArray", [ 0 ] ],
//[ "pushLiteral", [ "foo" ] ],
//[ "printBlockHook", [ 0, null, loc(5, 34) ] ],
//[ "popParent", [] ]
//], [
//s.block('foo', [5, 34], 0)
//], []);
//testCompile("element with a sole mustache child", "<div>{{foo}}</div>", [
//[ "consumeParent", [ 0 ] ],
//[ "createMorph", [ 0, [ 0 ], 0, 0, true ] ],
//[ "pushLiteral", [ "foo" ] ],
//[ "printContentHook",[ loc(5, 12) ] ],
//[ "popParent", [] ]
//], [
//s.content('foo', [5, 12])
//]);
//testCompile("element with a mustache between two text nodes", "<div> {{foo}} </div>", [
//[ "consumeParent", [ 0 ] ],
//[ "createMorph", [ 0, [ 0 ], 1, 1, true ] ],
//[ "pushLiteral", [ "foo" ] ],
//[ "printContentHook", [ loc(6, 13) ] ],
//[ "popParent", [] ]
//], [
//s.content('foo', [6, 13])
//]);
//testCompile("mustache two elements deep", "<div><div>{{foo}}</div></div>", [
//[ "consumeParent", [ 0 ] ],
//[ "consumeParent", [ 0 ] ],
//[ "createMorph", [ 0, [ 0, 0 ], 0, 0, true ] ],
//[ "pushLiteral", [ "foo" ] ],
//[ "printContentHook", [ loc(10, 17) ] ],
//[ "popParent", [] ],
//[ "popParent", [] ]
//], [
//s.content('foo', [10, 17])
//]);
//testCompile("two sibling elements with mustaches", "<div>{{foo}}</div><div>{{bar}}</div>", [
//[ "consumeParent", [ 0 ] ],
//[ "createMorph", [ 0, [ 0 ], 0, 0, true ] ],
//[ "pushLiteral", [ "foo" ] ],
//[ "printContentHook", [ loc(5, 12) ] ],
//[ "popParent", [] ],
//[ "consumeParent", [ 1 ] ],
//[ "createMorph", [ 1, [ 1 ], 0, 0, true ] ],
//[ "pushLiteral", [ "bar" ] ],
//[ "printContentHook", [ loc(23, 30) ] ],
//[ "popParent", [] ]
//], [
//s.content('foo', [5, 12]),
//s.content('bar', [23, 30])
//]);
//testCompile("mustaches at the root", "{{foo}} {{bar}}", [
//[ "createMorph", [ 0, [ ], 0, 0, true ] ],
//[ "createMorph", [ 1, [ ], 2, 2, true ] ],
//[ "openBoundary", [ ] ],
//[ "pushLiteral", [ "foo" ] ],
//[ "printContentHook", [ loc(0, 7) ] ],
//[ "closeBoundary", [ ] ],
//[ "pushLiteral", [ "bar" ] ],
//[ "printContentHook", [ loc(8, 15) ] ]
//], [
//s.content('foo', [0, 7]),
//s.content('bar', [8, 15])
//]);
//testCompile("back to back mustaches should have a text node inserted between them", "<div>{{foo}}{{bar}}{{baz}}wat{{qux}}</div>", [
//[ "consumeParent", [ 0 ] ],
//[ "shareElement", [ 0 ] ],
//[ "createMorph", [ 0, [0], 0, 0, true ] ],
//[ "createMorph", [ 1, [0], 1, 1, true ] ],
//[ "createMorph", [ 2, [0], 2, 2, true ] ],
//[ "createMorph", [ 3, [0], 4, 4, true] ],
//[ "pushLiteral", [ "foo" ] ],
//[ "printContentHook", [ loc(5, 12) ] ],
//[ "pushLiteral", [ "bar" ] ],
//[ "printContentHook", [ loc(12, 19) ] ],
//[ "pushLiteral", [ "baz" ] ],
//[ "printContentHook", [ loc(19, 26) ] ],
//[ "pushLiteral", [ "qux" ] ],
//[ "printContentHook", [ loc(29, 36) ] ],
//[ "popParent", [] ]
//], [
//s.content('foo', [5, 12]),
//s.content('bar', [12, 19]),
//s.content('baz', [19, 26]),
//s.content('qux', [29, 36])
//]);
//testCompile("helper usage", "<div>{{foo 'bar' baz.bat true 3.14}}</div>", [
//[ "consumeParent", [ 0 ] ],
//[ "createMorph", [ 0, [0], 0, 0, true ] ],
//[ "prepareObject", [ 0 ] ],
//[ "pushLiteral", [ 3.14 ] ],
//[ "pushLiteral", [ true ] ],
//[ "pushGetHook", [ "baz.bat", loc(17, 24) ] ],
//[ "pushLiteral", [ "bar" ] ],
//[ "prepareArray", [ 4 ] ],
//[ "pushLiteral", [ "foo" ] ],
//[ "printInlineHook", [ loc(5, 36) ] ],
//[ "popParent", [] ]
//], [
//s.inline('foo', [ 'bar', s.get('baz.bat', [17, 24]), true, 3.14 ], [], [5, 36])
//]);
//testCompile("node mustache", "<div {{foo}}></div>", [
//[ "consumeParent", [ 0 ] ],
//[ "prepareObject", [ 0 ] ],
//[ "prepareArray", [ 0 ] ],
//[ "pushLiteral", [ "foo" ] ],
//[ "shareElement", [ 0 ] ],
//[ "createElementMorph", [ 0, 0 ] ],
//[ "printElementHook", [ loc(5, 12) ] ],
//[ "popParent", [] ]
//], [
//s.element('foo', [], [], [ 5, 12 ])
//]);
//testCompile("node helper", "<div {{foo 'bar'}}></div>", [
//[ "consumeParent", [ 0 ] ],
//[ "prepareObject", [ 0 ] ],
//[ "pushLiteral", [ "bar" ] ],
//[ "prepareArray", [ 1 ] ],
//[ "pushLiteral", [ "foo" ] ],
//[ "shareElement", [ 0 ] ],
//[ "createElementMorph", [ 0, 0 ] ],
//[ "printElementHook", [ loc(5, 18) ] ],
//[ "popParent", [] ]
//], [
//s.element('foo', ['bar'], [], [5, 18])
//]);
//testCompile("attribute mustache", "<div class='before {{foo}} after'></div>", [
//[ "consumeParent", [ 0 ] ],
//[ "pushLiteral", [ " after" ] ],
//[ "pushGetHook", [ "foo", loc(21, 24) ] ],
//[ "pushLiteral", [ "before " ] ],
//[ "prepareArray", [ 3 ] ],
//[ "pushConcatHook", [ 0 ] ],
//[ "pushLiteral", [ "class" ] ],
//[ "shareElement", [ 0 ] ],
//[ "createAttrMorph", [ 0, 0, "class", true, null ] ],
//[ "printAttributeHook", [ ] ],
//[ "popParent", [] ]
//], [
//s.attribute('class', s.concat('before ', s.get('foo', [ 21, 24 ]), ' after'))
//]);
//testCompile("quoted attribute mustache", "<div class='{{foo}}'></div>", [
//[ "consumeParent", [ 0 ] ],
//[ "pushGetHook", [ "foo", loc(14, 17) ] ],
//[ "prepareArray", [ 1 ] ],
//[ "pushConcatHook", [ 0 ] ],
//[ "pushLiteral", [ "class" ] ],
//[ "shareElement", [ 0 ] ],
//[ "createAttrMorph", [ 0, 0, "class", true, null ] ],
//[ "printAttributeHook", [ ] ],
//[ "popParent", [] ]
//], [
//s.attribute('class', s.concat(s.get('foo', [ 14, 17 ])))
//]);
//testCompile("safe bare attribute mustache", "<div class={{foo}}></div>", [
//[ "consumeParent", [ 0 ] ],
//[ "pushGetHook", [ "foo", loc(13, 16) ] ],
//[ "pushLiteral", [ "class" ] ],
//[ "shareElement", [ 0 ] ],
//[ "createAttrMorph", [ 0, 0, "class", true, null ] ],
//[ "printAttributeHook", [ ] ],
//[ "popParent", [] ]
//], [
//s.attribute('class', s.get('foo', [ 13, 16 ]))
//]);
//testCompile("unsafe bare attribute mustache", "<div class={{{foo}}}></div>", [
//[ "consumeParent", [ 0 ] ],
//[ "pushGetHook", [ "foo", loc(14, 17) ] ],
//[ "pushLiteral", [ "class" ] ],
//[ "shareElement", [ 0 ] ],
//[ "createAttrMorph", [ 0, 0, "class", false, null ] ],
//[ "printAttributeHook", [ ] ],
//[ "popParent", [] ]
//], [
//s.attribute('class', s.get('foo', [ 14, 17 ]))
//]);
//testCompile("attribute helper", "<div class='before {{foo 'bar'}} after'></div>", [
//[ "consumeParent", [ 0 ] ],
//[ "pushLiteral", [ " after" ] ],
//[ "prepareObject", [ 0 ] ],
//[ "pushLiteral", [ "bar" ] ],
//[ "prepareArray", [ 1 ] ],
//[ "pushLiteral", [ "foo" ] ],
//[ "pushSexprHook", [ loc(19, 32) ] ],
//[ "pushLiteral", [ "before " ] ],
//[ "prepareArray", [ 3 ] ],
//[ "pushConcatHook", [ 0 ] ],
//[ "pushLiteral", [ "class" ] ],
//[ "shareElement", [ 0 ] ],
//[ "createAttrMorph", [ 0, 0, "class", true, null ] ],
//[ "printAttributeHook", [ ] ],
//[ "popParent", [] ]
//], [
//s.attribute('class', s.concat('before ', s.subexpr('foo', [ 'bar' ], [], [19, 32]), ' after'))
//]);
//testCompile("attribute helpers", "<div class='before {{foo 'bar'}} after' id={{bare}}></div>{{morphThing}}<span class='{{ohMy}}'></span>", [
//[ "consumeParent", [ 0 ] ],
//[ "shareElement", [ 0 ] ],
//[ "pushLiteral", [ " after" ] ],
//[ "prepareObject", [ 0 ] ],
//[ "pushLiteral", [ "bar" ] ],
//[ "prepareArray", [ 1 ] ],
//[ "pushLiteral", [ "foo" ] ],
//[ "pushSexprHook", [ loc(19, 32) ] ],
//[ "pushLiteral", [ "before " ] ],
//[ "prepareArray", [ 3 ] ],
//[ "pushConcatHook", [ 0 ] ],
//[ "pushLiteral", [ "class" ] ],
//[ "createAttrMorph", [ 0, 0, "class", true, null ] ],
//[ "printAttributeHook", [ ] ],
//[ "pushGetHook", [ 'bare', loc(45, 49) ] ],
//[ "pushLiteral", [ 'id' ] ],
//[ "createAttrMorph", [ 1, 0, 'id', true, null ] ],
//[ "printAttributeHook", [ ] ],
//[ "popParent", [] ],
//[ "createMorph", [ 2, [], 1, 1, true ] ],
//[ "pushLiteral", [ 'morphThing' ] ],
//[ "printContentHook", [ loc(58, 72) ] ],
//[ "consumeParent", [ 2 ] ],
//[ "pushGetHook", [ 'ohMy', loc(87, 91) ] ],
//[ "prepareArray", [ 1 ] ],
//[ "pushConcatHook", [ 3 ] ],
//[ "pushLiteral", [ 'class' ] ],
//[ "shareElement", [ 1 ] ],
//[ "createAttrMorph", [ 3, 1, 'class', true, null ] ],
//[ "printAttributeHook", [ ] ],
//[ "popParent", [] ]
//], [
//s.attribute('class', s.concat('before ', s.subexpr('foo', ['bar'], [], [ 19, 32 ]), ' after')),
//s.attribute('id', s.get('bare', [ 45, 49 ])),
//s.content('morphThing', [ 58, 72 ]),
//s.attribute('class', s.concat(s.get('ohMy', [ 87, 91 ])))
//]);
//testCompile('component helpers', "<my-component>hello</my-component>", [
//[ "createMorph", [ 0, [ ], 0, 0, true ] ],
//[ "openBoundary", [ ] ],
//[ "closeBoundary", [ ] ],
//[ "prepareObject", [ 0 ] ],
//[ "pushLiteral", [ "my-component" ] ],
//[ "printComponentHook", [ 0, 0, loc(0, 34) ] ]
//], [
//s.component('my-component', [], 0)
//], []);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaHlkcmF0aW9uLW9wY29kZS1jb21waWxlci10ZXN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2h0bWxiYXJzLWNvbXBpbGVyL3Rlc3RzL2h5ZHJhdGlvbi1vcGNvZGUtY29tcGlsZXItdGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSx1RkFBdUY7QUFDdkYseURBQXlEO0FBQ3pELDBEQUEwRDtBQUUxRCxzQ0FBc0M7QUFDcEMsc0NBQXNDO0FBQ2xDLG1EQUFtRDtBQUN2RCx5QkFBeUI7QUFDekIsMkJBQTJCO0FBQzdCLEdBQUc7QUFFSCw0REFBNEQ7QUFFNUQsdUVBQXVFO0FBQ3JFLFVBQVU7QUFDUiwyREFBMkQ7QUFDN0QsSUFBSTtBQUNOLEdBQUc7QUFFSCx3RUFBd0U7QUFDdEUscUVBQXFFO0FBQ3ZFLEdBQUc7QUFFSCwyQ0FBMkM7QUFDekMsNENBQTRDO0FBRTVDLG9CQUFvQjtBQUNwQixvQkFBb0I7QUFDcEIsWUFBWTtBQUVaLGdDQUFnQztBQUM5QixvQkFBb0I7QUFDcEIsa0NBQWtDO0FBRWxDLG9EQUFvRDtBQUNwRCxvREFBb0Q7QUFFcEQsdUJBQXVCO0FBQ3ZCLHVCQUF1QjtBQUN6QixHQUFHO0FBRUgsaUJBQWlCO0FBQ2Ysa0NBQWtDO0FBQ2hDLHNCQUFzQjtBQUV0QixvREFBb0Q7QUFFcEQsbUJBQW1CO0FBQ25CLHVCQUF1QjtBQUN6QixHQUFHO0FBQ0wsR0FBRztBQUVILHdDQUF3QztBQUMxQyxHQUFHO0FBRUgsOENBQThDO0FBQzVDLGlDQUFpQztBQUNuQyxHQUFHO0FBRUgsMkVBQTJFO0FBQ3pFLCtCQUErQjtBQUMvQiwwREFBMEQ7QUFDeEQscUJBQXFCO0FBQ25CLHlDQUF5QztBQUN6QyxxQ0FBcUM7QUFDdkMsR0FBRztBQUNMLEtBQUs7QUFFTCw4QkFBOEI7QUFDNUIsb0RBQW9EO0FBQ3RELEtBQUs7QUFFTCx5Q0FBeUM7QUFFekMsdURBQXVEO0FBQ3JELHdEQUF3RDtBQUMxRCxLQUFL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