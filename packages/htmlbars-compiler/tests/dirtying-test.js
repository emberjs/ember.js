import { compile } from "../htmlbars-compiler/compiler";
import { manualElement } from "../htmlbars-runtime/render";
import { hostBlock } from "../htmlbars-runtime/hooks";
import { blockFor } from "../htmlbars-util/template-utils";
import DOMHelper from "../dom-helper";
import { equalTokens } from "../htmlbars-test-helpers";
import { TestEnvironment, TestBaseReference } from "./support";
var hooks, env, dom, root;
function rootElement() {
    return dom.createElement('div');
}
function commonSetup() {
    dom = new DOMHelper();
    env = new TestEnvironment({ dom, BaseReference: TestBaseReference });
    root = rootElement();
    env.registerHelper('if', function (params, hash, options) {
        if (!!params[0]) {
            return options.template.yield();
        }
        else if (options.inverse) {
            return options.inverse.yield();
        }
    });
    env.registerHelper('each', function (params) {
        var list = params[0];
        for (var i = 0, l = list.length; i < l; i++) {
            var item = list[i];
            if (this.arity > 0) {
                this.yieldItem(item.key, [item]);
            }
            else {
                this.yieldItem(item.key, undefined, item);
            }
        }
    });
}
function render(template, context = {}) {
    return template.render(context, env, { appendTo: root });
}
QUnit.module("HTML-based compiler (dirtying)", {
    beforeEach: commonSetup
});
test("a simple implementation of a dirtying rerender", function () {
    var object = { condition: true, value: 'hello world' };
    var template = compile('<div>{{#if condition}}<p>{{value}}</p>{{else}}<p>Nothing</p>{{/if}}</div>');
    var result = render(template, object);
    var valueNode = root.firstChild.firstChild.firstChild;
    equalTokens(root, '<div><p>hello world</p></div>', "Initial render");
    result.rerender();
    equalTokens(root, '<div><p>hello world</p></div>', "After dirtying but not updating");
    strictEqual(root.firstChild.firstChild.firstChild, valueNode, "The text node was not blown away");
    // Even though the #if was stable, a dirty child node is updated
    object.value = 'goodbye world';
    result.rerender();
    equalTokens(root, '<div><p>goodbye world</p></div>', "After updating and dirtying");
    strictEqual(root.firstChild.firstChild.firstChild, valueNode, "The text node was not blown away");
    object.condition = false;
    result.rerender();
    equalTokens(root, '<div><p>Nothing</p></div>', "And then dirtying");
    QUnit.notStrictEqual(root.firstChild.firstChild.firstChild, valueNode, "The text node was not blown away");
});
test("a simple implementation of a dirtying rerender without inverse", function () {
    var object = { condition: true, value: 'hello world' };
    var template = compile('<div>{{#if condition}}<p>{{value}}</p>{{/if}}</div>');
    var result = render(template, object);
    equalTokens(root, '<div><p>hello world</p></div>', "Initial render");
    object.condition = false;
    result.rerender();
    equalTokens(root, '<div><!----></div>', "If the condition is false, the morph becomes empty");
    object.condition = true;
    result.rerender();
    equalTokens(root, '<div><p>hello world</p></div>', "If the condition is true, the morph repopulates");
});
test("block helpers whose template has a morph at the edge", function () {
    env.registerHelper('id', function (params, hash, options) {
        return options.template.yield();
    });
    var template = compile("{{#id}}{{value}}{{/id}}");
    var object = { value: "hello world" };
    let result = render(template, object);
    equalTokens(root, 'hello world');
    var firstNode = result.root.firstNode;
    equal(firstNode.nodeType, 3, "the first node of the helper should be a text node");
    equal(firstNode.nodeValue, "hello world", "its content should be hello world");
    strictEqual(firstNode.nextSibling, null, "there should only be one nodes");
});
test("clean content doesn't get blown away", function () {
    var template = compile("<div>{{value}}</div>");
    var object = { value: "hello" };
    var result = render(template, object);
    var textNode = root.firstChild.firstChild;
    equal(textNode.nodeValue, "hello");
    object.value = "goodbye";
    result.revalidate(); // without setting the node to dirty
    equalTokens(root, '<div>hello</div>');
    object.value = "hello";
    result.rerender();
    textNode = root.firstChild.firstChild;
    equal(textNode.nodeValue, "hello");
});
test("helper calls follow the normal dirtying rules", function () {
    env.registerHelper('capitalize', function (params) {
        return params[0].toUpperCase();
    });
    var template = compile("<div>{{capitalize value}}</div>");
    var object = { value: "hello" };
    var result = render(template, object);
    var textNode = root.firstChild.firstChild;
    equal(textNode.nodeValue, "HELLO");
    object.value = "goodbye";
    result.revalidate(); // without setting the node to dirty
    equalTokens(root, '<div>HELLO</div>');
    result.rerender();
    equalTokens(root, '<div>GOODBYE</div>');
    // Checks normalized value, not raw value
    object.value = "GoOdByE";
    result.rerender();
    textNode = root.firstChild.firstChild;
    equal(textNode.nodeValue, "GOODBYE");
});
test("attribute nodes follow the normal dirtying rules", function () {
    var template = compile("<div class={{value}}>hello</div>");
    var object = { value: "world" };
    var result = render(template, object);
    equalTokens(root, "<div class='world'>hello</div>", "Initial render");
    object.value = "universe";
    result.revalidate(); // without setting the node to dirty
    equalTokens(root, "<div class='world'>hello</div>", "Revalidating without dirtying");
    var attrRenderNode = result.root.childMorphs[0];
    result.rerender();
    equalTokens(root, "<div class='universe'>hello</div>", "Revalidating after dirtying");
    attrRenderNode.setContent = function () {
        ok(false, "Should not get called");
    };
    object.value = "universe";
    result.rerender();
    equalTokens(root, "<div class='universe'>hello</div>", "Revalidating after dirtying");
});
test("attribute nodes w/ concat follow the normal dirtying rules", function () {
    var template = compile("<div class='hello {{value}}'>hello</div>");
    var object = { value: "world" };
    var result = render(template, object);
    equalTokens(root, "<div class='hello world'>hello</div>");
    object.value = "universe";
    result.revalidate(); // without setting the node to dirty
    equalTokens(root, "<div class='hello world'>hello</div>");
    var attrRenderNode = result.root.childMorphs[0];
    result.rerender();
    equalTokens(root, "<div class='hello universe'>hello</div>");
    attrRenderNode.setContent = function () {
        ok(false, "Should not get called");
    };
    object.value = "universe";
    result.rerender();
});
testEachHelper("An implementation of #each using block params", "<ul>{{#each list as |item|}}<li class={{item.class}}>{{item.name}}</li>{{/each}}</ul>");
testEachHelper("An implementation of #each using a self binding", "<ul>{{#each list}}<li class={{class}}>{{name}}</li>{{/each}}</ul>");
function testEachHelper(testName, templateSource) {
    test(testName, function () {
        var template = compile(templateSource);
        var object = { list: [
                { key: "1", name: "Tom Dale", "class": "tomdale" },
                { key: "2", name: "Yehuda Katz", "class": "wycats" }
            ] };
        var result = render(template, object);
        var itemNode = getItemNode('tomdale');
        var nameNode = getNameNode('tomdale');
        equalTokens(root, "<ul><li class='tomdale'>Tom Dale</li><li class='wycats'>Yehuda Katz</li></ul>", "Initial render");
        rerender();
        assertStableNodes('tomdale', "after no-op rerender");
        equalTokens(root, "<ul><li class='tomdale'>Tom Dale</li><li class='wycats'>Yehuda Katz</li></ul>", "After no-op re-render");
        result.revalidate();
        assertStableNodes('tomdale', "after non-dirty rerender");
        equalTokens(root, "<ul><li class='tomdale'>Tom Dale</li><li class='wycats'>Yehuda Katz</li></ul>", "After no-op re-render");
        object = { list: [object.list[1], object.list[0]] };
        rerender(object);
        assertStableNodes('tomdale', "after changing the list order");
        equalTokens(root, "<ul><li class='wycats'>Yehuda Katz</li><li class='tomdale'>Tom Dale</li></ul>", "After changing the list order");
        object = { list: [
                { key: "1", name: "Martin Muñoz", "class": "mmun" },
                { key: "2", name: "Kris Selden", "class": "krisselden" }
            ] };
        rerender(object);
        assertStableNodes('mmun', "after changing the list entries, but with stable keys");
        equalTokens(root, "<ul><li class='mmun'>Martin Muñoz</li><li class='krisselden'>Kris Selden</li></ul>", "After changing the list entries, but with stable keys");
        object = { list: [
                { key: "1", name: "Martin Muñoz", "class": "mmun" },
                { key: "2", name: "Kristoph Selden", "class": "krisselden" },
                { key: "3", name: "Matthew Beale", "class": "mixonic" }
            ] };
        rerender(object);
        assertStableNodes('mmun', "after adding an additional entry");
        equalTokens(root, "<ul><li class='mmun'>Martin Muñoz</li><li class='krisselden'>Kristoph Selden</li><li class='mixonic'>Matthew Beale</li></ul>", "After adding an additional entry");
        object = { list: [
                { key: "1", name: "Martin Muñoz", "class": "mmun" },
                { key: "3", name: "Matthew Beale", "class": "mixonic" }
            ] };
        rerender(object);
        assertStableNodes('mmun', "after removing the middle entry");
        equalTokens(root, "<ul><li class='mmun'>Martin Muñoz</li><li class='mixonic'>Matthew Beale</li></ul>", "after removing the middle entry");
        object = { list: [
                { key: "1", name: "Martin Muñoz", "class": "mmun" },
                { key: "4", name: "Stefan Penner", "class": "stefanpenner" },
                { key: "5", name: "Robert Jackson", "class": "rwjblue" }
            ] };
        rerender(object);
        assertStableNodes('mmun', "after adding two more entries");
        equalTokens(root, "<ul><li class='mmun'>Martin Muñoz</li><li class='stefanpenner'>Stefan Penner</li><li class='rwjblue'>Robert Jackson</li></ul>", "After adding two more entries");
        // New node for stability check
        itemNode = getItemNode('rwjblue');
        nameNode = getNameNode('rwjblue');
        object = { list: [
                { key: "5", name: "Robert Jackson", "class": "rwjblue" }
            ] };
        rerender(object);
        assertStableNodes('rwjblue', "after removing two entries");
        equalTokens(root, "<ul><li class='rwjblue'>Robert Jackson</li></ul>", "After removing two entries");
        object = { list: [
                { key: "1", name: "Martin Muñoz", "class": "mmun" },
                { key: "4", name: "Stefan Penner", "class": "stefanpenner" },
                { key: "5", name: "Robert Jackson", "class": "rwjblue" }
            ] };
        rerender(object);
        assertStableNodes('rwjblue', "after adding back entries");
        equalTokens(root, "<ul><li class='mmun'>Martin Muñoz</li><li class='stefanpenner'>Stefan Penner</li><li class='rwjblue'>Robert Jackson</li></ul>", "After adding back entries");
        // New node for stability check
        itemNode = getItemNode('mmun');
        nameNode = getNameNode('mmun');
        object = { list: [
                { key: "1", name: "Martin Muñoz", "class": "mmun" }
            ] };
        rerender(object);
        assertStableNodes('mmun', "after removing from the back");
        equalTokens(root, "<ul><li class='mmun'>Martin Muñoz</li></ul>", "After removing from the back");
        object = { list: [] };
        rerender(object);
        strictEqual(root.firstChild.firstChild.nodeType, 8, "there are no li's after removing the remaining entry");
        equalTokens(root, "<ul><!----></ul>", "After removing the remaining entries");
        function rerender(context) {
            result.rerender(env, context);
        }
        function assertStableNodes(className, message) {
            strictEqual(getItemNode(className), itemNode, "The item node has not changed " + message);
            strictEqual(getNameNode(className), nameNode, "The name node has not changed " + message);
        }
        function getItemNode(className) {
            // <li>
            var itemNode = root.firstChild.firstChild;
            while (itemNode) {
                if (itemNode.getAttribute('class') === className) {
                    break;
                }
                itemNode = itemNode.nextSibling;
            }
            ok(itemNode, "Expected node with class='" + className + "'");
            return itemNode;
        }
        function getNameNode(className) {
            // {{item.name}}
            var itemNode = getItemNode(className);
            ok(itemNode, "Expected child node of node with class='" + className + "', but no parent node found");
            var childNode = itemNode && itemNode.firstChild;
            ok(childNode, "Expected child node of node with class='" + className + "', but not child node found");
            return childNode;
        }
    });
}
test("Returning true from `linkRenderNodes` makes the value itself stable across renders", function () {
    var streams = { hello: { value: "hello" }, world: { value: "world" } };
    hooks.linkRenderNode = function () {
        return true;
    };
    hooks.getValue = function (stream) {
        return stream();
    };
    var concatCalled = 0;
    hooks.concat = function (env, params) {
        ok(++concatCalled === 1, "The concat hook is only invoked one time (invoked " + concatCalled + " times)");
        return function () {
            return params[0].value + params[1] + params[2].value;
        };
    };
    var template = compile("<div class='{{hello}} {{world}}'></div>");
    var result = render(template, streams);
    equalTokens(root, "<div class='hello world'></div>");
    streams.hello.value = "goodbye";
    result.rerender();
    equalTokens(root, "<div class='goodbye world'></div>");
});
var destroyedRenderNodeCount;
var destroyedRenderNode;
QUnit.module("HTML-based compiler (dirtying) - pruning", {
    beforeEach: function () {
        commonSetup();
        destroyedRenderNodeCount = 0;
        destroyedRenderNode = null;
        hooks.destroyRenderNode = function (renderNode) {
            destroyedRenderNode = renderNode;
            destroyedRenderNodeCount++;
        };
    }
});
test("Pruned render nodes invoke a cleanup hook when replaced", function () {
    var object = { condition: true, value: 'hello world', falsy: "Nothing" };
    var template = compile('<div>{{#if condition}}<p>{{value}}</p>{{else}}<p>{{falsy}}</p>{{/if}}</div>');
    var result = render(template, object);
    equalTokens(root, "<div><p>hello world</p></div>");
    object.condition = false;
    result.rerender();
    strictEqual(destroyedRenderNodeCount, 1, "cleanup hook was invoked once");
    strictEqual(destroyedRenderNode.lastValue, 'hello world', "The correct render node is passed in");
    object.condition = true;
    result.rerender();
    strictEqual(destroyedRenderNodeCount, 2, "cleanup hook was invoked again");
    strictEqual(destroyedRenderNode.lastValue, 'Nothing', "The correct render node is passed in");
});
test("MorphLists in childMorphs are properly cleared", function () {
    var object = {
        condition: true,
        falsy: "Nothing",
        list: [
            { key: "1", word: 'Hello' },
            { key: "2", word: 'World' }
        ]
    };
    var template = compile('<div>{{#if condition}}{{#each list as |item|}}<p>{{item.word}}</p>{{/each}}{{else}}<p>{{falsy}}</p>{{/if}}</div>');
    var result = render(template, object);
    equalTokens(root, "<div><p>Hello</p><p>World</p></div>");
    object.condition = false;
    result.rerender();
    equalTokens(root, "<div><p>Nothing</p></div>");
    strictEqual(destroyedRenderNodeCount, 5, "cleanup hook was invoked for each morph");
    object.condition = true;
    result.rerender();
    strictEqual(destroyedRenderNodeCount, 6, "cleanup hook was invoked again");
});
test("Pruned render nodes invoke a cleanup hook when cleared", function () {
    var object = { condition: true, value: 'hello world' };
    var template = compile('<div>{{#if condition}}<p>{{value}}</p>{{/if}}</div>');
    var result = render(template, object);
    equalTokens(root, "<div><p>hello world</p></div>");
    object.condition = false;
    result.rerender();
    strictEqual(destroyedRenderNodeCount, 1, "cleanup hook was invoked once");
    strictEqual(destroyedRenderNode.lastValue, 'hello world', "The correct render node is passed in");
    object.condition = true;
    result.rerender();
    strictEqual(destroyedRenderNodeCount, 1, "cleanup hook was not invoked again");
});
test("Pruned lists invoke a cleanup hook when removing elements", function () {
    var object = { list: [{ key: "1", word: "hello" }, { key: "2", word: "world" }] };
    var template = compile('<div>{{#each list as |item|}}<p>{{item.word}}</p>{{/each}}</div>');
    var result = render(template, object);
    equalTokens(root, "<div><p>hello</p><p>world</p></div>");
    object.list.pop();
    result.rerender();
    strictEqual(destroyedRenderNodeCount, 2, "cleanup hook was invoked once for the wrapper morph and once for the {{item.word}}");
    strictEqual(destroyedRenderNode.lastValue, "world", "The correct render node is passed in");
    object.list.pop();
    result.rerender();
    strictEqual(destroyedRenderNodeCount, 4, "cleanup hook was invoked once for the wrapper morph and once for the {{item.word}}");
    strictEqual(destroyedRenderNode.lastValue, "hello", "The correct render node is passed in");
});
test("Pruned lists invoke a cleanup hook on their subtrees when removing elements", function () {
    var object = { list: [{ key: "1", word: "hello" }, { key: "2", word: "world" }] };
    var template = compile('<div>{{#each list as |item|}}<p>{{#if item.word}}{{item.word}}{{/if}}</p>{{/each}}</div>');
    var result = render(template, object);
    equalTokens(root, "<div><p>hello</p><p>world</p></div>");
    object.list.pop();
    result.rerender();
    strictEqual(destroyedRenderNodeCount, 3, "cleanup hook was invoked once for the wrapper morph and once for the {{item.word}}");
    strictEqual(destroyedRenderNode.lastValue, "world", "The correct render node is passed in");
    object.list.pop();
    result.rerender();
    strictEqual(destroyedRenderNodeCount, 6, "cleanup hook was invoked once for the wrapper morph and once for the {{item.word}}");
    strictEqual(destroyedRenderNode.lastValue, "hello", "The correct render node is passed in");
});
QUnit.module("Manual elements", {
    beforeEach: commonSetup
});
QUnit.skip("Setting up a manual element renders and revalidates", function () {
    hooks.keywords['manual-element'] = {
        render: function (morph, env, scope, params, hash, template, inverse, visitor) {
            var attributes = {
                title: "Tom Dale",
                href: ['concat', ['http://tomdale.', ['get', 'tld']]],
                'data-bar': ['get', 'bar']
            };
            var layout = manualElement('span', attributes);
            hostBlock(morph, env, scope, template, inverse, null, visitor, function (options) {
                options.templates.template.yieldIn({ raw: layout }, hash);
            });
            manualElement(env, scope, 'span', attributes, morph);
        },
        isStable: function () { return true; }
    };
    var template = compile("{{#manual-element bar='baz' tld='net'}}Hello {{world}}!{{/manual-element}}");
    render(template, { world: "world" });
    equalTokens(root, "<span title='Tom Dale' href='http://tomdale.net' data-bar='baz'>Hello world!</span>");
});
test("It is possible to nest multiple templates into a manual element", function () {
    hooks.keywords['manual-element'] = {
        render: function (morph, env, scope, params, hash, template, inverse, visitor) {
            var attributes = {
                title: "Tom Dale",
                href: ['concat', ['http://tomdale.', ['get', 'tld']]],
                'data-bar': ['get', 'bar']
            };
            var elementTemplate = manualElement('span', attributes);
            var contentBlock = blockFor(template, { scope: scope });
            var layoutBlock = blockFor(layout.raw, {
                yieldTo: contentBlock,
                self: { attrs: hash },
            });
            var elementBlock = blockFor(elementTemplate, {
                yieldTo: layoutBlock,
                self: hash
            });
            elementBlock.invoke(env, null, undefined, morph, null, visitor);
        },
        isStable: function () { return true; }
    };
    var layout = compile("<em>{{attrs.foo}}. {{yield}}</em>");
    var template = compile("{{#manual-element foo='foo' bar='baz' tld='net'}}Hello {{world}}!{{/manual-element}}");
    render(template, { world: "world" });
    equalTokens(root, "<span title='Tom Dale' href='http://tomdale.net' data-bar='baz'><em>foo. Hello world!</em></span>");
});
test("The invoke helper hook can instruct the runtime to link the result", function () {
    let invokeCount = 0;
    env.hooks.invokeHelper = function (morph, env, scope, visitor, params, hash, helper) {
        invokeCount++;
        return { value: helper(params, hash), link: true };
    };
    env.registerHelper('double', function ([input]) {
        return input * 2;
    });
    let template = compile("{{double 12}}");
    let result = render(template, {});
    equalTokens(root, "24");
    equal(invokeCount, 1);
    result.rerender();
    equalTokens(root, "24");
    equal(invokeCount, 1);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlydHlpbmctdGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9odG1sYmFycy1jb21waWxlci90ZXN0cy9kaXJ0eWluZy10ZXN0LnRzIl0sIm5hbWVzIjpbInJvb3RFbGVtZW50IiwiY29tbW9uU2V0dXAiLCJyZW5kZXIiLCJ0ZXN0RWFjaEhlbHBlciIsInJlcmVuZGVyIiwiYXNzZXJ0U3RhYmxlTm9kZXMiLCJnZXRJdGVtTm9kZSIsImdldE5hbWVOb2RlIl0sIm1hcHBpbmdzIjoiT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLCtCQUErQjtPQUNoRCxFQUFFLGFBQWEsRUFBRSxNQUFNLDRCQUE0QjtPQUNuRCxFQUFFLFNBQVMsRUFBRSxNQUFNLDJCQUEyQjtPQUM5QyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlDQUFpQztPQUNuRCxTQUFTLE1BQU0sZUFBZTtPQUM5QixFQUFFLFdBQVcsRUFBRSxNQUFNLDBCQUEwQjtPQUMvQyxFQUFFLGVBQWUsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLFdBQVc7QUFFOUQsSUFBSSxLQUFLLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxJQUFJLENBQUM7QUFFMUI7SUFDRUEsTUFBTUEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsYUFBYUEsQ0FBQ0EsS0FBS0EsQ0FBQ0EsQ0FBQ0E7QUFDbENBLENBQUNBO0FBRUQ7SUFDRUMsR0FBR0EsR0FBR0EsSUFBSUEsU0FBU0EsRUFBRUEsQ0FBQ0E7SUFDdEJBLEdBQUdBLEdBQUdBLElBQUlBLGVBQWVBLENBQUNBLEVBQUVBLEdBQUdBLEVBQUVBLGFBQWFBLEVBQUVBLGlCQUFpQkEsRUFBRUEsQ0FBQ0EsQ0FBQ0E7SUFDckVBLElBQUlBLEdBQUdBLFdBQVdBLEVBQUVBLENBQUNBO0lBRXJCQSxHQUFHQSxDQUFDQSxjQUFjQSxDQUFDQSxJQUFJQSxFQUFFQSxVQUFTQSxNQUFNQSxFQUFFQSxJQUFJQSxFQUFFQSxPQUFPQTtRQUNyRCxFQUFFLENBQUMsQ0FBQyxDQUFDLENB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