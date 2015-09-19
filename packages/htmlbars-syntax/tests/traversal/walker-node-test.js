import { parse, Walker } from '../../htmlbars-syntax';
function compareWalkedNodes(html, expected) {
    var ast = parse(html);
    var walker = new Walker();
    var nodes = [];
    walker.visit(ast, function (node) {
        nodes.push(node.type);
    });
    deepEqual(nodes, expected);
}
QUnit.module('[htmlbars-syntax] (Legacy) Traversal - Walker');
test('walks elements', function () {
    compareWalkedNodes('<div><li></li></div>', [
        'Program',
        'ElementNode',
        'ElementNode'
    ]);
});
test('walks blocks', function () {
    compareWalkedNodes('{{#foo}}<li></li>{{/foo}}', [
        'Program',
        'BlockStatement',
        'Program',
        'ElementNode'
    ]);
});
test('walks components', function () {
    compareWalkedNodes('<my-foo><li></li></my-foo>', [
        'Program',
        'ComponentNode',
        'Program',
        'ElementNode'
    ]);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2Fsa2VyLW5vZGUtdGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3NyYy9odG1sYmFycy1zeW50YXgvdGVzdHMvdHJhdmVyc2FsL3dhbGtlci1ub2RlLXRlc3QudHMiXSwibmFtZXMiOlsiY29tcGFyZVdhbGtlZE5vZGVzIl0sIm1hcHBpbmdzIjoiT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsTUFBTSx1QkFBdUI7QUFFckQsNEJBQTRCLElBQUksRUFBRSxRQUFRO0lBQ3hDQSxJQUFJQSxHQUFHQSxHQUFHQSxLQUFLQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQTtJQUN0QkEsSUFBSUEsTUFBTUEsR0FBR0EsSUFBSUEsTUFBTUEsRUFBRUEsQ0FBQ0E7SUFDMUJBLElBQUlBLEtBQUtBLEdBQUdBLEVBQUVBLENBQUNBO0lBRWZBLE1BQU1BLENBQUNBLEtBQUtBLENBQUNBLEdBQUdBLEVBQUVBLFVBQVNBLElBQUlBO1FBQzdCLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3hCLENBQUMsQ0FBQ0EsQ0FBQ0E7SUFFSEEsU0FBU0EsQ0FBQ0EsS0FBS0EsRUFBRUEsUUFBUUEsQ0FBQ0EsQ0FBQ0E7QUFDN0JBLENBQUNBO0FBRUQsS0FBSyxDQUFDLE1BQU0sQ0FBQywrQ0FBK0MsQ0FBQyxDQUFDO0FBRTlELElBQUksQ0FBQyxnQkFBZ0IsRUFBRTtJQUNyQixrQkFBa0IsQ0FBQyxzQkFBc0IsRUFBRTtRQUN6QyxTQUFTO1FBQ1QsYUFBYTtRQUNiLGFBQWE7S0FDZCxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FBQztBQUVILElBQUksQ0FBQyxjQUFjLEVBQUU7SUFDbkIsa0JBQWtCLENBQUMsMkJBQTJCLEVBQUU7UUFDOUMsU0FBUztRQUNULGdCQUFnQjtRQUNoQixTQUFTO1FBQ1QsYUFBYTtLQUNkLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQyxDQUFDO0FBRUgsSUFBSSxDQUFDLGtCQUFrQixFQUFFO0lBQ3ZCLGtCQUFrQixDQUFDLDRCQUE0QixFQUFFO1FBQy9DLFNBQVM7UUFDVCxlQUFlO1FBQ2YsU0FBUztRQUNULGFBQWE7S0FDZCxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FBQyJ9