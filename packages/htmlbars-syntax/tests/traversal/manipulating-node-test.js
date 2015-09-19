import { astEqual } from '../support';
import { parse, traverse, builders as b } from '../../htmlbars-syntax';
import { cannotRemoveNode, cannotReplaceNode } from '../../htmlbars-syntax/traversal/errors';
QUnit.module('[htmlbars-syntax] Traversal - manipulating');
['enter', 'exit'].forEach(eventName => {
    QUnit.test(`[${eventName}] Replacing self in a key (returning null)`, assert => {
        let ast = parse(`<x y={{z}} />`);
        let attr = ast.body[0].attributes[0];
        assert.throws(() => {
            traverse(ast, {
                MustacheStatement: {
                    [eventName](node) {
                        if (node.path.parts[0] === 'z') {
                            return null;
                        }
                    }
                }
            });
        }, cannotRemoveNode(attr.value, attr, 'value'));
    });
    QUnit.test(`[${eventName}] Replacing self in a key (returning an empty array)`, assert => {
        let ast = parse(`<x y={{z}} />`);
        let attr = ast.body[0].attributes[0];
        assert.throws(() => {
            traverse(ast, {
                MustacheStatement: {
                    [eventName](node) {
                        if (node.path.parts[0] === 'z') {
                            return [];
                        }
                    }
                }
            });
        }, cannotRemoveNode(attr.value, attr, 'value'));
    });
    QUnit.test(`[${eventName}] Replacing self in a key (returning a node)`, () => {
        let ast = parse(`<x y={{z}} />`);
        traverse(ast, {
            MustacheStatement: {
                [eventName](node) {
                    if (node.path.parts[0] === 'z') {
                        return b.mustache('a');
                    }
                }
            }
        });
        astEqual(ast, `<x y={{a}} />`);
    });
    QUnit.test(`[${eventName}] Replacing self in a key (returning an array with a single node)`, () => {
        let ast = parse(`<x y={{z}} />`);
        traverse(ast, {
            MustacheStatement: {
                [eventName](node) {
                    if (node.path.parts[0] === 'z') {
                        return [b.mustache('a')];
                    }
                }
            }
        });
        astEqual(ast, `<x y={{a}} />`);
    });
    QUnit.test(`[${eventName}] Replacing self in a key (returning an array with multiple nodes)`, assert => {
        let ast = parse(`<x y={{z}} />`);
        let attr = ast.body[0].attributes[0];
        assert.throws(() => {
            traverse(ast, {
                MustacheStatement: {
                    [eventName](node) {
                        if (node.path.parts[0] === 'z') {
                            return [
                                b.mustache('a'),
                                b.mustache('b'),
                                b.mustache('c')
                            ];
                        }
                    }
                }
            });
        }, cannotReplaceNode(attr.value, attr, 'value'));
    });
    QUnit.test(`[${eventName}] Replacing self in an array (returning null)`, () => {
        let ast = parse(`{{x}}{{y}}{{z}}`);
        traverse(ast, {
            MustacheStatement: {
                [eventName](node) {
                    if (node.path.parts[0] === 'y') {
                        return null;
                    }
                }
            }
        });
        astEqual(ast, `{{x}}{{z}}`);
    });
    QUnit.test(`[${eventName}] Replacing self in an array (returning an empty array)`, () => {
        let ast = parse(`{{x}}{{y}}{{z}}`);
        traverse(ast, {
            MustacheStatement: {
                [eventName](node) {
                    if (node.path.parts[0] === 'y') {
                        return [];
                    }
                }
            }
        });
        astEqual(ast, `{{x}}{{z}}`);
    });
    QUnit.test(`[${eventName}] Replacing self in an array (returning a node)`, () => {
        let ast = parse(`{{x}}{{y}}{{z}}`);
        traverse(ast, {
            MustacheStatement: {
                [eventName](node) {
                    if (node.path.parts[0] === 'y') {
                        return b.mustache('a');
                    }
                }
            }
        });
        astEqual(ast, `{{x}}{{a}}{{z}}`);
    });
    QUnit.test(`[${eventName}] Replacing self in an array (returning an array with a single node)`, () => {
        let ast = parse(`{{x}}{{y}}{{z}}`);
        traverse(ast, {
            MustacheStatement: {
                [eventName](node) {
                    if (node.path.parts[0] === 'y') {
                        return [b.mustache('a')];
                    }
                }
            }
        });
        astEqual(ast, `{{x}}{{a}}{{z}}`);
    });
    QUnit.test(`[${eventName}] Replacing self in an array (returning an array with multiple nodes)`, () => {
        let ast = parse(`{{x}}{{y}}{{z}}`);
        traverse(ast, {
            MustacheStatement: {
                [eventName](node) {
                    if (node.path.parts[0] === 'y') {
                        return [
                            b.mustache('a'),
                            b.mustache('b'),
                            b.mustache('c')
                        ];
                    }
                }
            }
        });
        astEqual(ast, `{{x}}{{a}}{{b}}{{c}}{{z}}`);
    });
});
QUnit.module('[htmlbars-syntax] Traversal - manipulating (edge cases)');
QUnit.test('Inside of a block', () => {
    let ast = parse(`{{y}}{{#w}}{{x}}{{y}}{{z}}{{/w}}`);
    traverse(ast, {
        MustacheStatement(node) {
            if (node.path.parts[0] === 'y') {
                return [
                    b.mustache('a'),
                    b.mustache('b'),
                    b.mustache('c')
                ];
            }
        }
    });
    astEqual(ast, `{{a}}{{b}}{{c}}{{#w}}{{x}}{{a}}{{b}}{{c}}{{z}}{{/w}}`);
});
QUnit.test('Exit event is not triggered if the node is replaced during the enter event', assert => {
    let ast = parse(`{{x}}`);
    let didExit = false;
    traverse(ast, {
        MustacheStatement: {
            enter() { return b.mustache('y'); },
            exit() { didExit = true; }
        }
    });
    assert.strictEqual(didExit, false);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFuaXB1bGF0aW5nLW5vZGUtdGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3NyYy9odG1sYmFycy1zeW50YXgvdGVzdHMvdHJhdmVyc2FsL21hbmlwdWxhdGluZy1ub2RlLXRlc3QudHMiXSwibmFtZXMiOlsiW2V2ZW50TmFtZV0iLCJNdXN0YWNoZVN0YXRlbWVudCIsImVudGVyIiwiZXhpdCJdLCJtYXBwaW5ncyI6Ik9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxZQUFZO09BQzlCLEVBQ0wsS0FBSyxFQUNMLFFBQVEsRUFDUixRQUFRLElBQUksQ0FBQyxFQUNkLE1BQU0sdUJBQXVCO09BQ3ZCLEVBQ0wsZ0JBQWdCLEVBQ2hCLGlCQUFpQixFQUNsQixNQUFNLHdDQUF3QztBQUUvQyxLQUFLLENBQUMsTUFBTSxDQUFDLDRDQUE0QyxDQUFDLENBQUM7QUFFM0QsQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDLENBQUMsT0FBTyxDQUFDLFNBQVM7SUFDakMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLFNBQVMsNENBQTRDLEVBQUUsTUFBTTtRQUMxRSxJQUFJLEdBQUcsR0FBRyxLQUFLLENBQUMsZUFBZSxDQUFDLENBQUM7UUFDakMsSUFBSSxJQUFJLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFckMsTUFBTSxDQUFDLE1BQU0sQ0FBQztZQUNaLFFBQVEsQ0FBQyxHQUFHLEVBQUU7Z0JBQ1osaUJBQWlCLEVBQUU7b0JBQ2pCLENBQUMsU0FBUyxDQUFDLENBQUMsSUFBSTt3QkFDZEEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsSUFBSUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsS0FBS0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsS0FBS0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7NEJBQy9CQSxNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQTt3QkFDZEEsQ0FBQ0E7b0JBQ0hBLENBQUNB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