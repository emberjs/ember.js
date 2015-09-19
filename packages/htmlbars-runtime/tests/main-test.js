import { hooks } from "../htmlbars-runtime";
import { manualElement } from "../htmlbars-runtime/render";
import { compile } from "../htmlbars-compiler/compiler";
import { hostBlock } from "../htmlbars-runtime/hooks";
import { equalTokens } from "../htmlbars-test-helpers";
import DOMHelper from "../dom-helper";
let env;
QUnit.module("htmlbars-runtime", {
    setup() {
        env = {
            dom: new DOMHelper(),
            hooks: hooks,
            helpers: {},
            partials: {},
            useFragmentCache: true
        };
    }
});
QUnit.skip("manualElement function honors namespaces", function () {
    hooks.keywords['manual-element'] = {
        render: function (morph, env, scope, params, hash, template, inverse, visitor) {
            var attributes = {
                version: '1.1'
            };
            var layout = manualElement('svg', attributes);
            hostBlock(morph, env, scope, template, inverse, null, visitor, function (options) {
                options.templates.template.yieldIn({ raw: layout }, hash);
            });
            manualElement(env, scope, 'span', attributes, morph);
        },
        isStable: function () { return true; }
    };
    var template = compile('{{#manual-element}}<linearGradient><stop offset="{{startOffset}}"></stop><stop offset="{{stopOffset}}"></stop></linearGradient>{{/manual-element}}');
    var result = template.render({ startOffset: 0.1, stopOffset: 0.6 }, env);
    ok(result.fragment.childNodes[1] instanceof SVGElement);
    ok(result.fragment.childNodes[1].childNodes[0] instanceof SVGLinearGradientElement);
    equalTokens(result.fragment, '<svg version="1.1"><linearGradient><stop offset="0.1"></stop><stop offset="0.6"></stop></linearGradient></svg>');
});
test("manualElement function honors void elements", function () {
    var attributes = {
        class: 'foo-bar'
    };
    var layout = manualElement('input', attributes);
    var element = layout.buildRoot({ dom: new DOMHelper() });
    equal(element.childNodes.length, 0, 'no child nodes were added to `<input>` because it is a void tag');
    equalTokens(element, '<input class="foo-bar">');
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi10ZXN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2h0bWxiYXJzLXJ1bnRpbWUvdGVzdHMvbWFpbi10ZXN0LnRzIl0sIm5hbWVzIjpbInNldHVwIl0sIm1hcHBpbmdzIjoiT0FDTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFCQUFxQjtPQUNwQyxFQUFFLGFBQWEsRUFBRSxNQUFNLDRCQUE0QjtPQUNuRCxFQUFFLE9BQU8sRUFBRSxNQUFNLCtCQUErQjtPQUNoRCxFQUFFLFNBQVMsRUFBRSxNQUFNLDJCQUEyQjtPQUM5QyxFQUFFLFdBQVcsRUFBRSxNQUFNLDBCQUEwQjtPQUMvQyxTQUFTLE1BQU0sZUFBZTtBQUVyQyxJQUFJLEdBQUcsQ0FBQztBQUVSLEtBQUssQ0FBQyxNQUFNLENBQUMsa0JBQWtCLEVBQUU7SUFDL0IsS0FBSztRQUNIQSxHQUFHQSxHQUFHQTtZQUNKQSxHQUFHQSxFQUFFQSxJQUFJQSxTQUFTQSxFQUFFQTtZQUNwQkEsS0FBS0EsRUFBRUEsS0FBS0E7WUFDWkEsT0FBT0EsRUFBRUEsRUFBRUE7WUFDWEEsUUFBUUEsRUFBRUEsRUFBRUE7WUFDWkEsZ0JBQWdCQSxFQUFFQSxJQUFJQTtTQUN2QkEsQ0FBQ0E7SUFDSkEsQ0FBQ0E7Q0FDRixDQUFDLENBQUM7QUFFSCxLQUFLLENBQUMsSUFBSSxDQUFDLDBDQUEwQyxFQUFFO0lBQ3JELEtBQUssQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLENBQUMsR0FBRztRQUMvQixNQUFNLEVBQUUsVUFBUyxLQUFLLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsT0FBTztZQUMxRSxJQUFJLFVBQVUsR0FBRztnQkFDZixPQUFPLEVBQUUsS0FBSzthQUNmLENBQUM7WUFFRixJQUFJLE1BQU0sR0FBRyxhQUFhLENBQUMsS0FBSyxFQUFFLFVBQVUsQ0FBQyxDQUFDO1lBRTlDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsVUFBUyxPQUFPO2dCQUM3RSxPQUFPLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRSxHQUFHLEVBQUUsTUFBTSxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDNUQsQ0FBQyxDQUFDLENBQUM7WUFFSCxhQUFhLENBQUMsR0FBRyxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsVUFBVSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ3ZELENBQUM7UUFFRCxRQUFRLEVBQUUsY0FBYSxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztLQUN0QyxDQUFDO0lBRUYsSUFBSSxRQUFRLEdBQUcsT0FBTyxDQUFDLG9KQUFvSixDQUFDLENBQUM7SUFDN0ssSUFBSSxNQUFNLEdBQUcsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFDLFdBQVcsRUFBQyxHQUFHLEVBQUUsVUFBVSxFQUFDLEdBQUcsRUFBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO0lBQ3JFLEVBQUUsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsWUFBWSxVQUFVLENBQUMsQ0FBQztJQUN4RCxFQUFFLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxZQUFZLHdCQUF3QixDQUFDLENBQUM7SUFDcEYsV0FBVyxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsZ0hBQWdILENBQUMsQ0FBQztBQUNuSixDQUFDLENBQUMsQ0FBQztBQUVILElBQUksQ0FBQyw2Q0FBNkMsRUFBRTtJQUNsRCxJQUFJLFVBQVUsR0FBRztRQUNmLEtBQUssRUFBRSxTQUFTO0tBQ2pCLENBQUM7SUFDRixJQUFJLE1BQU0sR0FBRyxhQUFhLENBQUMsT0FBTyxFQUFFLFVBQVUsQ0FBQyxDQUFDO0lBQ2hELElBQUksT0FBTyxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUMsRUFBRSxHQUFHLEVBQUUsSUFBSSxTQUFTLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFFekQsS0FBSyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxpRUFBaUUsQ0FBQyxDQUFDO0lBQ3ZHLFdBQVcsQ0FBQyxPQUFPLEVBQUUseUJBQXlCLENBQUMsQ0FBQztBQUNsRCxDQUFDLENBQUMsQ0FBQyJ9