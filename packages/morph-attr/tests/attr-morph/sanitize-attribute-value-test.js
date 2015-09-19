import { sanitizeAttributeValue } from "morph-attr/sanitize-attribute-value";
import SafeString from "htmlbars-util/safe-string";
import { forEach } from "htmlbars-util/array-utils";
import DOMHelper from "../../dom-helper";
var domHelper = new DOMHelper();
QUnit.module('sanitizeAttributeValue(null, "*")');
var goodProtocols = ['https', 'http', 'ftp', 'tel', 'file'];
for (var i = 0, l = goodProtocols.length; i < l; i++) {
    buildProtocolTest(goodProtocols[i]);
}
function buildProtocolTest(protocol) {
    test('allows ' + protocol + ' protocol when element is not provided', function () {
        expect(1);
        var attributeValue = protocol + '://foo.com';
        var actual = sanitizeAttributeValue(domHelper, null, 'href', attributeValue);
        equal(actual, attributeValue, 'protocol not escaped');
    });
}
test('blocks javascript: protocol', function () {
    /* jshint scripturl:true */
    expect(1);
    var attributeValue = 'javascript:alert("foo")';
    var actual = sanitizeAttributeValue(domHelper, null, 'href', attributeValue);
    equal(actual, 'unsafe:' + attributeValue, 'protocol escaped');
});
test('blocks blacklisted protocols', function () {
    /* jshint scripturl:true */
    expect(1);
    var attributeValue = 'javascript:alert("foo")';
    var actual = sanitizeAttributeValue(domHelper, null, 'href', attributeValue);
    equal(actual, 'unsafe:' + attributeValue, 'protocol escaped');
});
test('does not block SafeStrings', function () {
    /* jshint scripturl:true */
    expect(1);
    var attributeValue = 'javascript:alert("foo")';
    var actual = sanitizeAttributeValue(domHelper, null, 'href', new SafeString(attributeValue));
    equal(actual, attributeValue, 'protocol unescaped');
});
test("blocks data uri for EMBED", function () {
    /* jshint scripturl:true */
    expect(1);
    var attributeValue = 'data:image/svg+xml;base64,...';
    var actual = sanitizeAttributeValue(domHelper, { tagName: 'EMBED' }, 'src', attributeValue);
    equal(actual, 'unsafe:' + attributeValue, 'protocol escaped');
});
test("doesn't sanitize data uri for IMG", function () {
    /* jshint scripturl:true */
    expect(1);
    var attributeValue = 'data:image/svg+xml;base64,...';
    var actual = sanitizeAttributeValue(domHelper, { tagName: 'IMG' }, 'src', attributeValue);
    equal(actual, attributeValue, 'protocol should not have been escaped');
});
var badTags = [
    'A',
    'BODY',
    'LINK',
    'IMG',
    'IFRAME',
    'BASE',
    'FORM',
];
var badAttributes = [
    'href',
    'src',
    'background',
    'action'
];
var someIllegalProtocols = [
    'javascript',
    'vbscript'
];
forEach(badTags, function (tagName) {
    forEach(badAttributes, function (attrName) {
        forEach(someIllegalProtocols, function (protocol) {
            test(' <' + tagName + ' ' + attrName + '="' + protocol + ':something"> ...', function () {
                equal(sanitizeAttributeValue(domHelper, { tagName: tagName }, attrName, protocol + ':something'), 'unsafe:' + protocol + ':something');
            });
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2FuaXRpemUtYXR0cmlidXRlLXZhbHVlLXRlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zcmMvbW9ycGgtYXR0ci90ZXN0cy9hdHRyLW1vcnBoL3Nhbml0aXplLWF0dHJpYnV0ZS12YWx1ZS10ZXN0LnRzIl0sIm5hbWVzIjpbImJ1aWxkUHJvdG9jb2xUZXN0Il0sIm1hcHBpbmdzIjoiT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0scUNBQXFDO09BQ3JFLFVBQVUsTUFBTSwyQkFBMkI7T0FDM0MsRUFBRSxPQUFPLEVBQUUsTUFBTSwyQkFBMkI7T0FFNUMsU0FBUyxNQUFNLGtCQUFrQjtBQUV4QyxJQUFJLFNBQVMsR0FBRyxJQUFJLFNBQVMsRUFBRSxDQUFDO0FBRWhDLEtBQUssQ0FBQyxNQUFNLENBQUMsbUNBQW1DLENBQUMsQ0FBQztBQUVsRCxJQUFJLGFBQWEsR0FBRyxDQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxNQUFNLENBQUMsQ0FBQztBQUU3RCxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsYUFBYSxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7SUFDckQsaUJBQWlCLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDdEMsQ0FBQztBQUVELDJCQUEyQixRQUFRO0lBQ2pDQSxJQUFJQSxDQUFDQSxTQUFTQSxHQUFHQSxRQUFRQSxHQUFHQSx3Q0FBd0NBLEVBQUVBO1FBQ3BFLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVWLElBQUksY0FBYyxHQUFHLFFBQVEsR0FBRyxZQUFZLENBQUM7UUFDN0MsSUFBSSxNQUFNLEdBQUcsc0JBQXNCLENBQUMsU0FBUyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFFN0UsS0FBSyxDQUFDLE1BQU0sRUFBRSxjQUFjLEVBQUUsc0JBQXNCLENBQUMsQ0FBQztJQUN4RCxDQUFDLENBQUNBLENBQUNBO0FBQ0xBLENBQUNBO0FBRUQsSUFBSSxDQUFDLDZCQUE2QixFQUFFO0lBQ2xDLDJCQUEyQjtJQUUzQixNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFFVixJQUFJLGNBQWMsR0FBRyx5QkFBeUIsQ0FBQztJQUMvQyxJQUFJLE1BQU0sR0FBRyxzQkFBc0IsQ0FBQyxTQUFTLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxjQUFjLENBQUMsQ0FBQztJQUU3RSxLQUFLLENBQUMsTUFBTSxFQUFFLFNBQVMsR0FBRyxjQUFjLEVBQUUsa0JBQWtCLENBQUMsQ0FBQztBQUNoRSxDQUFDLENBQUMsQ0FBQztBQUVILElBQUksQ0FBQyw4QkFBOEIsRUFBRTtJQUNuQywyQkFBMkI7SUFFM0IsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBRVYsSUFBSSxjQUFjLEdBQUcseUJBQXlCLENBQUM7SUFDL0MsSUFBSSxNQUFNLEdBQUcsc0JBQXNCLENBQUMsU0FBUyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsY0FBYyxDQUFDLENBQUM7SUFFN0UsS0FBSyxDQUFDLE1BQU0sRUFBRSxTQUFTLEdBQUcsY0FBYyxFQUFFLGtCQUFrQixDQUFDLENBQUM7QUFDaEUsQ0FBQyxDQUFDLENBQUM7QUFFSCxJQUFJLENBQUMsNEJBQTRCLEVBQUU7SUFDakMsMkJBQTJCO0lBRTNCLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUVWLElBQUksY0FBYyxHQUFHLHlCQUF5QixDQUFDO0lBQy9DLElBQUksTUFBTSxHQUFHLHNCQUFzQixDQUFDLFNBQVMsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksVUFBVSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUM7SUFFN0YsS0FBSyxDQUFDLE1BQU0sRUFBRSxjQUFjLEVBQUUsb0JBQW9CLENBQUMsQ0FBQztBQUN0RCxDQUFDLENBQUMsQ0FBQztBQUVILElBQUksQ0FBQywyQkFBMkIsRUFBRTtJQUNoQywyQkFBMkI7SUFFM0IsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBRVYsSUFBSSxjQUFjLEdBQUcsK0JBQStCLENBQUM7SUFDckQsSUFBSSxNQUFNLEdBQUcsc0JBQXNCLENBQUMsU0FBUyxFQUFFLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxFQUFFLEtBQUssRUFBRSxjQUFjLENBQUMsQ0FBQztJQUU1RixLQUFLLENBQUMsTUFBTSxFQUFFLFNBQVMsR0FBRyxjQUFjLEVBQUUsa0JBQWtCLENBQUMsQ0FBQztBQUNoRSxDQUFDLENBQUMsQ0FBQztBQUVILElBQUksQ0FBQyxtQ0FBbUMsRUFBRTtJQUN4QywyQkFBMkI7SUFFM0IsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBRVYsSUFBSSxjQUFjLEdBQUcsK0JBQStCLENBQUM7SUFDckQsSUFBSSxNQUFNLEdBQUcsc0JBQXNCLENBQUMsU0FBUyxFQUFFLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxFQUFFLEtBQUssRUFBRSxjQUFjLENBQUMsQ0FBQztJQUUxRixLQUFLLENBQUMsTUFBTSxFQUFFLGNBQWMsRUFBRSx1Q0FBdUMsQ0FBQyxDQUFDO0FBQ3pFLENBQUMsQ0FBQyxDQUFDO0FBRUgsSUFBSSxPQUFPLEdBQUc7SUFDWixHQUFHO0lBQ0gsTUFBTTtJQUNOLE1BQU07SUFDTixLQUFLO0lBQ0wsUUFBUTtJQUNSLE1BQU07SUFDTixNQUFNO0NBQ1AsQ0FBQztBQUVGLElBQUksYUFBYSxHQUFHO0lBQ2xCLE1BQU07SUFDTixLQUFLO0lBQ0wsWUFBWTtJQUNaLFFBQVE7Q0FDVCxDQUFDO0FBRUYsSUFBSSxvQkFBb0IsR0FBRztJQUN6QixZQUFZO0lBQ1osVUFBVTtDQUNYLENBQUM7QUFFRixPQUFPLENBQUMsT0FBTyxFQUFFLFVBQVMsT0FBTztJQUMvQixPQUFPLENBQUMsYUFBYSxFQUFFLFVBQVMsUUFBUTtRQUN0QyxPQUFPLENBQUMsb0JBQW9CLEVBQUUsVUFBUyxRQUFRO1lBQzdDLElBQUksQ0FBQyxJQUFJLEdBQUcsT0FBTyxHQUFHLEdBQUcsR0FBRyxRQUFRLEdBQUcsSUFBSSxHQUFHLFFBQVEsR0FBRyxrQkFBa0IsRUFBRTtnQkFDM0UsS0FBSyxDQUFDLHNCQUFzQixDQUFDLFNBQVMsRUFBRSxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsRUFBRSxRQUFRLEVBQUUsUUFBUSxHQUFHLFlBQVksQ0FBQyxFQUFFLFNBQVMsR0FBRyxRQUFRLEdBQUcsWUFBWSxDQUFDLENBQUM7WUFDekksQ0FBQyxDQUFDLENBQUM7UUFDTCxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyxDQUFDLENBQUMifQ==