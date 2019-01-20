var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { RenderTest } from '../render-test';
import { test } from '../test-decorator';
import { EmberishGlimmerComponent, EmberishCurlyComponent } from '../components';
import { strip } from '../test-helpers/strings';
import { assertElementShape, classes, assertEmberishElement } from '../dom/assertions';
import { assertElement, toInnerHTML } from '../dom/simple-utils';
import { equalTokens } from '../snapshot';
export class EmberishComponentTests extends RenderTest {
    '[BUG: #644 popping args should be balanced]'() {
        class MainComponent extends EmberishGlimmerComponent {
            constructor() {
                super(...arguments);
                this.salutation = 'Glimmer';
            }
        }
        this.registerComponent('Glimmer', 'Main', '<div><HelloWorld @name={{salutation}} /></div>', MainComponent);
        this.registerComponent('Glimmer', 'HelloWorld', '<h1>Hello {{@name}}!</h1>');
        this.render('<Main />');
        this.assertHTML('<div><h1>Hello Glimmer!</h1></div>');
    }
    '[BUG] Gracefully handles application of curried args when invoke starts with 0 args'() {
        class MainComponent extends EmberishGlimmerComponent {
            constructor() {
                super(...arguments);
                this.salutation = 'Glimmer';
            }
        }
        this.registerComponent('Glimmer', 'Main', '<div><HelloWorld @a={{@a}} as |wat|>{{wat}}</HelloWorld></div>', MainComponent);
        this.registerComponent('Glimmer', 'HelloWorld', '{{yield (component "A" a=@a)}}');
        this.registerComponent('Glimmer', 'A', 'A {{@a}}');
        this.render('<Main @a={{a}} />', { a: 'a' });
        this.assertHTML('<div>A a</div>');
        this.assertStableRerender();
        this.rerender({ a: 'A' });
        this.assertHTML('<div>A A</div>');
        this.assertStableNodes();
    }
    'Static block component helper'() {
        this.registerComponent('Glimmer', 'A', 'A {{#component "B" arg1=@one}}{{/component}}');
        this.registerComponent('Glimmer', 'B', 'B {{@arg1}}');
        this.render('<A @one={{arg}} />', { arg: 1 });
        this.assertHTML('A B 1');
        this.assertStableRerender();
        this.rerender({ arg: 2 });
        this.assertHTML('A B 2');
        this.assertStableNodes();
    }
    'Static inline component helper'() {
        this.registerComponent('Glimmer', 'A', 'A {{component "B" arg1=@one}}');
        this.registerComponent('Glimmer', 'B', 'B {{@arg1}}');
        this.render('<A @one={{arg}} />', { arg: 1 });
        this.assertHTML('A B 1');
        this.assertStableRerender();
        this.rerender({ arg: 2 });
        this.assertHTML('A B 2');
        this.assertStableNodes();
    }
    'top level in-element'() {
        this.registerComponent('Glimmer', 'Foo', '<Bar data-bar={{@childName}} @data={{@data}} />');
        this.registerComponent('Glimmer', 'Bar', '<div ...attributes>Hello World</div>');
        let el = this.delegate.getInitialElement();
        this.render(strip `
    {{#each components key="id" as |component|}}
      {{#in-element component.mount}}
        {{component component.name childName=component.child data=component.data}}
      {{/in-element}}
    {{/each}}
    `, { components: [{ name: 'Foo', child: 'Bar', mount: el, data: { wat: 'Wat' } }] });
        let first = assertElement(el.firstChild);
        assertElementShape(first, 'div', { 'data-bar': 'Bar' }, 'Hello World');
        this.rerender({ components: [{ name: 'Foo', child: 'Bar', mount: el, data: { wat: 'Wat' } }] });
        assertElementShape(first, 'div', { 'data-bar': 'Bar' }, 'Hello World');
    }
    'recursive component invocation'() {
        let counter = 0;
        class RecursiveInvoker extends EmberishGlimmerComponent {
            get showChildren() {
                return this.id < 3;
            }
            constructor(args) {
                super(args);
                this.id = ++counter;
            }
        }
        this.registerComponent('Glimmer', 'RecursiveInvoker', '{{id}}{{#if showChildren}}<RecursiveInvoker />{{/if}}', RecursiveInvoker);
        this.render('<RecursiveInvoker />');
        this.assertHTML('123<!---->');
    }
    'Element modifier with hooks'(assert, count) {
        this.registerModifier('foo', class {
            didInsertElement() {
                count.expect('didInsertElement');
                assert.ok(this.element, 'didInsertElement');
                assert.equal(this.element.getAttribute('data-ok'), 'true', 'didInsertElement');
            }
            didUpdate() {
                count.expect('didUpdate');
                assert.ok(true, 'didUpdate');
            }
            willDestroyElement() {
                count.expect('willDestroyElement');
                assert.ok(true, 'willDestroyElement');
            }
        });
        this.render('{{#if ok}}<div data-ok=true {{foo bar}}></div>{{/if}}', {
            bar: 'bar',
            ok: true,
        });
        this.rerender({ bar: 'foo' });
        this.rerender({ ok: false });
    }
    'non-block without properties'() {
        this.render({
            layout: 'In layout',
        });
        this.assertComponent('In layout');
        this.assertStableRerender();
    }
    'block without properties'() {
        this.render({
            layout: 'In layout -- {{yield}}',
            template: 'In template',
        });
        this.assertComponent('In layout -- In template');
        this.assertStableRerender();
    }
    'yield inside a conditional on the component'() {
        this.render({
            layout: 'In layout -- {{#if @predicate}}{{yield}}{{/if}}',
            template: 'In template',
            args: { predicate: 'predicate' },
        }, { predicate: true });
        this.assertComponent('In layout -- In template', {});
        this.assertStableRerender();
        this.rerender({ predicate: false });
        this.assertComponent('In layout -- <!---->');
        this.assertStableNodes();
        this.rerender({ predicate: true });
        this.assertComponent('In layout -- In template', {});
        this.assertStableNodes();
    }
    'non-block with properties on attrs'() {
        this.render({
            layout: 'In layout - someProp: {{@someProp}}',
            args: { someProp: '"something here"' },
        });
        this.assertComponent('In layout - someProp: something here');
        this.assertStableRerender();
    }
    'block with properties on attrs'() {
        this.render({
            layout: 'In layout - someProp: {{@someProp}} - {{yield}}',
            template: 'In template',
            args: { someProp: '"something here"' },
        });
        this.assertComponent('In layout - someProp: something here - In template');
        this.assertStableRerender();
    }
    'with ariaRole specified'() {
        this.render({
            layout: 'Here!',
            attributes: { id: '"aria-test"', ariaRole: '"main"' },
        });
        this.assertComponent('Here!', { id: '"aria-test"', role: '"main"' });
        this.assertStableRerender();
    }
    'with ariaRole and class specified'() {
        this.render({
            layout: 'Here!',
            attributes: { id: '"aria-test"', class: '"foo"', ariaRole: '"main"' },
        });
        this.assertComponent('Here!', {
            id: '"aria-test"',
            class: classes('ember-view foo'),
            role: '"main"',
        });
        this.assertStableRerender();
    }
    'with ariaRole specified as an outer binding'() {
        this.render({
            layout: 'Here!',
            attributes: { id: '"aria-test"', class: '"foo"', ariaRole: 'ariaRole' },
        }, { ariaRole: 'main' });
        this.assertComponent('Here!', {
            id: '"aria-test"',
            class: classes('ember-view foo'),
            role: '"main"',
        });
        this.assertStableRerender();
    }
    'glimmer component with role specified as an outer binding and copied'() {
        this.render({
            layout: 'Here!',
            attributes: { id: '"aria-test"', role: 'myRole' },
        }, { myRole: 'main' });
        this.assertComponent('Here!', { id: '"aria-test"', role: '"main"' });
        this.assertStableRerender();
    }
    'invoking wrapped layout via angle brackets applies ...attributes'() {
        this.registerComponent('Curly', 'FooBar', 'Hello world!');
        this.render(`<FooBar data-foo="bar" />`);
        this.assertComponent('Hello world!', { 'data-foo': 'bar' });
        this.assertStableRerender();
    }
    'invoking wrapped layout via angle brackets - invocation attributes clobber internal attributes'() {
        class FooBar extends EmberishCurlyComponent {
            constructor() {
                super();
                this.attributeBindings = ['data-foo'];
                this['data-foo'] = 'inner';
            }
        }
        this.registerComponent('Curly', 'FooBar', 'Hello world!', FooBar);
        this.render(`<FooBar data-foo="outer" />`);
        this.assertComponent('Hello world!', { 'data-foo': 'outer' });
        this.assertStableRerender();
    }
    'invoking wrapped layout via angle brackets - invocation attributes merges classes'() {
        class FooBar extends EmberishCurlyComponent {
            constructor() {
                super();
                this.attributeBindings = ['class'];
                this['class'] = 'inner';
            }
        }
        this.registerComponent('Curly', 'FooBar', 'Hello world!', FooBar);
        this.render(`<FooBar class="outer" />`);
        this.assertComponent('Hello world!', { class: classes('ember-view inner outer') });
        this.assertStableRerender();
    }
    'invoking wrapped layout via angle brackets also applies explicit ...attributes'() {
        this.registerComponent('Curly', 'FooBar', '<h1 ...attributes>Hello world!</h1>');
        this.render(`<FooBar data-foo="bar" />`);
        let wrapperElement = assertElement(this.element.firstChild);
        assertEmberishElement(wrapperElement, 'div', { 'data-foo': 'bar' });
        equalTokens(toInnerHTML(wrapperElement), '<h1 data-foo="bar">Hello world!</h1>');
        this.assertStableRerender();
    }
}
EmberishComponentTests.suiteName = 'Emberish';
__decorate([
    test({ kind: 'glimmer' })
], EmberishComponentTests.prototype, "[BUG: #644 popping args should be balanced]", null);
__decorate([
    test({ kind: 'glimmer' })
], EmberishComponentTests.prototype, "[BUG] Gracefully handles application of curried args when invoke starts with 0 args", null);
__decorate([
    test({ kind: 'glimmer' })
], EmberishComponentTests.prototype, "Static block component helper", null);
__decorate([
    test({ kind: 'glimmer' })
], EmberishComponentTests.prototype, "Static inline component helper", null);
__decorate([
    test({ kind: 'glimmer' })
], EmberishComponentTests.prototype, "top level in-element", null);
__decorate([
    test({ kind: 'glimmer' })
], EmberishComponentTests.prototype, "recursive component invocation", null);
__decorate([
    test
], EmberishComponentTests.prototype, "Element modifier with hooks", null);
__decorate([
    test
], EmberishComponentTests.prototype, "non-block without properties", null);
__decorate([
    test
], EmberishComponentTests.prototype, "block without properties", null);
__decorate([
    test
], EmberishComponentTests.prototype, "yield inside a conditional on the component", null);
__decorate([
    test
], EmberishComponentTests.prototype, "non-block with properties on attrs", null);
__decorate([
    test
], EmberishComponentTests.prototype, "block with properties on attrs", null);
__decorate([
    test({ skip: true, kind: 'curly' })
], EmberishComponentTests.prototype, "with ariaRole specified", null);
__decorate([
    test({ skip: true, kind: 'curly' })
], EmberishComponentTests.prototype, "with ariaRole and class specified", null);
__decorate([
    test({ skip: true, kind: 'curly' })
], EmberishComponentTests.prototype, "with ariaRole specified as an outer binding", null);
__decorate([
    test({ skip: true, kind: 'glimmer' })
], EmberishComponentTests.prototype, "glimmer component with role specified as an outer binding and copied", null);
__decorate([
    test({ kind: 'curly' })
], EmberishComponentTests.prototype, "invoking wrapped layout via angle brackets applies ...attributes", null);
__decorate([
    test({ kind: 'curly' })
], EmberishComponentTests.prototype, "invoking wrapped layout via angle brackets - invocation attributes clobber internal attributes", null);
__decorate([
    test({ kind: 'curly' })
], EmberishComponentTests.prototype, "invoking wrapped layout via angle brackets - invocation attributes merges classes", null);
__decorate([
    test({ kind: 'curly' })
], EmberishComponentTests.prototype, "invoking wrapped layout via angle brackets also applies explicit ...attributes", null);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW1iZXJpc2gtY29tcG9uZW50cy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL2xpYi9zdWl0ZXMvZW1iZXJpc2gtY29tcG9uZW50cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSxPQUFPLEVBQUUsVUFBVSxFQUFTLE1BQU0sZ0JBQWdCLENBQUM7QUFDbkQsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBRXpDLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxzQkFBc0IsRUFBRSxNQUFNLGVBQWUsQ0FBQztBQUNqRixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFDaEQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBQ3ZGLE9BQU8sRUFBRSxhQUFhLEVBQUUsV0FBVyxFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFFakUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGFBQWEsQ0FBQztBQUUxQyxNQUFNLE9BQU8sc0JBQXVCLFNBQVEsVUFBVTtJQUlwRCw2Q0FBNkM7UUFDM0MsTUFBTSxhQUFjLFNBQVEsd0JBQXdCO1lBQXBEOztnQkFDRSxlQUFVLEdBQUcsU0FBUyxDQUFDO1lBQ3pCLENBQUM7U0FBQTtRQUNELElBQUksQ0FBQyxpQkFBaUIsQ0FDcEIsU0FBUyxFQUNULE1BQU0sRUFDTixnREFBZ0QsRUFDaEQsYUFBYSxDQUNkLENBQUM7UUFDRixJQUFJLENBQUMsaUJBQWlCLENBQUMsU0FBUyxFQUFFLFlBQVksRUFBRSwyQkFBMkIsQ0FBQyxDQUFDO1FBQzdFLElBQUksQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDeEIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxvQ0FBb0MsQ0FBQyxDQUFDO0lBQ3hELENBQUM7SUFHRCxxRkFBcUY7UUFDbkYsTUFBTSxhQUFjLFNBQVEsd0JBQXdCO1lBQXBEOztnQkFDRSxlQUFVLEdBQUcsU0FBUyxDQUFDO1lBQ3pCLENBQUM7U0FBQTtRQUNELElBQUksQ0FBQyxpQkFBaUIsQ0FDcEIsU0FBUyxFQUNULE1BQU0sRUFDTixnRUFBZ0UsRUFDaEUsYUFBYSxDQUNkLENBQUM7UUFDRixJQUFJLENBQUMsaUJBQWlCLENBQUMsU0FBUyxFQUFFLFlBQVksRUFBRSxnQ0FBZ0MsQ0FBQyxDQUFDO1FBQ2xGLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTLEVBQUUsR0FBRyxFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBQ25ELElBQUksQ0FBQyxNQUFNLENBQUMsbUJBQW1CLEVBQUUsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQztRQUM3QyxJQUFJLENBQUMsVUFBVSxDQUFDLGdCQUFnQixDQUFDLENBQUM7UUFDbEMsSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUM7UUFDNUIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDO1FBQzFCLElBQUksQ0FBQyxVQUFVLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztRQUNsQyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztJQUMzQixDQUFDO0lBR0QsK0JBQStCO1FBQzdCLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTLEVBQUUsR0FBRyxFQUFFLDhDQUE4QyxDQUFDLENBQUM7UUFDdkYsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFNBQVMsRUFBRSxHQUFHLEVBQUUsYUFBYSxDQUFDLENBQUM7UUFDdEQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxvQkFBb0IsRUFBRSxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQzlDLElBQUksQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDekIsSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUM7UUFDNUIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQzFCLElBQUksQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDekIsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7SUFDM0IsQ0FBQztJQUdELGdDQUFnQztRQUM5QixJQUFJLENBQUMsaUJBQWlCLENBQUMsU0FBUyxFQUFFLEdBQUcsRUFBRSwrQkFBK0IsQ0FBQyxDQUFDO1FBQ3hFLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTLEVBQUUsR0FBRyxFQUFFLGFBQWEsQ0FBQyxDQUFDO1FBQ3RELElBQUksQ0FBQyxNQUFNLENBQUMsb0JBQW9CLEVBQUUsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUM5QyxJQUFJLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ3pCLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO1FBQzVCLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUMxQixJQUFJLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ3pCLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO0lBQzNCLENBQUM7SUFHRCxzQkFBc0I7UUFDcEIsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFNBQVMsRUFBRSxLQUFLLEVBQUUsaURBQWlELENBQUMsQ0FBQztRQUM1RixJQUFJLENBQUMsaUJBQWlCLENBQUMsU0FBUyxFQUFFLEtBQUssRUFBRSxzQ0FBc0MsQ0FBQyxDQUFDO1FBRWpGLElBQUksRUFBRSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztRQUUzQyxJQUFJLENBQUMsTUFBTSxDQUNULEtBQUssQ0FBQTs7Ozs7O0tBTU4sRUFDQyxFQUFFLFVBQVUsRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxFQUFFLENBQUMsRUFBRSxDQUNqRixDQUFDO1FBRUYsSUFBSSxLQUFLLEdBQUcsYUFBYSxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUV6QyxrQkFBa0IsQ0FBQyxLQUFLLEVBQUUsS0FBSyxFQUFFLEVBQUUsVUFBVSxFQUFFLEtBQUssRUFBRSxFQUFFLGFBQWEsQ0FBQyxDQUFDO1FBQ3ZFLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxVQUFVLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLElBQUksRUFBRSxFQUFFLEdBQUcsRUFBRSxLQUFLLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ2hHLGtCQUFrQixDQUFDLEtBQUssRUFBRSxLQUFLLEVBQUUsRUFBRSxVQUFVLEVBQUUsS0FBSyxFQUFFLEVBQUUsYUFBYSxDQUFDLENBQUM7SUFDekUsQ0FBQztJQUdELGdDQUFnQztRQUM5QixJQUFJLE9BQU8sR0FBRyxDQUFDLENBQUM7UUFFaEIsTUFBTSxnQkFBaUIsU0FBUSx3QkFBd0I7WUFHckQsSUFBSSxZQUFZO2dCQUNkLE9BQU8sSUFBSSxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7WUFDckIsQ0FBQztZQUVELFlBQVksSUFBeUI7Z0JBQ25DLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDWixJQUFJLENBQUMsRUFBRSxHQUFHLEVBQUUsT0FBTyxDQUFDO1lBQ3RCLENBQUM7U0FDRjtRQUVELElBQUksQ0FBQyxpQkFBaUIsQ0FDcEIsU0FBUyxFQUNULGtCQUFrQixFQUNsQix1REFBdUQsRUFDdkQsZ0JBQWdCLENBQ2pCLENBQUM7UUFFRixJQUFJLENBQUMsTUFBTSxDQUFDLHNCQUFzQixDQUFDLENBQUM7UUFDcEMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxZQUFZLENBQUMsQ0FBQztJQUNoQyxDQUFDO0lBR0QsNkJBQTZCLENBQUMsTUFBYyxFQUFFLEtBQVk7UUFDeEQsSUFBSSxDQUFDLGdCQUFnQixDQUNuQixLQUFLLEVBQ0w7WUFFRSxnQkFBZ0I7Z0JBQ2QsS0FBSyxDQUFDLE1BQU0sQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO2dCQUNqQyxNQUFNLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsa0JBQWtCLENBQUMsQ0FBQztnQkFDNUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsT0FBUSxDQUFDLFlBQVksQ0FBQyxTQUFTLENBQUMsRUFBRSxNQUFNLEVBQUUsa0JBQWtCLENBQUMsQ0FBQztZQUNsRixDQUFDO1lBRUQsU0FBUztnQkFDUCxLQUFLLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDO2dCQUMxQixNQUFNLENBQUMsRUFBRSxDQUFDLElBQUksRUFBRSxXQUFXLENBQUMsQ0FBQztZQUMvQixDQUFDO1lBRUQsa0JBQWtCO2dCQUNoQixLQUFLLENBQUMsTUFBTSxDQUFDLG9CQUFvQixDQUFDLENBQUM7Z0JBQ25DLE1BQU0sQ0FBQyxFQUFFLENBQUMsSUFBSSxFQUFFLG9CQUFvQixDQUFDLENBQUM7WUFDeEMsQ0FBQztTQUNGLENBQ0YsQ0FBQztRQUVGLElBQUksQ0FBQyxNQUFNLENBQUMsdURBQXVELEVBQUU7WUFDbkUsR0FBRyxFQUFFLEtBQUs7WUFDVixFQUFFLEVBQUUsSUFBSTtTQUNULENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQztRQUM5QixJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsRUFBRSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUM7SUFDL0IsQ0FBQztJQUdELDhCQUE4QjtRQUM1QixJQUFJLENBQUMsTUFBTSxDQUFDO1lBQ1YsTUFBTSxFQUFFLFdBQVc7U0FDcEIsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLGVBQWUsQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUNsQyxJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztJQUM5QixDQUFDO0lBR0QsMEJBQTBCO1FBQ3hCLElBQUksQ0FBQyxNQUFNLENBQUM7WUFDVixNQUFNLEVBQUUsd0JBQXdCO1lBQ2hDLFFBQVEsRUFBRSxhQUFhO1NBQ3hCLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxlQUFlLENBQUMsMEJBQTBCLENBQUMsQ0FBQztRQUNqRCxJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztJQUM5QixDQUFDO0lBR0QsNkNBQTZDO1FBQzNDLElBQUksQ0FBQyxNQUFNLENBQ1Q7WUFDRSxNQUFNLEVBQUUsaURBQWlEO1lBQ3pELFFBQVEsRUFBRSxhQUFhO1lBQ3ZCLElBQUksRUFBRSxFQUFFLFNBQVMsRUFBRSxXQUFXLEVBQUU7U0FDakMsRUFDRCxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsQ0FDcEIsQ0FBQztRQUVGLElBQUksQ0FBQyxlQUFlLENBQUMsMEJBQTBCLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDckQsSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUM7UUFFNUIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO1FBQ3BDLElBQUksQ0FBQyxlQUFlLENBQUMsc0JBQXNCLENBQUMsQ0FBQztRQUM3QyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztRQUV6QixJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7UUFDbkMsSUFBSSxDQUFDLGVBQWUsQ0FBQywwQkFBMEIsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUNyRCxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztJQUMzQixDQUFDO0lBR0Qsb0NBQW9DO1FBQ2xDLElBQUksQ0FBQyxNQUFNLENBQUM7WUFDVixNQUFNLEVBQUUscUNBQXFDO1lBQzdDLElBQUksRUFBRSxFQUFFLFFBQVEsRUFBRSxrQkFBa0IsRUFBRTtTQUN2QyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsZUFBZSxDQUFDLHNDQUFzQyxDQUFDLENBQUM7UUFDN0QsSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUM7SUFDOUIsQ0FBQztJQUdELGdDQUFnQztRQUM5QixJQUFJLENBQUMsTUFBTSxDQUFDO1lBQ1YsTUFBTSxFQUFFLGlEQUFpRDtZQUN6RCxRQUFRLEVBQUUsYUFBYTtZQUN2QixJQUFJLEVBQUUsRUFBRSxRQUFRLEVBQUUsa0JBQWtCLEVBQUU7U0FDdkMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLGVBQWUsQ0FBQyxvREFBb0QsQ0FBQyxDQUFDO1FBQzNFLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO0lBQzlCLENBQUM7SUFHRCx5QkFBeUI7UUFDdkIsSUFBSSxDQUFDLE1BQU0sQ0FBQztZQUNWLE1BQU0sRUFBRSxPQUFPO1lBQ2YsVUFBVSxFQUFFLEVBQUUsRUFBRSxFQUFFLGFBQWEsRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFO1NBQ3RELENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxlQUFlLENBQUMsT0FBTyxFQUFFLEVBQUUsRUFBRSxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FBQztRQUNyRSxJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztJQUM5QixDQUFDO0lBR0QsbUNBQW1DO1FBQ2pDLElBQUksQ0FBQyxNQUFNLENBQUM7WUFDVixNQUFNLEVBQUUsT0FBTztZQUNmLFVBQVUsRUFBRSxFQUFFLEVBQUUsRUFBRSxhQUFhLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFO1NBQ3RFLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxlQUFlLENBQUMsT0FBTyxFQUFFO1lBQzVCLEVBQUUsRUFBRSxhQUFhO1lBQ2pCLEtBQUssRUFBRSxPQUFPLENBQUMsZ0JBQWdCLENBQUM7WUFDaEMsSUFBSSxFQUFFLFFBQVE7U0FDZixDQUFDLENBQUM7UUFDSCxJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztJQUM5QixDQUFDO0lBR0QsNkNBQTZDO1FBQzNDLElBQUksQ0FBQyxNQUFNLENBQ1Q7WUFDRSxNQUFNLEVBQUUsT0FBTztZQUNmLFVBQVUsRUFBRSxFQUFFLEVBQUUsRUFBRSxhQUFhLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsVUFBVSxFQUFFO1NBQ3hFLEVBQ0QsRUFBRSxRQUFRLEVBQUUsTUFBTSxFQUFFLENBQ3JCLENBQUM7UUFFRixJQUFJLENBQUMsZUFBZSxDQUFDLE9BQU8sRUFBRTtZQUM1QixFQUFFLEVBQUUsYUFBYTtZQUNqQixLQUFLLEVBQUUsT0FBTyxDQUFDLGdCQUFnQixDQUFDO1lBQ2hDLElBQUksRUFBRSxRQUFRO1NBQ2YsQ0FBQyxDQUFDO1FBQ0gsSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUM7SUFDOUIsQ0FBQztJQUdELHNFQUFzRTtRQUNwRSxJQUFJLENBQUMsTUFBTSxDQUNUO1lBQ0UsTUFBTSxFQUFFLE9BQU87WUFDZixVQUFVLEVBQUUsRUFBRSxFQUFFLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUU7U0FDbEQsRUFDRCxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsQ0FDbkIsQ0FBQztRQUVGLElBQUksQ0FBQyxlQUFlLENBQUMsT0FBTyxFQUFFLEVBQUUsRUFBRSxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FBQztRQUNyRSxJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztJQUM5QixDQUFDO0lBR0Qsa0VBQWtFO1FBQ2hFLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxPQUFPLEVBQUUsUUFBUSxFQUFFLGNBQWMsQ0FBQyxDQUFDO1FBRTFELElBQUksQ0FBQyxNQUFNLENBQUMsMkJBQTJCLENBQUMsQ0FBQztRQUV6QyxJQUFJLENBQUMsZUFBZSxDQUFDLGNBQWMsRUFBRSxFQUFFLFVBQVUsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO1FBQzVELElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO0lBQzlCLENBQUM7SUFHRCxnR0FBZ0c7UUFDOUYsTUFBTSxNQUFPLFNBQVEsc0JBQXNCO1lBR3pDO2dCQUNFLEtBQUssRUFBRSxDQUFDO2dCQUNSLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDO2dCQUN0QyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsT0FBTyxDQUFDO1lBQzdCLENBQUM7U0FDRjtRQUNELElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxPQUFPLEVBQUUsUUFBUSxFQUFFLGNBQWMsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUVsRSxJQUFJLENBQUMsTUFBTSxDQUFDLDZCQUE2QixDQUFDLENBQUM7UUFFM0MsSUFBSSxDQUFDLGVBQWUsQ0FBQyxjQUFjLEVBQUUsRUFBRSxVQUFVLEVBQUUsT0FBTyxFQUFFLENBQUMsQ0FBQztRQUM5RCxJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztJQUM5QixDQUFDO0lBR0QsbUZBQW1GO1FBQ2pGLE1BQU0sTUFBTyxTQUFRLHNCQUFzQjtZQUd6QztnQkFDRSxLQUFLLEVBQUUsQ0FBQztnQkFDUixJQUFJLENBQUMsaUJBQWlCLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQztnQkFDbkMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLE9BQU8sQ0FBQztZQUMxQixDQUFDO1NBQ0Y7UUFDRCxJQUFJLENBQUMsaUJBQWlCLENBQUMsT0FBTyxFQUFFLFFBQVEsRUFBRSxjQUFjLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFFbEUsSUFBSSxDQUFDLE1BQU0sQ0FBQywwQkFBMEIsQ0FBQyxDQUFDO1FBRXhDLElBQUksQ0FBQyxlQUFlLENBQUMsY0FBYyxFQUFFLEVBQUUsS0FBSyxFQUFFLE9BQU8sQ0FBQyx3QkFBd0IsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUNuRixJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztJQUM5QixDQUFDO0lBR0QsZ0ZBQWdGO1FBQzlFLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxPQUFPLEVBQUUsUUFBUSxFQUFFLHFDQUFxQyxDQUFDLENBQUM7UUFFakYsSUFBSSxDQUFDLE1BQU0sQ0FBQywyQkFBMkIsQ0FBQyxDQUFDO1FBRXpDLElBQUksY0FBYyxHQUFHLGFBQWEsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQzVELHFCQUFxQixDQUFDLGNBQWMsRUFBRSxLQUFLLEVBQUUsRUFBRSxVQUFVLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQztRQUNwRSxXQUFXLENBQUMsV0FBVyxDQUFDLGNBQWMsQ0FBQyxFQUFFLHNDQUFzQyxDQUFDLENBQUM7UUFFakYsSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUM7SUFDOUIsQ0FBQzs7QUE3VU0sZ0NBQVMsR0FBRyxVQUFVLENBQUM7QUFHOUI7SUFEQyxJQUFJLENBQUMsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLENBQUM7eUZBY3pCO0FBR0Q7SUFEQyxJQUFJLENBQUMsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLENBQUM7aUlBbUJ6QjtBQUdEO0lBREMsSUFBSSxDQUFDLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxDQUFDOzJFQVV6QjtBQUdEO0lBREMsSUFBSSxDQUFDLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxDQUFDOzRFQVV6QjtBQUdEO0lBREMsSUFBSSxDQUFDLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxDQUFDO2tFQXVCekI7QUFHRDtJQURDLElBQUksQ0FBQyxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsQ0FBQzs0RUEwQnpCO0FBR0Q7SUFEQyxJQUFJO3lFQStCSjtBQUdEO0lBREMsSUFBSTswRUFRSjtBQUdEO0lBREMsSUFBSTtzRUFTSjtBQUdEO0lBREMsSUFBSTt5RkFxQko7QUFHRDtJQURDLElBQUk7Z0ZBU0o7QUFHRDtJQURDLElBQUk7NEVBVUo7QUFHRDtJQURDLElBQUksQ0FBQyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxDQUFDO3FFQVNuQztBQUdEO0lBREMsSUFBSSxDQUFDLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLENBQUM7K0VBYW5DO0FBR0Q7SUFEQyxJQUFJLENBQUMsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsQ0FBQzt5RkFnQm5DO0FBR0Q7SUFEQyxJQUFJLENBQUMsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsQ0FBQztrSEFZckM7QUFHRDtJQURDLElBQUksQ0FBQyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsQ0FBQzs4R0FRdkI7QUFHRDtJQURDLElBQUksQ0FBQyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsQ0FBQzs0SUFpQnZCO0FBR0Q7SUFEQyxJQUFJLENBQUMsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLENBQUM7K0hBaUJ2QjtBQUdEO0lBREMsSUFBSSxDQUFDLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxDQUFDOzRIQVd2QiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFJlbmRlclRlc3QsIENvdW50IH0gZnJvbSAnLi4vcmVuZGVyLXRlc3QnO1xuaW1wb3J0IHsgdGVzdCB9IGZyb20gJy4uL3Rlc3QtZGVjb3JhdG9yJztcbmltcG9ydCB7IFNpbXBsZUVsZW1lbnQgfSBmcm9tICdAc2ltcGxlLWRvbS9pbnRlcmZhY2UnO1xuaW1wb3J0IHsgRW1iZXJpc2hHbGltbWVyQ29tcG9uZW50LCBFbWJlcmlzaEN1cmx5Q29tcG9uZW50IH0gZnJvbSAnLi4vY29tcG9uZW50cyc7XG5pbXBvcnQgeyBzdHJpcCB9IGZyb20gJy4uL3Rlc3QtaGVscGVycy9zdHJpbmdzJztcbmltcG9ydCB7IGFzc2VydEVsZW1lbnRTaGFwZSwgY2xhc3NlcywgYXNzZXJ0RW1iZXJpc2hFbGVtZW50IH0gZnJvbSAnLi4vZG9tL2Fzc2VydGlvbnMnO1xuaW1wb3J0IHsgYXNzZXJ0RWxlbWVudCwgdG9Jbm5lckhUTUwgfSBmcm9tICcuLi9kb20vc2ltcGxlLXV0aWxzJztcbmltcG9ydCB7IEVtYmVyaXNoR2xpbW1lckFyZ3MgfSBmcm9tICcuLi9jb21wb25lbnRzL2VtYmVyaXNoLWdsaW1tZXInO1xuaW1wb3J0IHsgZXF1YWxUb2tlbnMgfSBmcm9tICcuLi9zbmFwc2hvdCc7XG5cbmV4cG9ydCBjbGFzcyBFbWJlcmlzaENvbXBvbmVudFRlc3RzIGV4dGVuZHMgUmVuZGVyVGVzdCB7XG4gIHN0YXRpYyBzdWl0ZU5hbWUgPSAnRW1iZXJpc2gnO1xuXG4gIEB0ZXN0KHsga2luZDogJ2dsaW1tZXInIH0pXG4gICdbQlVHOiAjNjQ0IHBvcHBpbmcgYXJncyBzaG91bGQgYmUgYmFsYW5jZWRdJygpIHtcbiAgICBjbGFzcyBNYWluQ29tcG9uZW50IGV4dGVuZHMgRW1iZXJpc2hHbGltbWVyQ29tcG9uZW50IHtcbiAgICAgIHNhbHV0YXRpb24gPSAnR2xpbW1lcic7XG4gICAgfVxuICAgIHRoaXMucmVnaXN0ZXJDb21wb25lbnQoXG4gICAgICAnR2xpbW1lcicsXG4gICAgICAnTWFpbicsXG4gICAgICAnPGRpdj48SGVsbG9Xb3JsZCBAbmFtZT17e3NhbHV0YXRpb259fSAvPjwvZGl2PicsXG4gICAgICBNYWluQ29tcG9uZW50XG4gICAgKTtcbiAgICB0aGlzLnJlZ2lzdGVyQ29tcG9uZW50KCdHbGltbWVyJywgJ0hlbGxvV29ybGQnLCAnPGgxPkhlbGxvIHt7QG5hbWV9fSE8L2gxPicpO1xuICAgIHRoaXMucmVuZGVyKCc8TWFpbiAvPicpO1xuICAgIHRoaXMuYXNzZXJ0SFRNTCgnPGRpdj48aDE+SGVsbG8gR2xpbW1lciE8L2gxPjwvZGl2PicpO1xuICB9XG5cbiAgQHRlc3QoeyBraW5kOiAnZ2xpbW1lcicgfSlcbiAgJ1tCVUddIEdyYWNlZnVsbHkgaGFuZGxlcyBhcHBsaWNhdGlvbiBvZiBjdXJyaWVkIGFyZ3Mgd2hlbiBpbnZva2Ugc3RhcnRzIHdpdGggMCBhcmdzJygpIHtcbiAgICBjbGFzcyBNYWluQ29tcG9uZW50IGV4dGVuZHMgRW1iZXJpc2hHbGltbWVyQ29tcG9uZW50IHtcbiAgICAgIHNhbHV0YXRpb24gPSAnR2xpbW1lcic7XG4gICAgfVxuICAgIHRoaXMucmVnaXN0ZXJDb21wb25lbnQoXG4gICAgICAnR2xpbW1lcicsXG4gICAgICAnTWFpbicsXG4gICAgICAnPGRpdj48SGVsbG9Xb3JsZCBAYT17e0BhfX0gYXMgfHdhdHw+e3t3YXR9fTwvSGVsbG9Xb3JsZD48L2Rpdj4nLFxuICAgICAgTWFpbkNvbXBvbmVudFxuICAgICk7XG4gICAgdGhpcy5yZWdpc3RlckNvbXBvbmVudCgnR2xpbW1lcicsICdIZWxsb1dvcmxkJywgJ3t7eWllbGQgKGNvbXBvbmVudCBcIkFcIiBhPUBhKX19Jyk7XG4gICAgdGhpcy5yZWdpc3RlckNvbXBvbmVudCgnR2xpbW1lcicsICdBJywgJ0Ege3tAYX19Jyk7XG4gICAgdGhpcy5yZW5kZXIoJzxNYWluIEBhPXt7YX19IC8+JywgeyBhOiAnYScgfSk7XG4gICAgdGhpcy5hc3NlcnRIVE1MKCc8ZGl2PkEgYTwvZGl2PicpO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlUmVyZW5kZXIoKTtcbiAgICB0aGlzLnJlcmVuZGVyKHsgYTogJ0EnIH0pO1xuICAgIHRoaXMuYXNzZXJ0SFRNTCgnPGRpdj5BIEE8L2Rpdj4nKTtcbiAgICB0aGlzLmFzc2VydFN0YWJsZU5vZGVzKCk7XG4gIH1cblxuICBAdGVzdCh7IGtpbmQ6ICdnbGltbWVyJyB9KVxuICAnU3RhdGljIGJsb2NrIGNvbXBvbmVudCBoZWxwZXInKCkge1xuICAgIHRoaXMucmVnaXN0ZXJDb21wb25lbnQoJ0dsaW1tZXInLCAnQScsICdBIHt7I2NvbXBvbmVudCBcIkJcIiBhcmcxPUBvbmV9fXt7L2NvbXBvbmVudH19Jyk7XG4gICAgdGhpcy5yZWdpc3RlckNvbXBvbmVudCgnR2xpbW1lcicsICdCJywgJ0Ige3tAYXJnMX19Jyk7XG4gICAgdGhpcy5yZW5kZXIoJzxBIEBvbmU9e3thcmd9fSAvPicsIHsgYXJnOiAxIH0pO1xuICAgIHRoaXMuYXNzZXJ0SFRNTCgnQSBCIDEnKTtcbiAgICB0aGlzLmFzc2VydFN0YWJsZVJlcmVuZGVyKCk7XG4gICAgdGhpcy5yZXJlbmRlcih7IGFyZzogMiB9KTtcbiAgICB0aGlzLmFzc2VydEhUTUwoJ0EgQiAyJyk7XG4gICAgdGhpcy5hc3NlcnRTdGFibGVOb2RlcygpO1xuICB9XG5cbiAgQHRlc3QoeyBraW5kOiAnZ2xpbW1lcicgfSlcbiAgJ1N0YXRpYyBpbmxpbmUgY29tcG9uZW50IGhlbHBlcicoKSB7XG4gICAgdGhpcy5yZWdpc3RlckNvbXBvbmVudCgnR2xpbW1lcicsICdBJywgJ0Ege3tjb21wb25lbnQgXCJCXCIgYXJnMT1Ab25lfX0nKTtcbiAgICB0aGlzLnJlZ2lzdGVyQ29tcG9uZW50KCdHbGltbWVyJywgJ0InLCAnQiB7e0BhcmcxfX0nKTtcbiAgICB0aGlzLnJlbmRlcignPEEgQG9uZT17e2FyZ319IC8+JywgeyBhcmc6IDEgfSk7XG4gICAgdGhpcy5hc3NlcnRIVE1MKCdBIEIgMScpO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlUmVyZW5kZXIoKTtcbiAgICB0aGlzLnJlcmVuZGVyKHsgYXJnOiAyIH0pO1xuICAgIHRoaXMuYXNzZXJ0SFRNTCgnQSBCIDInKTtcbiAgICB0aGlzLmFzc2VydFN0YWJsZU5vZGVzKCk7XG4gIH1cblxuICBAdGVzdCh7IGtpbmQ6ICdnbGltbWVyJyB9KVxuICAndG9wIGxldmVsIGluLWVsZW1lbnQnKCkge1xuICAgIHRoaXMucmVnaXN0ZXJDb21wb25lbnQoJ0dsaW1tZXInLCAnRm9vJywgJzxCYXIgZGF0YS1iYXI9e3tAY2hpbGROYW1lfX0gQGRhdGE9e3tAZGF0YX19IC8+Jyk7XG4gICAgdGhpcy5yZWdpc3RlckNvbXBvbmVudCgnR2xpbW1lcicsICdCYXInLCAnPGRpdiAuLi5hdHRyaWJ1dGVzPkhlbGxvIFdvcmxkPC9kaXY+Jyk7XG5cbiAgICBsZXQgZWwgPSB0aGlzLmRlbGVnYXRlLmdldEluaXRpYWxFbGVtZW50KCk7XG5cbiAgICB0aGlzLnJlbmRlcihcbiAgICAgIHN0cmlwYFxuICAgIHt7I2VhY2ggY29tcG9uZW50cyBrZXk9XCJpZFwiIGFzIHxjb21wb25lbnR8fX1cbiAgICAgIHt7I2luLWVsZW1lbnQgY29tcG9uZW50Lm1vdW50fX1cbiAgICAgICAge3tjb21wb25lbnQgY29tcG9uZW50Lm5hbWUgY2hpbGROYW1lPWNvbXBvbmVudC5jaGlsZCBkYXRhPWNvbXBvbmVudC5kYXRhfX1cbiAgICAgIHt7L2luLWVsZW1lbnR9fVxuICAgIHt7L2VhY2h9fVxuICAgIGAsXG4gICAgICB7IGNvbXBvbmVudHM6IFt7IG5hbWU6ICdGb28nLCBjaGlsZDogJ0JhcicsIG1vdW50OiBlbCwgZGF0YTogeyB3YXQ6ICdXYXQnIH0gfV0gfVxuICAgICk7XG5cbiAgICBsZXQgZmlyc3QgPSBhc3NlcnRFbGVtZW50KGVsLmZpcnN0Q2hpbGQpO1xuXG4gICAgYXNzZXJ0RWxlbWVudFNoYXBlKGZpcnN0LCAnZGl2JywgeyAnZGF0YS1iYXInOiAnQmFyJyB9LCAnSGVsbG8gV29ybGQnKTtcbiAgICB0aGlzLnJlcmVuZGVyKHsgY29tcG9uZW50czogW3sgbmFtZTogJ0ZvbycsIGNoaWxkOiAnQmFyJywgbW91bnQ6IGVsLCBkYXRhOiB7IHdhdDogJ1dhdCcgfSB9XSB9KTtcbiAgICBhc3NlcnRFbGVtZW50U2hhcGUoZmlyc3QsICdkaXYnLCB7ICdkYXRhLWJhcic6ICdCYXInIH0sICdIZWxsbyBXb3JsZCcpO1xuICB9XG5cbiAgQHRlc3QoeyBraW5kOiAnZ2xpbW1lcicgfSlcbiAgJ3JlY3Vyc2l2ZSBjb21wb25lbnQgaW52b2NhdGlvbicoKSB7XG4gICAgbGV0IGNvdW50ZXIgPSAwO1xuXG4gICAgY2xhc3MgUmVjdXJzaXZlSW52b2tlciBleHRlbmRzIEVtYmVyaXNoR2xpbW1lckNvbXBvbmVudCB7XG4gICAgICBpZDogbnVtYmVyO1xuXG4gICAgICBnZXQgc2hvd0NoaWxkcmVuKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5pZCA8IDM7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0cnVjdG9yKGFyZ3M6IEVtYmVyaXNoR2xpbW1lckFyZ3MpIHtcbiAgICAgICAgc3VwZXIoYXJncyk7XG4gICAgICAgIHRoaXMuaWQgPSArK2NvdW50ZXI7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5yZWdpc3RlckNvbXBvbmVudChcbiAgICAgICdHbGltbWVyJyxcbiAgICAgICdSZWN1cnNpdmVJbnZva2VyJyxcbiAgICAgICd7e2lkfX17eyNpZiBzaG93Q2hpbGRyZW59fTxSZWN1cnNpdmVJbnZva2VyIC8+e3svaWZ9fScsXG4gICAgICBSZWN1cnNpdmVJbnZva2VyXG4gICAgKTtcblxuICAgIHRoaXMucmVuZGVyKCc8UmVjdXJzaXZlSW52b2tlciAvPicpO1xuICAgIHRoaXMuYXNzZXJ0SFRNTCgnMTIzPCEtLS0tPicpO1xuICB9XG5cbiAgQHRlc3RcbiAgJ0VsZW1lbnQgbW9kaWZpZXIgd2l0aCBob29rcycoYXNzZXJ0OiBBc3NlcnQsIGNvdW50OiBDb3VudCkge1xuICAgIHRoaXMucmVnaXN0ZXJNb2RpZmllcihcbiAgICAgICdmb28nLFxuICAgICAgY2xhc3Mge1xuICAgICAgICBlbGVtZW50PzogU2ltcGxlRWxlbWVudDtcbiAgICAgICAgZGlkSW5zZXJ0RWxlbWVudCgpIHtcbiAgICAgICAgICBjb3VudC5leHBlY3QoJ2RpZEluc2VydEVsZW1lbnQnKTtcbiAgICAgICAgICBhc3NlcnQub2sodGhpcy5lbGVtZW50LCAnZGlkSW5zZXJ0RWxlbWVudCcpO1xuICAgICAgICAgIGFzc2VydC5lcXVhbCh0aGlzLmVsZW1lbnQhLmdldEF0dHJpYnV0ZSgnZGF0YS1vaycpLCAndHJ1ZScsICdkaWRJbnNlcnRFbGVtZW50Jyk7XG4gICAgICAgIH1cblxuICAgICAgICBkaWRVcGRhdGUoKSB7XG4gICAgICAgICAgY291bnQuZXhwZWN0KCdkaWRVcGRhdGUnKTtcbiAgICAgICAgICBhc3NlcnQub2sodHJ1ZSwgJ2RpZFVwZGF0ZScpO1xuICAgICAgICB9XG5cbiAgICAgICAgd2lsbERlc3Ryb3lFbGVtZW50KCkge1xuICAgICAgICAgIGNvdW50LmV4cGVjdCgnd2lsbERlc3Ryb3lFbGVtZW50Jyk7XG4gICAgICAgICAgYXNzZXJ0Lm9rKHRydWUsICd3aWxsRGVzdHJveUVsZW1lbnQnKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICk7XG5cbiAgICB0aGlzLnJlbmRlcigne3sjaWYgb2t9fTxkaXYgZGF0YS1vaz10cnVlIHt7Zm9vIGJhcn19PjwvZGl2Pnt7L2lmfX0nLCB7XG4gICAgICBiYXI6ICdiYXInLFxuICAgICAgb2s6IHRydWUsXG4gICAgfSk7XG5cbiAgICB0aGlzLnJlcmVuZGVyKHsgYmFyOiAnZm9vJyB9KTtcbiAgICB0aGlzLnJlcmVuZGVyKHsgb2s6IGZhbHNlIH0pO1xuICB9XG5cbiAgQHRlc3RcbiAgJ25vbi1ibG9jayB3aXRob3V0IHByb3BlcnRpZXMnKCkge1xuICAgIHRoaXMucmVuZGVyKHtcbiAgICAgIGxheW91dDogJ0luIGxheW91dCcsXG4gICAgfSk7XG5cbiAgICB0aGlzLmFzc2VydENvbXBvbmVudCgnSW4gbGF5b3V0Jyk7XG4gICAgdGhpcy5hc3NlcnRTdGFibGVSZXJlbmRlcigpO1xuICB9XG5cbiAgQHRlc3RcbiAgJ2Jsb2NrIHdpdGhvdXQgcHJvcGVydGllcycoKSB7XG4gICAgdGhpcy5yZW5kZXIoe1xuICAgICAgbGF5b3V0OiAnSW4gbGF5b3V0IC0tIHt7eWllbGR9fScsXG4gICAgICB0ZW1wbGF0ZTogJ0luIHRlbXBsYXRlJyxcbiAgICB9KTtcblxuICAgIHRoaXMuYXNzZXJ0Q29tcG9uZW50KCdJbiBsYXlvdXQgLS0gSW4gdGVtcGxhdGUnKTtcbiAgICB0aGlzLmFzc2VydFN0YWJsZVJlcmVuZGVyKCk7XG4gIH1cblxuICBAdGVzdFxuICAneWllbGQgaW5zaWRlIGEgY29uZGl0aW9uYWwgb24gdGhlIGNvbXBvbmVudCcoKSB7XG4gICAgdGhpcy5yZW5kZXIoXG4gICAgICB7XG4gICAgICAgIGxheW91dDogJ0luIGxheW91dCAtLSB7eyNpZiBAcHJlZGljYXRlfX17e3lpZWxkfX17ey9pZn19JyxcbiAgICAgICAgdGVtcGxhdGU6ICdJbiB0ZW1wbGF0ZScsXG4gICAgICAgIGFyZ3M6IHsgcHJlZGljYXRlOiAncHJlZGljYXRlJyB9LFxuICAgICAgfSxcbiAgICAgIHsgcHJlZGljYXRlOiB0cnVlIH1cbiAgICApO1xuXG4gICAgdGhpcy5hc3NlcnRDb21wb25lbnQoJ0luIGxheW91dCAtLSBJbiB0ZW1wbGF0ZScsIHt9KTtcbiAgICB0aGlzLmFzc2VydFN0YWJsZVJlcmVuZGVyKCk7XG5cbiAgICB0aGlzLnJlcmVuZGVyKHsgcHJlZGljYXRlOiBmYWxzZSB9KTtcbiAgICB0aGlzLmFzc2VydENvbXBvbmVudCgnSW4gbGF5b3V0IC0tIDwhLS0tLT4nKTtcbiAgICB0aGlzLmFzc2VydFN0YWJsZU5vZGVzKCk7XG5cbiAgICB0aGlzLnJlcmVuZGVyKHsgcHJlZGljYXRlOiB0cnVlIH0pO1xuICAgIHRoaXMuYXNzZXJ0Q29tcG9uZW50KCdJbiBsYXlvdXQgLS0gSW4gdGVtcGxhdGUnLCB7fSk7XG4gICAgdGhpcy5hc3NlcnRTdGFibGVOb2RlcygpO1xuICB9XG5cbiAgQHRlc3RcbiAgJ25vbi1ibG9jayB3aXRoIHByb3BlcnRpZXMgb24gYXR0cnMnKCkge1xuICAgIHRoaXMucmVuZGVyKHtcbiAgICAgIGxheW91dDogJ0luIGxheW91dCAtIHNvbWVQcm9wOiB7e0Bzb21lUHJvcH19JyxcbiAgICAgIGFyZ3M6IHsgc29tZVByb3A6ICdcInNvbWV0aGluZyBoZXJlXCInIH0sXG4gICAgfSk7XG5cbiAgICB0aGlzLmFzc2VydENvbXBvbmVudCgnSW4gbGF5b3V0IC0gc29tZVByb3A6IHNvbWV0aGluZyBoZXJlJyk7XG4gICAgdGhpcy5hc3NlcnRTdGFibGVSZXJlbmRlcigpO1xuICB9XG5cbiAgQHRlc3RcbiAgJ2Jsb2NrIHdpdGggcHJvcGVydGllcyBvbiBhdHRycycoKSB7XG4gICAgdGhpcy5yZW5kZXIoe1xuICAgICAgbGF5b3V0OiAnSW4gbGF5b3V0IC0gc29tZVByb3A6IHt7QHNvbWVQcm9wfX0gLSB7e3lpZWxkfX0nLFxuICAgICAgdGVtcGxhdGU6ICdJbiB0ZW1wbGF0ZScsXG4gICAgICBhcmdzOiB7IHNvbWVQcm9wOiAnXCJzb21ldGhpbmcgaGVyZVwiJyB9LFxuICAgIH0pO1xuXG4gICAgdGhpcy5hc3NlcnRDb21wb25lbnQoJ0luIGxheW91dCAtIHNvbWVQcm9wOiBzb21ldGhpbmcgaGVyZSAtIEluIHRlbXBsYXRlJyk7XG4gICAgdGhpcy5hc3NlcnRTdGFibGVSZXJlbmRlcigpO1xuICB9XG5cbiAgQHRlc3QoeyBza2lwOiB0cnVlLCBraW5kOiAnY3VybHknIH0pXG4gICd3aXRoIGFyaWFSb2xlIHNwZWNpZmllZCcoKSB7XG4gICAgdGhpcy5yZW5kZXIoe1xuICAgICAgbGF5b3V0OiAnSGVyZSEnLFxuICAgICAgYXR0cmlidXRlczogeyBpZDogJ1wiYXJpYS10ZXN0XCInLCBhcmlhUm9sZTogJ1wibWFpblwiJyB9LFxuICAgIH0pO1xuXG4gICAgdGhpcy5hc3NlcnRDb21wb25lbnQoJ0hlcmUhJywgeyBpZDogJ1wiYXJpYS10ZXN0XCInLCByb2xlOiAnXCJtYWluXCInIH0pO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlUmVyZW5kZXIoKTtcbiAgfVxuXG4gIEB0ZXN0KHsgc2tpcDogdHJ1ZSwga2luZDogJ2N1cmx5JyB9KVxuICAnd2l0aCBhcmlhUm9sZSBhbmQgY2xhc3Mgc3BlY2lmaWVkJygpIHtcbiAgICB0aGlzLnJlbmRlcih7XG4gICAgICBsYXlvdXQ6ICdIZXJlIScsXG4gICAgICBhdHRyaWJ1dGVzOiB7IGlkOiAnXCJhcmlhLXRlc3RcIicsIGNsYXNzOiAnXCJmb29cIicsIGFyaWFSb2xlOiAnXCJtYWluXCInIH0sXG4gICAgfSk7XG5cbiAgICB0aGlzLmFzc2VydENvbXBvbmVudCgnSGVyZSEnLCB7XG4gICAgICBpZDogJ1wiYXJpYS10ZXN0XCInLFxuICAgICAgY2xhc3M6IGNsYXNzZXMoJ2VtYmVyLXZpZXcgZm9vJyksXG4gICAgICByb2xlOiAnXCJtYWluXCInLFxuICAgIH0pO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlUmVyZW5kZXIoKTtcbiAgfVxuXG4gIEB0ZXN0KHsgc2tpcDogdHJ1ZSwga2luZDogJ2N1cmx5JyB9KVxuICAnd2l0aCBhcmlhUm9sZSBzcGVjaWZpZWQgYXMgYW4gb3V0ZXIgYmluZGluZycoKSB7XG4gICAgdGhpcy5yZW5kZXIoXG4gICAgICB7XG4gICAgICAgIGxheW91dDogJ0hlcmUhJyxcbiAgICAgICAgYXR0cmlidXRlczogeyBpZDogJ1wiYXJpYS10ZXN0XCInLCBjbGFzczogJ1wiZm9vXCInLCBhcmlhUm9sZTogJ2FyaWFSb2xlJyB9LFxuICAgICAgfSxcbiAgICAgIHsgYXJpYVJvbGU6ICdtYWluJyB9XG4gICAgKTtcblxuICAgIHRoaXMuYXNzZXJ0Q29tcG9uZW50KCdIZXJlIScsIHtcbiAgICAgIGlkOiAnXCJhcmlhLXRlc3RcIicsXG4gICAgICBjbGFzczogY2xhc3NlcygnZW1iZXItdmlldyBmb28nKSxcbiAgICAgIHJvbGU6ICdcIm1haW5cIicsXG4gICAgfSk7XG4gICAgdGhpcy5hc3NlcnRTdGFibGVSZXJlbmRlcigpO1xuICB9XG5cbiAgQHRlc3QoeyBza2lwOiB0cnVlLCBraW5kOiAnZ2xpbW1lcicgfSlcbiAgJ2dsaW1tZXIgY29tcG9uZW50IHdpdGggcm9sZSBzcGVjaWZpZWQgYXMgYW4gb3V0ZXIgYmluZGluZyBhbmQgY29waWVkJygpIHtcbiAgICB0aGlzLnJlbmRlcihcbiAgICAgIHtcbiAgICAgICAgbGF5b3V0OiAnSGVyZSEnLFxuICAgICAgICBhdHRyaWJ1dGVzOiB7IGlkOiAnXCJhcmlhLXRlc3RcIicsIHJvbGU6ICdteVJvbGUnIH0sXG4gICAgICB9LFxuICAgICAgeyBteVJvbGU6ICdtYWluJyB9XG4gICAgKTtcblxuICAgIHRoaXMuYXNzZXJ0Q29tcG9uZW50KCdIZXJlIScsIHsgaWQ6ICdcImFyaWEtdGVzdFwiJywgcm9sZTogJ1wibWFpblwiJyB9KTtcbiAgICB0aGlzLmFzc2VydFN0YWJsZVJlcmVuZGVyKCk7XG4gIH1cblxuICBAdGVzdCh7IGtpbmQ6ICdjdXJseScgfSlcbiAgJ2ludm9raW5nIHdyYXBwZWQgbGF5b3V0IHZpYSBhbmdsZSBicmFja2V0cyBhcHBsaWVzIC4uLmF0dHJpYnV0ZXMnKCkge1xuICAgIHRoaXMucmVnaXN0ZXJDb21wb25lbnQoJ0N1cmx5JywgJ0Zvb0JhcicsICdIZWxsbyB3b3JsZCEnKTtcblxuICAgIHRoaXMucmVuZGVyKGA8Rm9vQmFyIGRhdGEtZm9vPVwiYmFyXCIgLz5gKTtcblxuICAgIHRoaXMuYXNzZXJ0Q29tcG9uZW50KCdIZWxsbyB3b3JsZCEnLCB7ICdkYXRhLWZvbyc6ICdiYXInIH0pO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlUmVyZW5kZXIoKTtcbiAgfVxuXG4gIEB0ZXN0KHsga2luZDogJ2N1cmx5JyB9KVxuICAnaW52b2tpbmcgd3JhcHBlZCBsYXlvdXQgdmlhIGFuZ2xlIGJyYWNrZXRzIC0gaW52b2NhdGlvbiBhdHRyaWJ1dGVzIGNsb2JiZXIgaW50ZXJuYWwgYXR0cmlidXRlcycoKSB7XG4gICAgY2xhc3MgRm9vQmFyIGV4dGVuZHMgRW1iZXJpc2hDdXJseUNvbXBvbmVudCB7XG4gICAgICBbaW5kZXg6IHN0cmluZ106IHVua25vd247XG5cbiAgICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICBzdXBlcigpO1xuICAgICAgICB0aGlzLmF0dHJpYnV0ZUJpbmRpbmdzID0gWydkYXRhLWZvbyddO1xuICAgICAgICB0aGlzWydkYXRhLWZvbyddID0gJ2lubmVyJztcbiAgICAgIH1cbiAgICB9XG4gICAgdGhpcy5yZWdpc3RlckNvbXBvbmVudCgnQ3VybHknLCAnRm9vQmFyJywgJ0hlbGxvIHdvcmxkIScsIEZvb0Jhcik7XG5cbiAgICB0aGlzLnJlbmRlcihgPEZvb0JhciBkYXRhLWZvbz1cIm91dGVyXCIgLz5gKTtcblxuICAgIHRoaXMuYXNzZXJ0Q29tcG9uZW50KCdIZWxsbyB3b3JsZCEnLCB7ICdkYXRhLWZvbyc6ICdvdXRlcicgfSk7XG4gICAgdGhpcy5hc3NlcnRTdGFibGVSZXJlbmRlcigpO1xuICB9XG5cbiAgQHRlc3QoeyBraW5kOiAnY3VybHknIH0pXG4gICdpbnZva2luZyB3cmFwcGVkIGxheW91dCB2aWEgYW5nbGUgYnJhY2tldHMgLSBpbnZvY2F0aW9uIGF0dHJpYnV0ZXMgbWVyZ2VzIGNsYXNzZXMnKCkge1xuICAgIGNsYXNzIEZvb0JhciBleHRlbmRzIEVtYmVyaXNoQ3VybHlDb21wb25lbnQge1xuICAgICAgW2luZGV4OiBzdHJpbmddOiB1bmtub3duO1xuXG4gICAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgc3VwZXIoKTtcbiAgICAgICAgdGhpcy5hdHRyaWJ1dGVCaW5kaW5ncyA9IFsnY2xhc3MnXTtcbiAgICAgICAgdGhpc1snY2xhc3MnXSA9ICdpbm5lcic7XG4gICAgICB9XG4gICAgfVxuICAgIHRoaXMucmVnaXN0ZXJDb21wb25lbnQoJ0N1cmx5JywgJ0Zvb0JhcicsICdIZWxsbyB3b3JsZCEnLCBGb29CYXIpO1xuXG4gICAgdGhpcy5yZW5kZXIoYDxGb29CYXIgY2xhc3M9XCJvdXRlclwiIC8+YCk7XG5cbiAgICB0aGlzLmFzc2VydENvbXBvbmVudCgnSGVsbG8gd29ybGQhJywgeyBjbGFzczogY2xhc3NlcygnZW1iZXItdmlldyBpbm5lciBvdXRlcicpIH0pO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlUmVyZW5kZXIoKTtcbiAgfVxuXG4gIEB0ZXN0KHsga2luZDogJ2N1cmx5JyB9KVxuICAnaW52b2tpbmcgd3JhcHBlZCBsYXlvdXQgdmlhIGFuZ2xlIGJyYWNrZXRzIGFsc28gYXBwbGllcyBleHBsaWNpdCAuLi5hdHRyaWJ1dGVzJygpIHtcbiAgICB0aGlzLnJlZ2lzdGVyQ29tcG9uZW50KCdDdXJseScsICdGb29CYXInLCAnPGgxIC4uLmF0dHJpYnV0ZXM+SGVsbG8gd29ybGQhPC9oMT4nKTtcblxuICAgIHRoaXMucmVuZGVyKGA8Rm9vQmFyIGRhdGEtZm9vPVwiYmFyXCIgLz5gKTtcblxuICAgIGxldCB3cmFwcGVyRWxlbWVudCA9IGFzc2VydEVsZW1lbnQodGhpcy5lbGVtZW50LmZpcnN0Q2hpbGQpO1xuICAgIGFzc2VydEVtYmVyaXNoRWxlbWVudCh3cmFwcGVyRWxlbWVudCwgJ2RpdicsIHsgJ2RhdGEtZm9vJzogJ2JhcicgfSk7XG4gICAgZXF1YWxUb2tlbnModG9Jbm5lckhUTUwod3JhcHBlckVsZW1lbnQpLCAnPGgxIGRhdGEtZm9vPVwiYmFyXCI+SGVsbG8gd29ybGQhPC9oMT4nKTtcblxuICAgIHRoaXMuYXNzZXJ0U3RhYmxlUmVyZW5kZXIoKTtcbiAgfVxufVxuIl19