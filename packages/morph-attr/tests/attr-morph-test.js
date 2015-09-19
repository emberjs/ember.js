/* jshint scripturl:true */
import DOMHelper from "../dom-helper";
import SafeString from "htmlbars-util/safe-string";
var svgNamespace = "http://www.w3.org/2000/svg", xlinkNamespace = "http://www.w3.org/1999/xlink";
var domHelper = new DOMHelper();
QUnit.module('AttrMorph');
test("can update a dom node", function () {
    var element = domHelper.createElement('div');
    var morph = domHelper.createAttrMorph(element, 'id');
    morph.setContent('twang');
    equal(element.id, 'twang', 'id property is set');
    equal(element.getAttribute('id'), 'twang', 'id attribute is set');
});
test("can clear", function () {
    expect(0);
    var element = domHelper.createElement('div');
    var morph = domHelper.createAttrMorph(element, 'id');
    morph.clear();
});
test("calling destroy does not throw", function () {
    expect(1);
    var element = domHelper.createElement('div');
    var morph = domHelper.createAttrMorph(element, 'id');
    morph.destroy();
    equal(morph.element, null, 'clears element from morph');
});
test("can update property", function () {
    var element = domHelper.createElement('input');
    var morph = domHelper.createAttrMorph(element, 'disabled');
    morph.setContent(true);
    equal(element.disabled, true, 'disabled property is set');
    morph.setContent(false);
    equal(element.disabled, false, 'disabled property is set');
});
test("input.maxLength", function () {
    var element = domHelper.createElement('input');
    var morph = domHelper.createAttrMorph(element, 'maxLength');
    // different browsers have different defaults FF: -1, Chrome/Blink: 524288;
    var MAX_LENGTH = element.maxLength;
    morph.setContent(null);
    equal(element.maxLength, MAX_LENGTH, 'property is w/e is default');
    morph.setContent(1);
    equal(element.maxLength, 1, 'should be 1');
    morph.setContent(null);
    equal(element.maxLength, 0, 'property 0, result of element.maxLength = ""');
});
test("input.maxlength (all lowercase)", function () {
    var element = domHelper.createElement('input');
    var morph = domHelper.createAttrMorph(element, 'maxlength');
    // different browsers have different defaults FF: -1, Chrome/Blink: 524288;
    var DEFAULT_MAX_LENGTH = element.maxLength;
    morph.setContent(null);
    equal(element.maxLength, DEFAULT_MAX_LENGTH, 'property is w/e is default');
    morph.setContent(1);
    equal(element.maxLength, 1, 'property is w/e is default');
    morph.setContent(null);
    equal(element.maxLength, DEFAULT_MAX_LENGTH, 'property is w/e is default');
});
test("does not add undefined properties on initial render", function () {
    var element = domHelper.createElement('div');
    var morph = domHelper.createAttrMorph(element, 'id');
    morph.setContent(undefined);
    equal(element.id, '', 'property should not be set');
    morph.setContent('foo-bar');
    equal(element.id, 'foo-bar', 'property should be set');
});
test("does not add null properties on initial render", function () {
    var element = domHelper.createElement('div');
    var morph = domHelper.createAttrMorph(element, 'id');
    morph.setContent(null);
    equal(element.id, '', 'property should not be set');
    morph.setContent('foo-bar');
    equal(element.id, 'foo-bar', 'property should be set');
});
test("can update attribute", function () {
    var element = domHelper.createElement('div');
    var morph = domHelper.createAttrMorph(element, 'data-bop');
    morph.setContent('kpow');
    equal(element.getAttribute('data-bop'), 'kpow', 'data-bop attribute is set');
    morph.setContent(null);
    equal(element.getAttribute('data-bop'), undefined, 'data-bop attribute is removed');
});
test("can remove ns attribute with null", function () {
    var element = domHelper.createElement('svg');
    domHelper.setAttribute(element, 'xlink:title', 'Great Title', xlinkNamespace);
    var morph = domHelper.createAttrMorph(element, 'xlink:title', xlinkNamespace);
    morph.setContent(null);
    equal(element.getAttribute('xlink:title'), undefined, 'ns attribute is removed');
});
test("can remove attribute with undefined", function () {
    var element = domHelper.createElement('div');
    element.setAttribute('data-bop', 'kpow');
    var morph = domHelper.createAttrMorph(element, 'data-bop');
    morph.setContent(undefined);
    equal(element.getAttribute('data-bop'), undefined, 'data-bop attribute is removed');
});
test("can remove ns attribute with undefined", function () {
    var element = domHelper.createElement('svg');
    domHelper.setAttribute(element, 'xlink:title', 'Great Title', xlinkNamespace);
    var morph = domHelper.createAttrMorph(element, 'xlink:title', xlinkNamespace);
    morph.setContent(undefined);
    equal(element.getAttribute('xlink:title'), undefined, 'ns attribute is removed');
});
test("can update svg attribute", function () {
    domHelper.setNamespace(svgNamespace);
    var element = domHelper.createElement('svg');
    var morph = domHelper.createAttrMorph(element, 'height');
    morph.setContent('50%');
    equal(element.getAttribute('height'), '50%', 'svg attr is set');
    morph.setContent(null);
    equal(element.getAttribute('height'), undefined, 'svg attr is removed');
});
test("can update style attribute", function () {
    var element = domHelper.createElement('div');
    var morph = domHelper.createAttrMorph(element, 'style');
    morph.setContent('color: red;');
    equal(element.getAttribute('style'), 'color: red;', 'style attr is set');
    morph.setContent(null);
    equal(element.getAttribute('style'), undefined, 'style attr is removed');
});
var badTags = [
    { tag: 'a', attr: 'href' },
    { tag: 'body', attr: 'background' },
    { tag: 'link', attr: 'href' },
    { tag: 'img', attr: 'src' },
    { tag: 'iframe', attr: 'src' }
];
for (var i = 0, l = badTags.length; i < l; i++) {
    (function () {
        var subject = badTags[i];
        test(subject.tag + " " + subject.attr + " is sanitized when using blacklisted protocol", function () {
            var element = document.createElement(subject.tag);
            var morph = domHelper.createAttrMorph(element, subject.attr);
            morph.setContent('javascript://example.com');
            equal(element.getAttribute(subject.attr), 'unsafe:javascript://example.com', 'attribute is escaped');
        });
        test(subject.tag + " " + subject.attr + " is not sanitized when using non-whitelisted protocol with a SafeString", function () {
            var element = document.createElement(subject.tag);
            var morph = domHelper.createAttrMorph(element, subject.attr);
            try {
                morph.setContent(new SafeString('javascript://example.com'));
                equal(element.getAttribute(subject.attr), 'javascript://example.com', 'attribute is not escaped');
            }
            catch (e) {
                // IE does not allow javascript: to be set on img src
                ok(true, 'caught exception ' + e);
            }
        });
        test(subject.tag + " " + subject.attr + " is not sanitized when using unsafe attr morph", function () {
            var element = document.createElement(subject.tag);
            var morph = domHelper.createUnsafeAttrMorph(element, subject.attr);
            try {
                morph.setContent('javascript://example.com');
                equal(element.getAttribute(subject.attr), 'javascript://example.com', 'attribute is not escaped');
            }
            catch (e) {
                // IE does not allow javascript: to be set on img src
                ok(true, 'caught exception ' + e);
            }
        });
    })(); //jshint ignore:line
}
if (document && document.createElementNS) {
    test("detects attribute's namespace if it is not passed as an argument", function () {
        var element = domHelper.createElement('div');
        var morph = domHelper.createAttrMorph(element, 'xlink:href');
        morph.setContent('#circle');
        equal(element.attributes[0].namespaceURI, 'http://www.w3.org/1999/xlink', 'attribute has correct namespace');
    });
    test("can update namespaced attribute", function () {
        domHelper.setNamespace(svgNamespace);
        var element = domHelper.createElement('svg');
        var morph = domHelper.createAttrMorph(element, 'xlink:href', 'http://www.w3.org/1999/xlink');
        morph.setContent('#other');
        equal(element.getAttributeNS('http://www.w3.org/1999/xlink', 'href'), '#other', 'namespaced attr is set');
        equal(element.attributes[0].namespaceURI, 'http://www.w3.org/1999/xlink');
        equal(element.attributes[0].name, 'xlink:href');
        equal(element.attributes[0].localName, 'href');
        equal(element.attributes[0].value, '#other');
        morph.setContent(null);
        // safari returns '' while other browsers return undefined
        equal(!!element.getAttributeNS('http://www.w3.org/1999/xlink', 'href'), false, 'namespaced attr is removed');
    });
}
test("embed src as data uri is sanitized", function () {
    var element = document.createElement('embed');
    var morph = domHelper.createAttrMorph(element, 'src');
    morph.setContent('data:image/svg+xml;base64,PH');
    equal(element.getAttribute('src'), 'unsafe:data:image/svg+xml;base64,PH', 'attribute is escaped');
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXR0ci1tb3JwaC10ZXN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL21vcnBoLWF0dHIvdGVzdHMvYXR0ci1tb3JwaC10ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLDJCQUEyQjtPQUVwQixTQUFTLE1BQU0sZUFBZTtPQUM5QixVQUFVLE1BQU0sMkJBQTJCO0FBRWxELElBQUksWUFBWSxHQUFHLDRCQUE0QixFQUMzQyxjQUFjLEdBQUcsOEJBQThCLENBQUM7QUFDcEQsSUFBSSxTQUFTLEdBQUcsSUFBSSxTQUFTLEVBQUUsQ0FBQztBQUVoQyxLQUFLLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDO0FBRTFCLElBQUksQ0FBQyx1QkFBdUIsRUFBRTtJQUM1QixJQUFJLE9BQU8sR0FBRyxTQUFTLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQzdDLElBQUksS0FBSyxHQUFHLFNBQVMsQ0FBQyxlQUFlLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ3JELEtBQUssQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDMUIsS0FBSyxDQUFDLE9BQU8sQ0FBQyxFQUFFLEVBQUUsT0FBTyxFQUFFLG9CQUFvQixDQUFDLENBQUM7SUFDakQsS0FBSyxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLEVBQUUsT0FBTyxFQUFFLHFCQUFxQixDQUFDLENBQUM7QUFDcEUsQ0FBQyxDQUFDLENBQUM7QUFFSCxJQUFJLENBQUMsV0FBVyxFQUFFO0lBQ2hCLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNWLElBQUksT0FBTyxHQUFHLFNBQVMsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDN0MsSUFBSSxLQUFLLEdBQUcsU0FBUyxDQUFDLGVBQWUsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDckQsS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFDO0FB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