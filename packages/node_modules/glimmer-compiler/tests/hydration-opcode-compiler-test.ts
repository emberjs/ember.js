//import HydrationOpcodeCompiler from "../glimmer-compiler/hydration-opcode-compiler";
//import { preprocess } from "../glimmer-syntax/parser";
//import { compile } from "../glimmer-compiler/compiler";

//function opcodesFor(html, options) {
  //let ast = preprocess(html, options),
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
  //let template, childTemplates;
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
  //let ast = preprocess('<my-component />');
  //ast.body[0].isStatic = true;
  //let compiler1 = new HydrationOpcodeCompiler();
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
