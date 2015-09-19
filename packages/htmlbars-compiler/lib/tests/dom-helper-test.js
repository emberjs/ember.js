import DOMHelper from "../dom-helper";
import { equalHTML, isCheckedInputHTML } from "../htmlbars-test-helpers";
var xhtmlNamespace = "http://www.w3.org/1999/xhtml", xlinkNamespace = "http://www.w3.org/1999/xlink", svgNamespace = "http://www.w3.org/2000/svg";
var foreignNamespaces = ['foreignObject', 'desc', 'title'];
var dom, i, foreignNamespace;
// getAttributes may return null or "" for nonexistent attributes,
// depending on the browser.  So we find it out here and use it later.
var disabledAbsentValue = (function () {
    var div = document.createElement("input");
    return div.getAttribute("disabled");
})();
QUnit.module('DOM Helper', {
    beforeEach: function () {
        dom = new DOMHelper();
    },
    afterEach: function () {
        dom = null;
    }
});
test('#createElement', function () {
    var node = dom.createElement('div');
    equal(node.tagName, 'DIV');
    equalHTML(node, '<div></div>');
});
test('#childAtIndex', function () {
    var node = dom.createElement('div');
    var child1 = dom.createElement('p');
    var child2 = dom.createElement('img');
    strictEqual(dom.childAtIndex(node, 0), null);
    strictEqual(dom.childAtIndex(node, 1), null);
    strictEqual(dom.childAtIndex(node, 2), null);
    dom.appendChild(node, child1);
    strictEqual(dom.childAtIndex(node, 0).tagName, 'P');
    strictEqual(dom.childAtIndex(node, 1), null);
    strictEqual(dom.childAtIndex(node, 2), null);
    dom.insertBefore(node, child2, child1);
    strictEqual(dom.childAtIndex(node, 0).tagName, 'IMG');
    strictEqual(dom.childAtIndex(node, 1).tagName, 'P');
    strictEqual(dom.childAtIndex(node, 2), null);
});
test('#appendText adds text', function () {
    var node = dom.createElement('div');
    var text = dom.appendText(node, 'Howdy');
    ok(!!text, 'returns node');
    equalHTML(node, '<div>Howdy</div>');
});
test('#setAttribute', function () {
    var node = dom.createElement('div');
    dom.setAttribute(node, 'id', 'super-tag');
    equalHTML(node, '<div id="super-tag"></div>');
    dom.setAttribute(node, 'id', null);
    equalHTML(node, '<div id="null"></div>');
    node = dom.createElement('input');
    ok(node.getAttribute('disabled') === disabledAbsentValue, 'precond: disabled is absent');
    dom.setAttribute(node, 'disabled', true);
    ok(node.getAttribute('disabled') !== disabledAbsentValue, 'disabled set to true is present');
    dom.setAttribute(node, 'disabled', false);
    ok(node.getAttribute('disabled') !== disabledAbsentValue, 'disabled set to false is present');
});
test('#setAttributeNS', function () {
    var node = dom.createElement('svg');
    dom.setAttributeNS(node, xlinkNamespace, 'xlink:href', 'super-fun');
    // chrome adds (xmlns:xlink="http://www.w3.org/1999/xlink") property while others don't
    // thus equalHTML is not useful
    var el = document.createElement('div');
    el.appendChild(node);
    // phantomjs omits the prefix, thus we can't find xlink:
    ok(el.innerHTML.indexOf('href="super-fun"') > 0);
    dom.setAttributeNS(node, xlinkNamespace, 'href', null);
    ok(el.innerHTML.indexOf('href="null"') > 0);
});
test('#getElementById', function () {
    var parentNode = dom.createElement('div'), childNode = dom.createElement('div');
    dom.setAttribute(parentNode, 'id', 'parent');
    dom.setAttribute(childNode, 'id', 'child');
    dom.appendChild(parentNode, childNode);
    dom.document.body.appendChild(parentNode);
    equalHTML(dom.getElementById('child'), '<div id="child"></div>');
    dom.document.body.removeChild(parentNode);
});
test('#setPropertyStrict', function () {
    var node = dom.createElement('div');
    dom.setPropertyStrict(node, 'id', 'super-tag');
    equalHTML(node, '<div id="super-tag"></div>');
    node = dom.createElement('input');
    ok(node.getAttribute('disabled') === disabledAbsentValue, 'precond: disabled is absent');
    dom.setPropertyStrict(node, 'disabled', true);
    ok(node.getAttribute('disabled') !== disabledAbsentValue, 'disabled is present');
    dom.setPropertyStrict(node, 'disabled', false);
    ok(node.getAttribute('disabled') === disabledAbsentValue, 'disabled has been removed');
});
// IE dislikes undefined or null for value
test('#setPropertyStrict value', function () {
    var node = dom.createElement('input');
    dom.setPropertyStrict(node, 'value', undefined);
    equal(node.value, '', 'blank string is set for undefined');
    dom.setPropertyStrict(node, 'value', null);
    equal(node.value, '', 'blank string is set for undefined');
});
// IE dislikes undefined or null for type
test('#setPropertyStrict type', function () {
    var node = dom.createElement('input');
    dom.setPropertyStrict(node, 'type', undefined);
    equal(node.type, 'text', 'text default is set for undefined');
    dom.setPropertyStrict(node, 'type', null);
    equal(node.type, 'text', 'text default is set for undefined');
});
// setting undefined or null to src makes a network request
test('#setPropertyStrict src', function () {
    var node = dom.createElement('img');
    dom.setPropertyStrict(node, 'src', undefined);
    notEqual(node.src, undefined, 'blank string is set for undefined');
    dom.setPropertyStrict(node, 'src', null);
    notEqual(node.src, null, 'blank string is set for undefined');
});
test('#removeAttribute', function () {
    var node = dom.createElement('div');
    dom.setAttribute(node, 'id', 'super-tag');
    equalHTML(node, '<div id="super-tag"></div>', 'precond - attribute exists');
    dom.removeAttribute(node, 'id');
    equalHTML(node, '<div></div>', 'attribute was removed');
});
test('#removeAttribute of SVG', function () {
    dom.setNamespace(svgNamespace);
    var node = dom.createElement('svg');
    dom.setAttribute(node, 'viewBox', '0 0 100 100');
    equalHTML(node, '<svg viewBox="0 0 100 100"></svg>', 'precond - attribute exists');
    dom.removeAttribute(node, 'viewBox');
    equalHTML(node, '<svg></svg>', 'attribute was removed');
});
test('#setProperty', function () {
    var node = dom.createElement('div');
    dom.setProperty(node, 'id', 'super-tag');
    equalHTML(node, '<div id="super-tag"></div>');
    dom.setProperty(node, 'id', null);
    ok(node.getAttribute('id') !== 'super-tag', 'null property sets to the property');
    node = dom.createElement('div');
    dom.setProperty(node, 'data-fun', 'whoopie');
    equalHTML(node, '<div data-fun="whoopie"></div>');
    dom.setProperty(node, 'data-fun', null);
    equalHTML(node, '<div></div>', 'null attribute removes the attribute');
    node = dom.createElement('input');
    dom.setProperty(node, 'disabled', true);
    equal(node.disabled, true);
    dom.setProperty(node, 'disabled', false);
    equal(node.disabled, false);
    node = dom.createElement('div');
    dom.setProperty(node, 'style', 'color: red;');
    equalHTML(node, '<div style="color: red;"></div>');
});
test('#setProperty removes attr with undefined', function () {
    var node = dom.createElement('div');
    dom.setProperty(node, 'data-fun', 'whoopie');
    equalHTML(node, '<div data-fun="whoopie"></div>');
    dom.setProperty(node, 'data-fun', undefined);
    equalHTML(node, '<div></div>', 'undefined attribute removes the attribute');
});
test('#setProperty uses setAttribute for special non-compliant element props', function () {
    expect(6);
    var badPairs = [
        { tagName: 'button', key: 'type', value: 'submit', selfClosing: false },
        { tagName: 'input', key: 'type', value: 'x-not-supported', selfClosing: true }
    ];
    badPairs.forEach(function (pair) {
        var node = dom.createElement(pair.tagName);
        var setAttribute = node.setAttribute;
        node.setAttribute = function (attrName, value) {
            equal(attrName, pair.key, 'setAttribute called with correct attrName');
            equal(value, pair.value, 'setAttribute called with correct value');
            return setAttribute.call(this, attrName, value);
        };
        dom.setProperty(node, pair.key, pair.value);
        // e.g. <button type="submit"></button>
        var expected = '<' + pair.tagName + ' ' + pair.key + '="' + pair.value + '">';
        if (pair.selfClosing === false) {
            expected += '</' + pair.tagName + '>';
        }
        equalHTML(node, expected, 'output html is correct');
    });
});
test('#addClasses', function () {
    var node = dom.createElement('div');
    dom.addClasses(node, ['super-fun']);
    equal(node.className, 'super-fun');
    dom.addClasses(node, ['super-fun']);
    equal(node.className, 'super-fun');
    dom.addClasses(node, ['super-blast']);
    equal(node.className, 'super-fun super-blast');
    dom.addClasses(node, ['bacon', 'ham']);
    equal(node.className, 'super-fun super-blast bacon ham');
});
test('#removeClasses', function () {
    var node = dom.createElement('div');
    node.setAttribute('class', 'this-class that-class');
    dom.removeClasses(node, ['this-class']);
    equal(node.className, 'that-class');
    dom.removeClasses(node, ['this-class']);
    equal(node.className, 'that-class');
    dom.removeClasses(node, ['that-class']);
    equal(node.className, '');
    node.setAttribute('class', 'woop moop jeep');
    dom.removeClasses(node, ['moop', 'jeep']);
    equal(node.className, 'woop');
});
test('#createElement of tr with contextual table element', function () {
    var tableElement = document.createElement('table'), node = dom.createElement('tr', tableElement);
    equal(node.tagName, 'TR');
    equalHTML(node, '<tr></tr>');
});
test('#createMorph has optional contextualElement', function () {
    var parent = document.createElement('div'), fragment = document.createDocumentFragment(), start = document.createTextNode(''), end = document.createTextNode(''), morph, thrown;
    try {
        morph = dom.createMorph(fragment, start, end, fragment);
    }
    catch (e) {
        thrown = true;
    }
    ok(thrown, 'Exception thrown when a fragment is provided for contextualElement');
    morph = dom.createMorph(fragment, start, end, parent);
    equal(morph.contextualElement, parent, "morph's contextualElement is parent");
    morph = dom.createMorph(parent, start, end);
    equal(morph.contextualElement, parent, "morph's contextualElement is parent");
});
test('#appendMorph', function () {
    var element = document.createElement('div');
    dom.appendText(element, 'a');
    var morph = dom.appendMorph(element);
    dom.appendText(element, 'c');
    morph.setContent('b');
    equal(element.innerHTML, 'abc');
});
test('#insertMorphBefore', function () {
    var element = document.createElement('div');
    dom.appendText(element, 'a');
    var c = dom.appendText(element, 'c');
    var morph = dom.insertMorphBefore(element, c);
    morph.setContent('b');
    equal(element.innerHTML, 'abc');
});
test('#parseHTML combinations', function () {
    var parsingCombinations = [
        // omitted start tags
        //
        ['table', '<tr><td>Yo</td></tr>', 'TR'],
        ['table', '<tbody><tr></tr></tbody>', 'TBODY'],
        ['table', '<col></col>', 'COL'],
        // elements with broken innerHTML in IE9 and down
        ['select', '<option></option>', 'OPTION'],
        ['colgroup', '<col></col>', 'COL'],
        ['tbody', '<tr></tr>', 'TR'],
        ['tfoot', '<tr></tr>', 'TR'],
        ['thead', '<tr></tr>', 'TR'],
        ['tr', '<td></td>', 'TD'],
        ['div', '<script></script>', 'SCRIPT']
    ];
    var contextTag, content, expectedTagName, contextElement, nodes;
    for (var p = 0; p < parsingCombinations.length; p++) {
        contextTag = parsingCombinations[p][0];
        content = parsingCombinations[p][1];
        expectedTagName = parsingCombinations[p][2];
        contextElement = document.createElement(contextTag);
        nodes = dom.parseHTML(content, contextElement).childNodes;
        equal(nodes[0].tagName, expectedTagName, '#parseHTML of ' + content + ' returns a ' + expectedTagName + ' inside a ' + contextTag + ' context');
    }
});
test('#parseHTML of script then tr inside table context wraps the tr in a tbody', function () {
    var tableElement = document.createElement('table'), nodes = dom.parseHTML('<script></script><tr><td>Yo</td></tr>', tableElement).childNodes;
    // The HTML spec suggests the first item must be the child of
    // the omittable start tag. Here script is the first child, so no-go.
    equal(nodes.length, 2, 'Leading script tag corrupts');
    equal(nodes[0].tagName, 'SCRIPT');
    equal(nodes[1].tagName, 'TBODY');
});
test('#parseHTML of select allows the initial implicit option selection to remain', function () {
    var div = document.createElement('div');
    var select = dom.parseHTML('<select><option></option></select>', div).childNodes[0];
    ok(select.childNodes[0].selected, 'first element is selected');
});
test('#parseHTML of options removes an implicit selection', function () {
    var select = document.createElement('select');
    var options = dom.parseHTML('<option value="1"></option><option value="2"></option>', select).childNodes;
    ok(!options[0].selected, 'first element is not selected');
    ok(!options[1].selected, 'second element is not selected');
});
test('#parseHTML of options leaves an explicit first selection', function () {
    var select = document.createElement('select');
    var options = dom.parseHTML('<option value="1" selected></option><option value="2"></option>', select).childNodes;
    ok(options[0].selected, 'first element is selected');
    ok(!options[1].selected, 'second element is not selected');
});
test('#parseHTML of options leaves an explicit second selection', function () {
    var select = document.createElement('select');
    var options = dom.parseHTML('<option value="1"></option><option value="2" selected="selected"></option>', select).childNodes;
    ok(!options[0].selected, 'first element is not selected');
    ok(options[1].selected, 'second element is selected');
});
test('#parseHTML of script then tr inside tbody context', function () {
    var tbodyElement = document.createElement('tbody'), nodes = dom.parseHTML('<script></script><tr><td>Yo</td></tr>', tbodyElement).childNodes;
    equal(nodes.length, 2, 'Leading script tag corrupts');
    equal(nodes[0].tagName, 'SCRIPT');
    equal(nodes[1].tagName, 'TR');
});
test('#parseHTML with retains whitespace', function () {
    var div = document.createElement('div');
    var nodes = dom.parseHTML('leading<script id="first"></script> <script id="second"></script><div><script></script> <script></script>, indeed.</div>', div).childNodes;
    equal(nodes[0].data, 'leading');
    equal(nodes[1].tagName, 'SCRIPT');
    equal(nodes[2].data, ' ');
    equal(nodes[3].tagName, 'SCRIPT');
    equal(nodes[4].tagName, 'DIV');
    equal(nodes[4].childNodes[0].tagName, 'SCRIPT');
    equal(nodes[4].childNodes[1].data, ' ');
    equal(nodes[4].childNodes[2].tagName, 'SCRIPT');
    equal(nodes[4].childNodes[3].data, ', indeed.');
});
test('#parseHTML with retains whitespace of top element', function () {
    var div = document.createElement('div');
    var nodes = dom.parseHTML('<span>hello <script id="first"></script> yeah</span>', div).childNodes;
    equal(nodes[0].tagName, 'SPAN');
    equalHTML(nodes, '<span>hello <script id="first"></script> yeah</span>');
});
test('#parseHTML with retains whitespace after script', function () {
    var div = document.createElement('div');
    var nodes = dom.parseHTML('<span>hello</span><script id="first"></script><span><script></script> kwoop</span>', div).childNodes;
    equal(nodes[0].tagName, 'SPAN');
    equal(nodes[1].tagName, 'SCRIPT');
    equal(nodes[2].tagName, 'SPAN');
    equalHTML(nodes, '<span>hello</span><script id="first"></script><span><script></script> kwoop</span>');
});
test('#parseHTML of number', function () {
    var div = document.createElement('div');
    var nodes = dom.parseHTML(5, div).childNodes;
    equal(nodes[0].data, '5');
    equalHTML(nodes, '5');
});
test('#protocolForURL', function () {
    var protocol = dom.protocolForURL("http://www.emberjs.com");
    equal(protocol, "http:");
    // Inherit protocol from document if unparseable
    protocol = dom.protocolForURL("   javascript:lulzhacked()");
    /*jshint scripturl:true*/
    equal(protocol, "javascript:");
});
test('#cloneNode shallow', function () {
    var divElement = document.createElement('div');
    divElement.appendChild(document.createElement('span'));
    var node = dom.cloneNode(divElement, false);
    equal(node.tagName, 'DIV');
    equalHTML(node, '<div></div>');
});
test('#cloneNode deep', function () {
    var divElement = document.createElement('div');
    divElement.appendChild(document.createElement('span'));
    var node = dom.cloneNode(divElement, true);
    equal(node.tagName, 'DIV');
    equalHTML(node, '<div><span></span></div>');
});
test('dom node has empty text after cloning and ensuringBlankTextNode', function () {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(''));
    var clonedDiv = dom.cloneNode(div, true);
    equal(clonedDiv.nodeType, 1);
    equalHTML(clonedDiv, '<div></div>');
    // IE's native cloneNode drops blank string text
    // nodes. Assert repairClonedNode brings back the blank
    // text node.
    dom.repairClonedNode(clonedDiv, [0]);
    equal(clonedDiv.childNodes.length, 1);
    equal(clonedDiv.childNodes[0].nodeType, 3);
});
test('dom node has empty start text after cloning and ensuringBlankTextNode', function () {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(''));
    div.appendChild(document.createElement('span'));
    var clonedDiv = dom.cloneNode(div, true);
    equal(clonedDiv.nodeType, 1);
    equalHTML(clonedDiv, '<div><span></span></div>');
    // IE's native cloneNode drops blank string text
    // nodes. Assert denormalizeText brings back the blank
    // text node.
    dom.repairClonedNode(clonedDiv, [0]);
    equal(clonedDiv.childNodes.length, 2);
    equal(clonedDiv.childNodes[0].nodeType, 3);
});
test('dom node checked after cloning and ensuringChecked', function () {
    var input = document.createElement('input');
    input.setAttribute('checked', 'checked');
    ok(input.checked, 'input is checked');
    var clone = dom.cloneNode(input, false);
    // IE's native cloneNode copies checked attributes but
    // not the checked property of the DOM node.
    dom.repairClonedNode(clone, [], true);
    isCheckedInputHTML(clone, '<input checked="checked">');
    ok(clone.checked, 'clone is checked');
});
if ('namespaceURI' in document.createElement('div')) {
    QUnit.module('DOM Helper namespaces', {
        beforeEach: function () {
            dom = new DOMHelper();
        },
        afterEach: function () {
            dom = null;
        }
    });
    test('#createElement div is xhtml', function () {
        var node = dom.createElement('div');
        equal(node.namespaceURI, xhtmlNamespace);
    });
    test('#createElement of svg with svg namespace', function () {
        dom.setNamespace(svgNamespace);
        var node = dom.createElement('svg');
        equal(node.tagName, 'svg');
        equal(node.namespaceURI, svgNamespace);
    });
    test('#createElement of path with detected svg contextual element', function () {
        dom.setNamespace(svgNamespace);
        var node = dom.createElement('path');
        equal(node.tagName, 'path');
        equal(node.namespaceURI, svgNamespace);
    });
    test('#createElement of path with svg contextual element', function () {
        var node = dom.createElement('path', document.createElementNS(svgNamespace, 'svg'));
        equal(node.tagName, 'path');
        equal(node.namespaceURI, svgNamespace);
    });
    test('#createElement of svg with div namespace', function () {
        var node = dom.createElement('svg', document.createElement('div'));
        equal(node.tagName, 'svg');
        equal(node.namespaceURI, svgNamespace);
    });
    test('#getElementById with different root node', function () {
        var doc = document.implementation.createDocument(xhtmlNamespace, 'html', null), body = document.createElementNS(xhtmlNamespace, 'body'), parentNode = dom.createElement('div'), childNode = dom.createElement('div');
        doc.documentElement.appendChild(body);
        dom.setAttribute(parentNode, 'id', 'parent');
        dom.setAttribute(childNode, 'id', 'child');
        dom.appendChild(parentNode, childNode);
        dom.appendChild(body, parentNode);
        equalHTML(dom.getElementById('child', doc), '<div id="child"></div>');
    });
    test('#setProperty with namespaced attributes', function () {
        var node;
        dom.setNamespace(svgNamespace);
        node = dom.createElement('svg');
        dom.setProperty(node, 'viewBox', '0 0 0 0');
        equalHTML(node, '<svg viewBox="0 0 0 0"></svg>');
        dom.setProperty(node, 'xlink:title', 'super-blast', xlinkNamespace);
        // chrome adds (xmlns:xlink="http://www.w3.org/1999/xlink") property while others don't
        // thus equalHTML is not useful
        var el = document.createElement('div');
        el.appendChild(node);
        // phantom js omits the prefix so we can't look for xlink:
        ok(el.innerHTML.indexOf('title="super-blast"') > 0);
        dom.setProperty(node, 'xlink:title', null, xlinkNamespace);
        equal(node.getAttribute('xlink:title'), null, 'ns attr is removed');
    });
    test("#setProperty removes namespaced attr with undefined", function () {
        var node;
        node = dom.createElement('svg');
        dom.setProperty(node, 'xlink:title', 'Great Title', xlinkNamespace);
        dom.setProperty(node, 'xlink:title', undefined, xlinkNamespace);
        equal(node.getAttribute('xlink:title'), undefined, 'ns attr is removed');
    });
    for (i = 0; i < foreignNamespaces.length; i++) {
        foreignNamespace = foreignNamespaces[i];
        test('#createElement of div with ' + foreignNamespace + ' contextual element', function () {
            var node = dom.createElement('div', document.createElementNS(svgNamespace, foreignNamespace));
            equal(node.tagName, 'DIV');
            equal(node.namespaceURI, xhtmlNamespace);
        }); // jshint ignore:line
        test('#parseHTML of div with ' + foreignNamespace, function () {
            dom.setNamespace(xhtmlNamespace);
            var foreignObject = document.createElementNS(svgNamespace, foreignNamespace), nodes = dom.parseHTML('<div></div>', foreignObject).childNodes;
            equal(nodes[0].tagName, 'DIV');
            equal(nodes[0].namespaceURI, xhtmlNamespace);
        }); // jshint ignore:line
    }
    test('#parseHTML of path with svg contextual element', function () {
        dom.setNamespace(svgNamespace);
        var svgElement = document.createElementNS(svgNamespace, 'svg'), nodes = dom.parseHTML('<path></path>', svgElement).childNodes;
        equal(nodes[0].tagName, 'path');
        equal(nodes[0].namespaceURI, svgNamespace);
    });
    test('#parseHTML of stop with linearGradient contextual element', function () {
        dom.setNamespace(svgNamespace);
        var svgElement = document.createElementNS(svgNamespace, 'linearGradient'), nodes = dom.parseHTML('<stop />', svgElement).childNodes;
        equal(nodes[0].tagName, 'stop');
        equal(nodes[0].namespaceURI, svgNamespace);
    });
    test('#addClasses on SVG', function () {
        var node = document.createElementNS(svgNamespace, 'svg');
        dom.addClasses(node, ['super-fun']);
        equal(node.getAttribute('class'), 'super-fun');
        dom.addClasses(node, ['super-fun']);
        equal(node.getAttribute('class'), 'super-fun');
        dom.addClasses(node, ['super-blast']);
        equal(node.getAttribute('class'), 'super-fun super-blast');
    });
    test('#removeClasses on SVG', function () {
        var node = document.createElementNS(svgNamespace, 'svg');
        node.setAttribute('class', 'this-class that-class');
        dom.removeClasses(node, ['this-class']);
        equal(node.getAttribute('class'), 'that-class');
        dom.removeClasses(node, ['this-class']);
        equal(node.getAttribute('class'), 'that-class');
        dom.removeClasses(node, ['that-class']);
        equal(node.getAttribute('class'), '');
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG9tLWhlbHBlci10ZXN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vc3JjL2h0bWxiYXJzLWNvbXBpbGVyL2xpYi90ZXN0cy9kb20taGVscGVyLXRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ik9BQU8sU0FBUyxNQUFNLGVBQWU7T0FDOUIsRUFDTCxTQUFTLEVBQ1Qsa0JBQWtCLEVBQ25CLE1BQU0sMEJBQTBCO0FBRWpDLElBQUksY0FBYyxHQUFHLDhCQUE4QixFQUMvQyxjQUFjLEdBQUcsOEJBQThCLEVBQy9DLFlBQVksR0FBSyw0QkFBNEIsQ0FBQztBQUVsRCxJQUFJLGlCQUFpQixHQUFHLENBQUMsZUFBZSxFQUFFLE1BQU0sRUFBRSxPQUFPLENBQUMsQ0FBQztBQUUzRCxJQUFJLEdBQUcsRUFBRSxDQUFDLEVBQUUsZ0JBQWdCLENBQUM7QUFFN0Isa0VBQWtFO0FBQ2xFLHNFQUFzRTtBQUN0RSxJQUFJLG1CQUFtQixHQUFHLENBQUM7SUFDekIsSUFBSSxHQUFHLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUMxQyxNQUFNLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxVQUFVLENBQUMsQ0FBQztBQUN0QyxDQUFDLENBQUMsRUFBRSxDQUFDO0FBRUwsS0FBSyxDQUFDLE1BQU0sQ0FBQyxZQUFZLEVBQUU7SUFDekIsVUFBVSxFQUFFO1FBQ1YsR0FBRyxHQUFHLElBQUksU0FBUyxFQUFFLENBQUM7SUFDeEIsQ0FBQztJQUNELFNBQVMsRUFBRTtRQUNULEdBQUcsR0FBRyxJQUFJLENBQUM7SUFDYixDQUFDO0NBQ0YsQ0FBQyxDQUFDO0FBRUgsSUFBSSxDQUFDLGdCQUFnQixFQUFFO0lBQ3JCLElBQUksSUFBSSxHQUFHLEdBQUcsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDcEMsS0FBSyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDM0IsU0FB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