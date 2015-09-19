import { parse, print, builders } from '../../htmlbars-syntax';
const b = builders;
function printEqual(template) {
    const ast = parse(template);
    equal(print(ast), template);
}
QUnit.module('[htmlbars-syntax] Code generation');
test('ElementNode: tag', function () {
    printEqual('<h1></h1>');
});
test('ElementNode: nested tags with indent', function () {
    printEqual('<div>\n  <p>Test</p>\n</div>');
});
test('ElementNode: attributes', function () {
    printEqual('<h1 class="foo" id="title"></h1>');
});
test('TextNode: chars', function () {
    printEqual('<h1>Test</h1>');
});
test('MustacheStatement: slash in path', function () {
    printEqual('{{namespace/foo "bar" baz="qux"}}');
});
test('MustacheStatement: path', function () {
    printEqual('<h1>{{model.title}}</h1>');
});
test('MustacheStatement: StringLiteral param', function () {
    printEqual('<h1>{{link-to "Foo"}}</h1>');
});
test('MustacheStatement: hash', function () {
    printEqual('<h1>{{link-to "Foo" class="bar"}}</h1>');
});
test('MustacheStatement: as element attribute', function () {
    printEqual('<h1 class={{if foo "foo" "bar"}}>Test</h1>');
});
test('MustacheStatement: as element attribute with path', function () {
    printEqual('<h1 class={{color}}>Test</h1>');
});
test('ConcatStatement: in element attribute string', function () {
    printEqual('<h1 class="{{if active "active" "inactive"}} foo">Test</h1>');
});
test('ElementModifierStatement', function () {
    printEqual('<p {{action "activate"}} {{someting foo="bar"}}>Test</p>');
});
test('PartialStatement', function () {
    printEqual('<p>{{>something "param"}}</p>');
});
test('SubExpression', function () {
    printEqual('<p>{{my-component submit=(action (mut model.name) (full-name model.firstName "Smith"))}}</p>');
});
test('BlockStatement: multiline', function () {
    printEqual('<ul>{{#each foos as |foo|}}\n  {{foo}}\n{{/each}}</ul>');
});
test('BlockStatement: inline', function () {
    printEqual('{{#if foo}}<p>{{foo}}</p>{{/if}}');
});
test('UndefinedLiteral', function () {
    const ast = b.program([b.mustache(b.undefined())]);
    equal(print(ast), '{{undefined}}');
});
test('NumberLiteral', function () {
    const ast = b.program([
        b.mustache('foo', null, b.hash([b.pair('bar', b.number(5))]))
    ]);
    equal(print(ast), '{{foo bar=5}}');
});
test('BooleanLiteral', function () {
    const ast = b.program([
        b.mustache('foo', null, b.hash([b.pair('bar', b.boolean(true))]))
    ]);
    equal(print(ast), '{{foo bar=true}}');
});
test('HTML comment', function () {
    printEqual('<!-- foo -->');
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJpbnQtdGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3NyYy9odG1sYmFycy1zeW50YXgvdGVzdHMvZ2VuZXJhdGlvbi9wcmludC10ZXN0LnRzIl0sIm5hbWVzIjpbInByaW50RXF1YWwiXSwibWFwcGluZ3MiOiJPQUFPLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsTUFBTSx1QkFBdUI7QUFFOUQsTUFBTSxDQUFDLEdBQUcsUUFBUSxDQUFDO0FBRW5CLG9CQUFvQixRQUFRO0lBQzFCQSxNQUFNQSxHQUFHQSxHQUFHQSxLQUFLQSxDQUFDQSxRQUFRQSxDQUFDQSxDQUFDQTtJQUM1QkEsS0FBS0EsQ0FBQ0EsS0FBS0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsRUFBRUEsUUFBUUEsQ0FBQ0EsQ0FBQ0E7QUFDOUJBLENBQUNBO0FBRUQsS0FBSyxDQUFDLE1BQU0sQ0FBQyxtQ0FBbUMsQ0FBQyxDQUFDO0FBRWxELElBQUksQ0FBQyxrQkFBa0IsRUFBRTtJQUN2QixVQUFVLENBQUMsV0FBVyxDQUFDLENBQUM7QUFDMUIsQ0FBQyxDQUFDLENBQUM7QUFFSCxJQUFJLENBQUMsc0NBQXNDLEVBQUU7SUFDM0MsVUFBVSxDQUFDLDhCQUE4QixDQUFDLENBQUM7QUFDN0MsQ0FBQyxDQUFDLENBQUM7QUFFSCxJQUFJLENBQUMseUJBQXlCLEVBQUU7SUFDOUIsVUFBVSxDQUFDLGtDQUFrQyxDQUFDLENBQUM7QUFDakQsQ0FBQyxDQUFDLENBQUM7QUFFSCxJQUFJLENBQUMsaUJBQWlCLEVBQUU7SUFDdEIsVUFBVSxDQUFDLGVBQWUsQ0FBQyxDQUFDO0FBQzlCLENBQUMsQ0FBQyxDQUFDO0FBRUgsSUFBSSxDQUFDLGtDQUFrQyxFQUFFO0lBQ3ZDLFVBQVUsQ0FBQyxtQ0FBbUMsQ0FBQyxDQUFDO0FBQ2xELENBQUMsQ0FBQyxDQUFDO0FBRUgsSUFBSSxDQUFDLHlCQUF5QixFQUFFO0lBQzlCLFVBQVUsQ0FBQywwQkFBMEIsQ0FBQyxD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