var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { RenderTest } from '../render-test';
import { setProperty as set } from '@glimmer/object-reference';
import { test } from '../test-decorator';
import { equalsElement } from '../dom/assertions';
import { stripTight } from '../test-helpers/strings';
import { replaceHTML } from '../dom/simple-utils';
import { EmberishCurlyComponent } from '../components/emberish-curly';
export class InElementSuite extends RenderTest {
    'Renders curlies into external element'() {
        let externalElement = this.delegate.createElement('div');
        this.render('{{#in-element externalElement}}[{{foo}}]{{/in-element}}', {
            externalElement,
            foo: 'Yippie!',
        });
        equalsElement(externalElement, 'div', {}, '[Yippie!]');
        this.assertStableRerender();
        this.rerender({ foo: 'Double Yups!' });
        equalsElement(externalElement, 'div', {}, '[Double Yups!]');
        this.assertStableNodes();
        this.rerender({ foo: 'Yippie!' });
        equalsElement(externalElement, 'div', {}, '[Yippie!]');
        this.assertStableNodes();
    }
    'Changing to falsey'() {
        let first = this.delegate.createElement('div');
        let second = this.delegate.createElement('div');
        this.render(stripTight `
        |{{foo}}|
        {{#in-element first}}[1{{foo}}]{{/in-element}}
        {{#in-element second}}[2{{foo}}]{{/in-element}}
      `, { first, second: null, foo: 'Yippie!' });
        equalsElement(first, 'div', {}, '[1Yippie!]');
        equalsElement(second, 'div', {}, '');
        this.assertHTML('|Yippie!|<!----><!---->');
        this.assertStableRerender();
        this.rerender({ foo: 'Double Yips!' });
        equalsElement(first, 'div', {}, '[1Double Yips!]');
        equalsElement(second, 'div', {}, '');
        this.assertHTML('|Double Yips!|<!----><!---->');
        this.assertStableNodes();
        this.rerender({ first: null });
        equalsElement(first, 'div', {}, '');
        equalsElement(second, 'div', {}, '');
        this.assertHTML('|Double Yips!|<!----><!---->');
        this.assertStableRerender();
        this.rerender({ second });
        equalsElement(first, 'div', {}, '');
        equalsElement(second, 'div', {}, '[2Double Yips!]');
        this.assertHTML('|Double Yips!|<!----><!---->');
        this.assertStableRerender();
        this.rerender({ first, second: null, foo: 'Yippie!' });
        equalsElement(first, 'div', {}, '[1Yippie!]');
        equalsElement(second, 'div', {}, '');
        this.assertHTML('|Yippie!|<!----><!---->');
        this.assertStableRerender();
    }
    'With pre-existing content'() {
        let externalElement = this.delegate.createElement('div');
        let initialContent = '<p>Hello there!</p>';
        replaceHTML(externalElement, initialContent);
        this.render(stripTight `{{#in-element externalElement}}[{{foo}}]{{/in-element}}`, {
            externalElement,
            foo: 'Yippie!',
        });
        equalsElement(externalElement, 'div', {}, `${initialContent}[Yippie!]`);
        this.assertHTML('<!---->');
        this.assertStableRerender();
        this.rerender({ foo: 'Double Yips!' });
        equalsElement(externalElement, 'div', {}, `${initialContent}[Double Yips!]`);
        this.assertHTML('<!---->');
        this.assertStableNodes();
        this.rerender({ externalElement: null });
        equalsElement(externalElement, 'div', {}, `${initialContent}`);
        this.assertHTML('<!---->');
        this.assertStableRerender();
        this.rerender({ externalElement, foo: 'Yippie!' });
        equalsElement(externalElement, 'div', {}, `${initialContent}[Yippie!]`);
        this.assertHTML('<!---->');
        this.assertStableRerender();
    }
    'With nextSibling'() {
        let externalElement = this.delegate.createElement('div');
        replaceHTML(externalElement, '<b>Hello</b><em>there!</em>');
        this.render(stripTight `{{#in-element externalElement nextSibling=nextSibling}}[{{foo}}]{{/in-element}}`, { externalElement, nextSibling: externalElement.lastChild, foo: 'Yippie!' });
        equalsElement(externalElement, 'div', {}, '<b>Hello</b>[Yippie!]<em>there!</em>');
        this.assertHTML('<!---->');
        this.assertStableRerender();
        this.rerender({ foo: 'Double Yips!' });
        equalsElement(externalElement, 'div', {}, '<b>Hello</b>[Double Yips!]<em>there!</em>');
        this.assertHTML('<!---->');
        this.assertStableNodes();
        this.rerender({ nextSibling: null });
        equalsElement(externalElement, 'div', {}, '<b>Hello</b><em>there!</em>[Double Yips!]');
        this.assertHTML('<!---->');
        this.assertStableRerender();
        this.rerender({ externalElement: null });
        equalsElement(externalElement, 'div', {}, '<b>Hello</b><em>there!</em>');
        this.assertHTML('<!---->');
        this.assertStableRerender();
        this.rerender({ externalElement, nextSibling: externalElement.lastChild, foo: 'Yippie!' });
        equalsElement(externalElement, 'div', {}, '<b>Hello</b>[Yippie!]<em>there!</em>');
        this.assertHTML('<!---->');
        this.assertStableRerender();
    }
    'Updating remote element'() {
        let first = this.delegate.createElement('div');
        let second = this.delegate.createElement('div');
        this.render(stripTight `{{#in-element externalElement}}[{{foo}}]{{/in-element}}`, {
            externalElement: first,
            foo: 'Yippie!',
        });
        equalsElement(first, 'div', {}, '[Yippie!]');
        equalsElement(second, 'div', {}, '');
        this.assertHTML('<!---->');
        this.assertStableRerender();
        this.rerender({ foo: 'Double Yips!' });
        equalsElement(first, 'div', {}, '[Double Yips!]');
        equalsElement(second, 'div', {}, '');
        this.assertHTML('<!---->');
        this.assertStableNodes();
        this.rerender({ foo: 'Yippie!' });
        equalsElement(first, 'div', {}, '[Yippie!]');
        equalsElement(second, 'div', {}, '');
        this.assertHTML('<!---->');
        this.assertStableNodes();
        this.rerender({ externalElement: second });
        equalsElement(first, 'div', {}, '');
        equalsElement(second, 'div', {}, '[Yippie!]');
        this.assertHTML('<!---->');
        this.assertStableRerender();
        this.rerender({ foo: 'Double Yips!' });
        equalsElement(first, 'div', {}, '');
        equalsElement(second, 'div', {}, '[Double Yips!]');
        this.assertHTML('<!---->');
        this.assertStableNodes();
        this.rerender({ foo: 'Yay!' });
        equalsElement(first, 'div', {}, '');
        equalsElement(second, 'div', {}, '[Yay!]');
        this.assertHTML('<!---->');
        this.assertStableNodes();
        this.rerender({ externalElement: first, foo: 'Yippie!' });
        equalsElement(first, 'div', {}, '[Yippie!]');
        equalsElement(second, 'div', {}, '');
        this.assertHTML('<!---->');
        this.assertStableRerender();
    }
    "Inside an '{{if}}'"() {
        let first = { element: this.delegate.createElement('div'), description: 'first' };
        let second = { element: this.delegate.createElement('div'), description: 'second' };
        this.render(stripTight `
        {{#if showFirst}}
          {{#in-element first}}[{{foo}}]{{/in-element}}
        {{/if}}
        {{#if showSecond}}
          {{#in-element second}}[{{foo}}]{{/in-element}}
        {{/if}}
      `, {
            first: first.element,
            second: second.element,
            showFirst: true,
            showSecond: false,
            foo: 'Yippie!',
        });
        equalsElement(first, 'div', {}, '[Yippie!]');
        equalsElement(second, 'div', {}, '');
        this.assertHTML('<!----><!---->');
        this.assertStableRerender();
        this.rerender({ showFirst: false });
        equalsElement(first, 'div', {}, '');
        equalsElement(second, 'div', {}, '');
        this.assertHTML('<!----><!---->');
        this.assertStableRerender();
        this.rerender({ showSecond: true });
        equalsElement(first, 'div', {}, '');
        equalsElement(second, 'div', {}, '[Yippie!]');
        this.assertHTML('<!----><!---->');
        this.assertStableRerender();
        this.rerender({ foo: 'Double Yips!' });
        equalsElement(first, 'div', {}, '');
        equalsElement(second, 'div', {}, '[Double Yips!]');
        this.assertHTML('<!----><!---->');
        this.assertStableRerender();
        this.rerender({ showSecond: false });
        equalsElement(first, 'div', {}, '');
        equalsElement(second, 'div', {}, '');
        this.assertHTML('<!----><!---->');
        this.assertStableRerender();
        this.rerender({ showFirst: true });
        equalsElement(first, 'div', {}, '[Double Yips!]');
        equalsElement(second, 'div', {}, '');
        this.assertHTML('<!----><!---->');
        this.assertStableRerender();
        this.rerender({ foo: 'Yippie!' });
        equalsElement(first, 'div', {}, '[Yippie!]');
        equalsElement(second, 'div', {}, '');
        this.assertHTML('<!----><!---->');
        this.assertStableRerender();
    }
    Multiple() {
        let firstElement = this.delegate.createElement('div');
        let secondElement = this.delegate.createElement('div');
        this.render(stripTight `
        {{#in-element firstElement}}
          [{{foo}}]
        {{/in-element}}
        {{#in-element secondElement}}
          [{{bar}}]
        {{/in-element}}
        `, {
            firstElement,
            secondElement,
            foo: 'Hello!',
            bar: 'World!',
        });
        equalsElement(firstElement, 'div', {}, stripTight `[Hello!]`);
        equalsElement(secondElement, 'div', {}, stripTight `[World!]`);
        this.assertHTML('<!----><!---->');
        this.assertStableRerender();
        this.rerender({ foo: 'GoodBye!' });
        equalsElement(firstElement, 'div', {}, stripTight `[GoodBye!]`);
        equalsElement(secondElement, 'div', {}, stripTight `[World!]`);
        this.assertHTML('<!----><!---->');
        this.assertStableRerender();
        this.rerender({ bar: 'Folks!' });
        equalsElement(firstElement, 'div', {}, stripTight `[GoodBye!]`);
        equalsElement(secondElement, 'div', {}, stripTight `[Folks!]`);
        this.assertHTML('<!----><!---->');
        this.assertStableRerender();
        this.rerender({ foo: 'Hello!', bar: 'World!' });
        equalsElement(firstElement, 'div', {}, stripTight `[Hello!]`);
        equalsElement(secondElement, 'div', {}, stripTight `[World!]`);
        this.assertHTML('<!----><!---->');
        this.assertStableRerender();
    }
    'Inside a loop'() {
        this.testType = 'Dynamic';
        this.registerComponent('Basic', 'FooBar', '<p>{{@value}}</p>');
        let roots = [
            { id: 0, element: this.delegate.createElement('div'), value: 'foo' },
            { id: 1, element: this.delegate.createElement('div'), value: 'bar' },
            { id: 2, element: this.delegate.createElement('div'), value: 'baz' },
        ];
        this.render(stripTight `
        {{~#each roots key="id" as |root|~}}
          {{~#in-element root.element ~}}
            {{component 'FooBar' value=root.value}}
          {{~/in-element~}}
        {{~/each}}
        `, {
            roots,
        });
        equalsElement(roots[0].element, 'div', {}, '<p>foo</p>');
        equalsElement(roots[1].element, 'div', {}, '<p>bar</p>');
        equalsElement(roots[2].element, 'div', {}, '<p>baz</p>');
        this.assertHTML('<!----><!----><!--->');
        this.assertStableRerender();
        set(roots[0], 'value', 'qux!');
        this.rerender();
        equalsElement(roots[0].element, 'div', {}, '<p>qux!</p>');
        equalsElement(roots[1].element, 'div', {}, '<p>bar</p>');
        equalsElement(roots[2].element, 'div', {}, '<p>baz</p>');
        this.assertHTML('<!----><!----><!--->');
        this.assertStableRerender();
        set(roots[1], 'value', 'derp');
        this.rerender();
        equalsElement(roots[0].element, 'div', {}, '<p>qux!</p>');
        equalsElement(roots[1].element, 'div', {}, '<p>derp</p>');
        equalsElement(roots[2].element, 'div', {}, '<p>baz</p>');
        this.assertHTML('<!----><!----><!--->');
        this.assertStableRerender();
        set(roots[0], 'value', 'foo');
        set(roots[1], 'value', 'bar');
        this.rerender();
        equalsElement(roots[0].element, 'div', {}, '<p>foo</p>');
        equalsElement(roots[1].element, 'div', {}, '<p>bar</p>');
        equalsElement(roots[2].element, 'div', {}, '<p>baz</p>');
        this.assertHTML('<!----><!----><!--->');
        this.assertStableRerender();
        this.testType = 'Basic';
    }
    Nesting() {
        let firstElement = this.delegate.createElement('div');
        let secondElement = this.delegate.createElement('div');
        this.render(stripTight `
        {{#in-element firstElement}}
          [{{foo}}]
          {{#in-element secondElement}}
            [{{bar}}]
          {{/in-element}}
        {{/in-element}}
        `, {
            firstElement,
            secondElement,
            foo: 'Hello!',
            bar: 'World!',
        });
        equalsElement(firstElement, 'div', {}, stripTight `[Hello!]<!---->`);
        equalsElement(secondElement, 'div', {}, stripTight `[World!]`);
        this.assertHTML('<!---->');
        this.assertStableRerender();
        this.rerender({ foo: 'GoodBye!' });
        equalsElement(firstElement, 'div', {}, stripTight `[GoodBye!]<!---->`);
        equalsElement(secondElement, 'div', {}, stripTight `[World!]`);
        this.assertHTML('<!---->');
        this.assertStableRerender();
        this.rerender({ bar: 'Folks!' });
        equalsElement(firstElement, 'div', {}, stripTight `[GoodBye!]<!---->`);
        equalsElement(secondElement, 'div', {}, stripTight `[Folks!]`);
        this.assertHTML('<!---->');
        this.assertStableRerender();
        this.rerender({ bar: 'World!' });
        equalsElement(firstElement, 'div', {}, stripTight `[GoodBye!]<!---->`);
        equalsElement(secondElement, 'div', {}, stripTight `[World!]`);
        this.assertHTML('<!---->');
        this.assertStableRerender();
        this.rerender({ foo: 'Hello!' });
        equalsElement(firstElement, 'div', {}, stripTight `[Hello!]<!---->`);
        equalsElement(secondElement, 'div', {}, stripTight `[World!]`);
        this.assertHTML('<!---->');
        this.assertStableRerender();
    }
    'Components are destroyed'() {
        let destroyed = 0;
        class DestroyMeComponent extends EmberishCurlyComponent {
            destroy() {
                super.destroy();
                destroyed++;
            }
        }
        this.registerComponent('Glimmer', 'DestroyMe', 'destroy me!', DestroyMeComponent);
        let externalElement = this.delegate.createElement('div');
        this.render(stripTight `
        {{#if showExternal}}
          {{#in-element externalElement}}[<DestroyMe />]{{/in-element}}
        {{/if}}
      `, {
            externalElement,
            showExternal: false,
        });
        equalsElement(externalElement, 'div', {}, stripTight ``);
        this.assert.equal(destroyed, 0, 'component was destroyed');
        this.assertHTML('<!---->');
        this.assertStableRerender();
        this.rerender({ showExternal: true });
        equalsElement(externalElement, 'div', {}, stripTight `[destroy me!]`);
        this.assert.equal(destroyed, 0, 'component was destroyed');
        this.assertHTML('<!---->');
        this.assertStableRerender();
        this.rerender({ showExternal: false });
        equalsElement(externalElement, 'div', {}, stripTight ``);
        this.assert.equal(destroyed, 1, 'component was destroyed');
        this.assertHTML('<!---->');
        this.assertStableRerender();
    }
}
InElementSuite.suiteName = '#in-element';
__decorate([
    test
], InElementSuite.prototype, "Renders curlies into external element", null);
__decorate([
    test
], InElementSuite.prototype, "Changing to falsey", null);
__decorate([
    test
], InElementSuite.prototype, "With pre-existing content", null);
__decorate([
    test
], InElementSuite.prototype, "With nextSibling", null);
__decorate([
    test
], InElementSuite.prototype, "Updating remote element", null);
__decorate([
    test
], InElementSuite.prototype, "Inside an '{{if}}'", null);
__decorate([
    test
], InElementSuite.prototype, "Multiple", null);
__decorate([
    test
], InElementSuite.prototype, "Inside a loop", null);
__decorate([
    test
], InElementSuite.prototype, "Nesting", null);
__decorate([
    test
], InElementSuite.prototype, "Components are destroyed", null);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW4tZWxlbWVudC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL2xpYi9zdWl0ZXMvaW4tZWxlbWVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sZ0JBQWdCLENBQUM7QUFDNUMsT0FBTyxFQUFFLFdBQVcsSUFBSSxHQUFHLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUMvRCxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFDekMsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBQ2xELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUNyRCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFDbEQsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFFdEUsTUFBTSxPQUFPLGNBQWUsU0FBUSxVQUFVO0lBSTVDLHVDQUF1QztRQUNyQyxJQUFJLGVBQWUsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN6RCxJQUFJLENBQUMsTUFBTSxDQUFDLHlEQUF5RCxFQUFFO1lBQ3JFLGVBQWU7WUFDZixHQUFHLEVBQUUsU0FBUztTQUNmLENBQUMsQ0FBQztRQUVILGFBQWEsQ0FBQyxlQUFlLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxXQUFXLENBQUMsQ0FBQztRQUN2RCxJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztRQUU1QixJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsR0FBRyxFQUFFLGNBQWMsRUFBRSxDQUFDLENBQUM7UUFDdkMsYUFBYSxDQUFDLGVBQWUsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLGdCQUFnQixDQUFDLENBQUM7UUFDNUQsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7UUFFekIsSUFBSSxDQUFD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QUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsU0FBUyxFQUFFLENBQUMsRUFBRSx5QkFBeUIsQ0FBQyxDQUFDO1FBQzNELElBQUksQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDM0IsSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUM7SUFDOUIsQ0FBQzs7QUE5Yk0sd0JBQVMsR0FBRyxhQUFhLENBQUM7QUFHakM7SUFEQyxJQUFJOzJFQWtCSjtBQUdEO0lBREMsSUFBSTt3REEwQ0o7QUFHRDtJQURDLElBQUk7K0RBNkJKO0FBR0Q7SUFEQyxJQUFJO3NEQWlDSjtBQUdEO0lBREMsSUFBSTs2REFrREo7QUFHRDtJQURDLElBQUk7d0RBK0RKO0FBR0Q7SUFEQyxJQUFJOzhDQTRDSjtBQUdEO0lBREMsSUFBSTttREF1REo7QUFHRDtJQURDLElBQUk7NkNBa0RKO0FBR0Q7SUFEQyxJQUFJOzhEQTBDSiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFJlbmRlclRlc3QgfSBmcm9tICcuLi9yZW5kZXItdGVzdCc7XG5pbXBvcnQgeyBzZXRQcm9wZXJ0eSBhcyBzZXQgfSBmcm9tICdAZ2xpbW1lci9vYmplY3QtcmVmZXJlbmNlJztcbmltcG9ydCB7IHRlc3QgfSBmcm9tICcuLi90ZXN0LWRlY29yYXRvcic7XG5pbXBvcnQgeyBlcXVhbHNFbGVtZW50IH0gZnJvbSAnLi4vZG9tL2Fzc2VydGlvbnMnO1xuaW1wb3J0IHsgc3RyaXBUaWdodCB9IGZyb20gJy4uL3Rlc3QtaGVscGVycy9zdHJpbmdzJztcbmltcG9ydCB7IHJlcGxhY2VIVE1MIH0gZnJvbSAnLi4vZG9tL3NpbXBsZS11dGlscyc7XG5pbXBvcnQgeyBFbWJlcmlzaEN1cmx5Q29tcG9uZW50IH0gZnJvbSAnLi4vY29tcG9uZW50cy9lbWJlcmlzaC1jdXJseSc7XG5cbmV4cG9ydCBjbGFzcyBJbkVsZW1lbnRTdWl0ZSBleHRlbmRzIFJlbmRlclRlc3Qge1xuICBzdGF0aWMgc3VpdGVOYW1lID0gJyNpbi1lbGVtZW50JztcblxuICBAdGVzdFxuICAnUmVuZGVycyBjdXJsaWVzIGludG8gZXh0ZXJuYWwgZWxlbWVudCcoKSB7XG4gICAgbGV0IGV4dGVybmFsRWxlbWVudCA9IHRoaXMuZGVsZWdhdGUuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgdGhpcy5yZW5kZXIoJ3t7I2luLWVsZW1lbnQgZXh0ZXJuYWxFbGVtZW50fX1be3tmb299fV17ey9pbi1lbGVtZW50fX0nLCB7XG4gICAgICBleHRlcm5hbEVsZW1lbnQsXG4gICAgICBmb286ICdZaXBwaWUhJyxcbiAgICB9KTtcblxuICAgIGVxdWFsc0VsZW1lbnQoZXh0ZXJuYWxFbGVtZW50LCAnZGl2Jywge30sICdbWWlwcGllIV0nKTtcbiAgICB0aGlzLmFzc2VydFN0YWJsZVJlcmVuZGVyKCk7XG5cbiAgICB0aGlzLnJlcmVuZGVyKHsgZm9vOiAnRG91YmxlIFl1cHMhJyB9KTtcbiAgICBlcXVhbHNFbGVtZW50KGV4dGVybmFsRWxlbWVudCwgJ2RpdicsIHt9LCAnW0RvdWJsZSBZdXBzIV0nKTtcbiAgICB0aGlzLmFzc2VydFN0YWJsZU5vZGVzKCk7XG5cbiAgICB0aGlzLnJlcmVuZGVyKHsgZm9vOiAnWWlwcGllIScgfSk7XG4gICAgZXF1YWxzRWxlbWVudChleHRlcm5hbEVsZW1lbnQsICdkaXYnLCB7fSwgJ1tZaXBwaWUhXScpO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlTm9kZXMoKTtcbiAgfVxuXG4gIEB0ZXN0XG4gICdDaGFuZ2luZyB0byBmYWxzZXknKCkge1xuICAgIGxldCBmaXJzdCA9IHRoaXMuZGVsZWdhdGUuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgbGV0IHNlY29uZCA9IHRoaXMuZGVsZWdhdGUuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG5cbiAgICB0aGlzLnJlbmRlcihcbiAgICAgIHN0cmlwVGlnaHRgXG4gICAgICAgIHx7e2Zvb319fFxuICAgICAgICB7eyNpbi1lbGVtZW50IGZpcnN0fX1bMXt7Zm9vfX1de3svaW4tZWxlbWVudH19XG4gICAgICAgIHt7I2luLWVsZW1lbnQgc2Vjb25kfX1bMnt7Zm9vfX1de3svaW4tZWxlbWVudH19XG4gICAgICBgLFxuICAgICAgeyBmaXJzdCwgc2Vjb25kOiBudWxsLCBmb286ICdZaXBwaWUhJyB9XG4gICAgKTtcblxuICAgIGVxdWFsc0VsZW1lbnQoZmlyc3QsICdkaXYnLCB7fSwgJ1sxWWlwcGllIV0nKTtcbiAgICBlcXVhbHNFbGVtZW50KHNlY29uZCwgJ2RpdicsIHt9LCAnJyk7XG4gICAgdGhpcy5hc3NlcnRIVE1MKCd8WWlwcGllIXw8IS0tLS0+PCEtLS0tPicpO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlUmVyZW5kZXIoKTtcblxuICAgIHRoaXMucmVyZW5kZXIoeyBmb286ICdEb3VibGUgWWlwcyEnIH0pO1xuICAgIGVxdWFsc0VsZW1lbnQoZmlyc3QsICdkaXYnLCB7fSwgJ1sxRG91YmxlIFlpcHMhXScpO1xuICAgIGVxdWFsc0VsZW1lbnQoc2Vjb25kLCAnZGl2Jywge30sICcnKTtcbiAgICB0aGlzLmFzc2VydEhUTUwoJ3xEb3VibGUgWWlwcyF8PCEtLS0tPjwhLS0tLT4nKTtcbiAgICB0aGlzLmFzc2VydFN0YWJsZU5vZGVzKCk7XG5cbiAgICB0aGlzLnJlcmVuZGVyKHsgZmlyc3Q6IG51bGwgfSk7XG4gICAgZXF1YWxzRWxlbWVudChmaXJzdCwgJ2RpdicsIHt9LCAnJyk7XG4gICAgZXF1YWxzRWxlbWVudChzZWNvbmQsICdkaXYnLCB7fSwgJycpO1xuICAgIHRoaXMuYXNzZXJ0SFRNTCgnfERvdWJsZSBZaXBzIXw8IS0tLS0+PCEtLS0tPicpO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlUmVyZW5kZXIoKTtcblxuICAgIHRoaXMucmVyZW5kZXIoeyBzZWNvbmQgfSk7XG4gICAgZXF1YWxzRWxlbWVudChmaXJzdCwgJ2RpdicsIHt9LCAnJyk7XG4gICAgZXF1YWxzRWxlbWVudChzZWNvbmQsICdkaXYnLCB7fSwgJ1syRG91YmxlIFlpcHMhXScpO1xuICAgIHRoaXMuYXNzZXJ0SFRNTCgnfERvdWJsZSBZaXBzIXw8IS0tLS0+PCEtLS0tPicpO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlUmVyZW5kZXIoKTtcblxuICAgIHRoaXMucmVyZW5kZXIoeyBmaXJzdCwgc2Vjb25kOiBudWxsLCBmb286ICdZaXBwaWUhJyB9KTtcbiAgICBlcXVhbHNFbGVtZW50KGZpcnN0LCAnZGl2Jywge30sICdbMVlpcHBpZSFdJyk7XG4gICAgZXF1YWxzRWxlbWVudChzZWNvbmQsICdkaXYnLCB7fSwgJycpO1xuICAgIHRoaXMuYXNzZXJ0SFRNTCgnfFlpcHBpZSF8PCEtLS0tPjwhLS0tLT4nKTtcbiAgICB0aGlzLmFzc2VydFN0YWJsZVJlcmVuZGVyKCk7XG4gIH1cblxuICBAdGVzdFxuICAnV2l0aCBwcmUtZXhpc3RpbmcgY29udGVudCcoKSB7XG4gICAgbGV0IGV4dGVybmFsRWxlbWVudCA9IHRoaXMuZGVsZWdhdGUuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgbGV0IGluaXRpYWxDb250ZW50ID0gJzxwPkhlbGxvIHRoZXJlITwvcD4nO1xuICAgIHJlcGxhY2VIVE1MKGV4dGVybmFsRWxlbWVudCwgaW5pdGlhbENvbnRlbnQpO1xuXG4gICAgdGhpcy5yZW5kZXIoc3RyaXBUaWdodGB7eyNpbi1lbGVtZW50IGV4dGVybmFsRWxlbWVudH19W3t7Zm9vfX1de3svaW4tZWxlbWVudH19YCwge1xuICAgICAgZXh0ZXJuYWxFbGVtZW50LFxuICAgICAgZm9vOiAnWWlwcGllIScsXG4gICAgfSk7XG5cbiAgICBlcXVhbHNFbGVtZW50KGV4dGVybmFsRWxlbWVudCwgJ2RpdicsIHt9LCBgJHtpbml0aWFsQ29udGVudH1bWWlwcGllIV1gKTtcbiAgICB0aGlzLmFzc2VydEhUTUwoJzwhLS0tLT4nKTtcbiAgICB0aGlzLmFzc2VydFN0YWJsZVJlcmVuZGVyKCk7XG5cbiAgICB0aGlzLnJlcmVuZGVyKHsgZm9vOiAnRG91YmxlIFlpcHMhJyB9KTtcbiAgICBlcXVhbHNFbGVtZW50KGV4dGVybmFsRWxlbWVudCwgJ2RpdicsIHt9LCBgJHtpbml0aWFsQ29udGVudH1bRG91YmxlIFlpcHMhXWApO1xuICAgIHRoaXMuYXNzZXJ0SFRNTCgnPCEtLS0tPicpO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlTm9kZXMoKTtcblxuICAgIHRoaXMucmVyZW5kZXIoeyBleHRlcm5hbEVsZW1lbnQ6IG51bGwgfSk7XG4gICAgZXF1YWxzRWxlbWVudChleHRlcm5hbEVsZW1lbnQsICdkaXYnLCB7fSwgYCR7aW5pdGlhbENvbnRlbnR9YCk7XG4gICAgdGhpcy5hc3NlcnRIVE1MKCc8IS0tLS0+Jyk7XG4gICAgdGhpcy5hc3NlcnRTdGFibGVSZXJlbmRlcigpO1xuXG4gICAgdGhpcy5yZXJlbmRlcih7IGV4dGVybmFsRWxlbWVudCwgZm9vOiAnWWlwcGllIScgfSk7XG4gICAgZXF1YWxzRWxlbWVudChleHRlcm5hbEVsZW1lbnQsICdkaXYnLCB7fSwgYCR7aW5pdGlhbENvbnRlbnR9W1lpcHBpZSFdYCk7XG4gICAgdGhpcy5hc3NlcnRIVE1MKCc8IS0tLS0+Jyk7XG4gICAgdGhpcy5hc3NlcnRTdGFibGVSZXJlbmRlcigpO1xuICB9XG5cbiAgQHRlc3RcbiAgJ1dpdGggbmV4dFNpYmxpbmcnKCkge1xuICAgIGxldCBleHRlcm5hbEVsZW1lbnQgPSB0aGlzLmRlbGVnYXRlLmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgIHJlcGxhY2VIVE1MKGV4dGVybmFsRWxlbWVudCwgJzxiPkhlbGxvPC9iPjxlbT50aGVyZSE8L2VtPicpO1xuXG4gICAgdGhpcy5yZW5kZXIoXG4gICAgICBzdHJpcFRpZ2h0YHt7I2luLWVsZW1lbnQgZXh0ZXJuYWxFbGVtZW50IG5leHRTaWJsaW5nPW5leHRTaWJsaW5nfX1be3tmb299fV17ey9pbi1lbGVtZW50fX1gLFxuICAgICAgeyBleHRlcm5hbEVsZW1lbnQsIG5leHRTaWJsaW5nOiBleHRlcm5hbEVsZW1lbnQubGFzdENoaWxkLCBmb286ICdZaXBwaWUhJyB9XG4gICAgKTtcblxuICAgIGVxdWFsc0VsZW1lbnQoZXh0ZXJuYWxFbGVtZW50LCAnZGl2Jywge30sICc8Yj5IZWxsbzwvYj5bWWlwcGllIV08ZW0+dGhlcmUhPC9lbT4nKTtcbiAgICB0aGlzLmFzc2VydEhUTUwoJzwhLS0tLT4nKTtcbiAgICB0aGlzLmFzc2VydFN0YWJsZVJlcmVuZGVyKCk7XG5cbiAgICB0aGlzLnJlcmVuZGVyKHsgZm9vOiAnRG91YmxlIFlpcHMhJyB9KTtcbiAgICBlcXVhbHNFbGVtZW50KGV4dGVybmFsRWxlbWVudCwgJ2RpdicsIHt9LCAnPGI+SGVsbG88L2I+W0RvdWJsZSBZaXBzIV08ZW0+dGhlcmUhPC9lbT4nKTtcbiAgICB0aGlzLmFzc2VydEhUTUwoJzwhLS0tLT4nKTtcbiAgICB0aGlzLmFzc2VydFN0YWJsZU5vZGVzKCk7XG5cbiAgICB0aGlzLnJlcmVuZGVyKHsgbmV4dFNpYmxpbmc6IG51bGwgfSk7XG4gICAgZXF1YWxzRWxlbWVudChleHRlcm5hbEVsZW1lbnQsICdkaXYnLCB7fSwgJzxiPkhlbGxvPC9iPjxlbT50aGVyZSE8L2VtPltEb3VibGUgWWlwcyFdJyk7XG4gICAgdGhpcy5hc3NlcnRIVE1MKCc8IS0tLS0+Jyk7XG4gICAgdGhpcy5hc3NlcnRTdGFibGVSZXJlbmRlcigpO1xuXG4gICAgdGhpcy5yZXJlbmRlcih7IGV4dGVybmFsRWxlbWVudDogbnVsbCB9KTtcbiAgICBlcXVhbHNFbGVtZW50KGV4dGVybmFsRWxlbWVudCwgJ2RpdicsIHt9LCAnPGI+SGVsbG88L2I+PGVtPnRoZXJlITwvZW0+Jyk7XG4gICAgdGhpcy5hc3NlcnRIVE1MKCc8IS0tLS0+Jyk7XG4gICAgdGhpcy5hc3NlcnRTdGFibGVSZXJlbmRlcigpO1xuXG4gICAgdGhpcy5yZXJlbmRlcih7IGV4dGVybmFsRWxlbWVudCwgbmV4dFNpYmxpbmc6IGV4dGVybmFsRWxlbWVudC5sYXN0Q2hpbGQsIGZvbzogJ1lpcHBpZSEnIH0pO1xuICAgIGVxdWFsc0VsZW1lbnQoZXh0ZXJuYWxFbGVtZW50LCAnZGl2Jywge30sICc8Yj5IZWxsbzwvYj5bWWlwcGllIV08ZW0+dGhlcmUhPC9lbT4nKTtcbiAgICB0aGlzLmFzc2VydEhUTUwoJzwhLS0tLT4nKTtcbiAgICB0aGlzLmFzc2VydFN0YWJsZVJlcmVuZGVyKCk7XG4gIH1cblxuICBAdGVzdFxuICAnVXBkYXRpbmcgcmVtb3RlIGVsZW1lbnQnKCkge1xuICAgIGxldCBmaXJzdCA9IHRoaXMuZGVsZWdhdGUuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgbGV0IHNlY29uZCA9IHRoaXMuZGVsZWdhdGUuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG5cbiAgICB0aGlzLnJlbmRlcihzdHJpcFRpZ2h0YHt7I2luLWVsZW1lbnQgZXh0ZXJuYWxFbGVtZW50fX1be3tmb299fV17ey9pbi1lbGVtZW50fX1gLCB7XG4gICAgICBleHRlcm5hbEVsZW1lbnQ6IGZpcnN0LFxuICAgICAgZm9vOiAnWWlwcGllIScsXG4gICAgfSk7XG5cbiAgICBlcXVhbHNFbGVtZW50KGZpcnN0LCAnZGl2Jywge30sICdbWWlwcGllIV0nKTtcbiAgICBlcXVhbHNFbGVtZW50KHNlY29uZCwgJ2RpdicsIHt9LCAnJyk7XG4gICAgdGhpcy5hc3NlcnRIVE1MKCc8IS0tLS0+Jyk7XG4gICAgdGhpcy5hc3NlcnRTdGFibGVSZXJlbmRlcigpO1xuXG4gICAgdGhpcy5yZXJlbmRlcih7IGZvbzogJ0RvdWJsZSBZaXBzIScgfSk7XG4gICAgZXF1YWxzRWxlbWVudChmaXJzdCwgJ2RpdicsIHt9LCAnW0RvdWJsZSBZaXBzIV0nKTtcbiAgICBlcXVhbHNFbGVtZW50KHNlY29uZCwgJ2RpdicsIHt9LCAnJyk7XG4gICAgdGhpcy5hc3NlcnRIVE1MKCc8IS0tLS0+Jyk7XG4gICAgdGhpcy5hc3NlcnRTdGFibGVOb2RlcygpO1xuXG4gICAgdGhpcy5yZXJlbmRlcih7IGZvbzogJ1lpcHBpZSEnIH0pO1xuICAgIGVxdWFsc0VsZW1lbnQoZmlyc3QsICdkaXYnLCB7fSwgJ1tZaXBwaWUhXScpO1xuICAgIGVxdWFsc0VsZW1lbnQoc2Vjb25kLCAnZGl2Jywge30sICcnKTtcbiAgICB0aGlzLmFzc2VydEhUTUwoJzwhLS0tLT4nKTtcbiAgICB0aGlzLmFzc2VydFN0YWJsZU5vZGVzKCk7XG5cbiAgICB0aGlzLnJlcmVuZGVyKHsgZXh0ZXJuYWxFbGVtZW50OiBzZWNvbmQgfSk7XG4gICAgZXF1YWxzRWxlbWVudChmaXJzdCwgJ2RpdicsIHt9LCAnJyk7XG4gICAgZXF1YWxzRWxlbWVudChzZWNvbmQsICdkaXYnLCB7fSwgJ1tZaXBwaWUhXScpO1xuICAgIHRoaXMuYXNzZXJ0SFRNTCgnPCEtLS0tPicpO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlUmVyZW5kZXIoKTtcblxuICAgIHRoaXMucmVyZW5kZXIoeyBmb286ICdEb3VibGUgWWlwcyEnIH0pO1xuICAgIGVxdWFsc0VsZW1lbnQoZmlyc3QsICdkaXYnLCB7fSwgJycpO1xuICAgIGVxdWFsc0VsZW1lbnQoc2Vjb25kLCAnZGl2Jywge30sICdbRG91YmxlIFlpcHMhXScpO1xuICAgIHRoaXMuYXNzZXJ0SFRNTCgnPCEtLS0tPicpO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlTm9kZXMoKTtcblxuICAgIHRoaXMucmVyZW5kZXIoeyBmb286ICdZYXkhJyB9KTtcbiAgICBlcXVhbHNFbGVtZW50KGZpcnN0LCAnZGl2Jywge30sICcnKTtcbiAgICBlcXVhbHNFbGVtZW50KHNlY29uZCwgJ2RpdicsIHt9LCAnW1lheSFdJyk7XG4gICAgdGhpcy5hc3NlcnRIVE1MKCc8IS0tLS0+Jyk7XG4gICAgdGhpcy5hc3NlcnRTdGFibGVOb2RlcygpO1xuXG4gICAgdGhpcy5yZXJlbmRlcih7IGV4dGVybmFsRWxlbWVudDogZmlyc3QsIGZvbzogJ1lpcHBpZSEnIH0pO1xuICAgIGVxdWFsc0VsZW1lbnQoZmlyc3QsICdkaXYnLCB7fSwgJ1tZaXBwaWUhXScpO1xuICAgIGVxdWFsc0VsZW1lbnQoc2Vjb25kLCAnZGl2Jywge30sICcnKTtcbiAgICB0aGlzLmFzc2VydEhUTUwoJzwhLS0tLT4nKTtcbiAgICB0aGlzLmFzc2VydFN0YWJsZVJlcmVuZGVyKCk7XG4gIH1cblxuICBAdGVzdFxuICBcIkluc2lkZSBhbiAne3tpZn19J1wiKCkge1xuICAgIGxldCBmaXJzdCA9IHsgZWxlbWVudDogdGhpcy5kZWxlZ2F0ZS5jcmVhdGVFbGVtZW50KCdkaXYnKSwgZGVzY3JpcHRpb246ICdmaXJzdCcgfTtcbiAgICBsZXQgc2Vjb25kID0geyBlbGVtZW50OiB0aGlzLmRlbGVnYXRlLmNyZWF0ZUVsZW1lbnQoJ2RpdicpLCBkZXNjcmlwdGlvbjogJ3NlY29uZCcgfTtcblxuICAgIHRoaXMucmVuZGVyKFxuICAgICAgc3RyaXBUaWdodGBcbiAgICAgICAge3sjaWYgc2hvd0ZpcnN0fX1cbiAgICAgICAgICB7eyNpbi1lbGVtZW50IGZpcnN0fX1be3tmb299fV17ey9pbi1lbGVtZW50fX1cbiAgICAgICAge3svaWZ9fVxuICAgICAgICB7eyNpZiBzaG93U2Vjb25kfX1cbiAgICAgICAgICB7eyNpbi1lbGVtZW50IHNlY29uZH19W3t7Zm9vfX1de3svaW4tZWxlbWVudH19XG4gICAgICAgIHt7L2lmfX1cbiAgICAgIGAsXG4gICAgICB7XG4gICAgICAgIGZpcnN0OiBmaXJzdC5lbGVtZW50LFxuICAgICAgICBzZWNvbmQ6IHNlY29uZC5lbGVtZW50LFxuICAgICAgICBzaG93Rmlyc3Q6IHRydWUsXG4gICAgICAgIHNob3dTZWNvbmQ6IGZhbHNlLFxuICAgICAgICBmb286ICdZaXBwaWUhJyxcbiAgICAgIH1cbiAgICApO1xuXG4gICAgZXF1YWxzRWxlbWVudChmaXJzdCwgJ2RpdicsIHt9LCAnW1lpcHBpZSFdJyk7XG4gICAgZXF1YWxzRWxlbWVudChzZWNvbmQsICdkaXYnLCB7fSwgJycpO1xuICAgIHRoaXMuYXNzZXJ0SFRNTCgnPCEtLS0tPjwhLS0tLT4nKTtcbiAgICB0aGlzLmFzc2VydFN0YWJsZVJlcmVuZGVyKCk7XG5cbiAgICB0aGlzLnJlcmVuZGVyKHsgc2hvd0ZpcnN0OiBmYWxzZSB9KTtcbiAgICBlcXVhbHNFbGVtZW50KGZpcnN0LCAnZGl2Jywge30sICcnKTtcbiAgICBlcXVhbHNFbGVtZW50KHNlY29uZCwgJ2RpdicsIHt9LCAnJyk7XG4gICAgdGhpcy5hc3NlcnRIVE1MKCc8IS0tLS0+PCEtLS0tPicpO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlUmVyZW5kZXIoKTtcblxuICAgIHRoaXMucmVyZW5kZXIoeyBzaG93U2Vjb25kOiB0cnVlIH0pO1xuICAgIGVxdWFsc0VsZW1lbnQoZmlyc3QsICdkaXYnLCB7fSwgJycpO1xuICAgIGVxdWFsc0VsZW1lbnQoc2Vjb25kLCAnZGl2Jywge30sICdbWWlwcGllIV0nKTtcbiAgICB0aGlzLmFzc2VydEhUTUwoJzwhLS0tLT48IS0tLS0+Jyk7XG4gICAgdGhpcy5hc3NlcnRTdGFibGVSZXJlbmRlcigpO1xuXG4gICAgdGhpcy5yZXJlbmRlcih7IGZvbzogJ0RvdWJsZSBZaXBzIScgfSk7XG4gICAgZXF1YWxzRWxlbWVudChmaXJzdCwgJ2RpdicsIHt9LCAnJyk7XG4gICAgZXF1YWxzRWxlbWVudChzZWNvbmQsICdkaXYnLCB7fSwgJ1tEb3VibGUgWWlwcyFdJyk7XG4gICAgdGhpcy5hc3NlcnRIVE1MKCc8IS0tLS0+PCEtLS0tPicpO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlUmVyZW5kZXIoKTtcblxuICAgIHRoaXMucmVyZW5kZXIoeyBzaG93U2Vjb25kOiBmYWxzZSB9KTtcbiAgICBlcXVhbHNFbGVtZW50KGZpcnN0LCAnZGl2Jywge30sICcnKTtcbiAgICBlcXVhbHNFbGVtZW50KHNlY29uZCwgJ2RpdicsIHt9LCAnJyk7XG4gICAgdGhpcy5hc3NlcnRIVE1MKCc8IS0tLS0+PCEtLS0tPicpO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlUmVyZW5kZXIoKTtcblxuICAgIHRoaXMucmVyZW5kZXIoeyBzaG93Rmlyc3Q6IHRydWUgfSk7XG4gICAgZXF1YWxzRWxlbWVudChmaXJzdCwgJ2RpdicsIHt9LCAnW0RvdWJsZSBZaXBzIV0nKTtcbiAgICBlcXVhbHNFbGVtZW50KHNlY29uZCwgJ2RpdicsIHt9LCAnJyk7XG4gICAgdGhpcy5hc3NlcnRIVE1MKCc8IS0tLS0+PCEtLS0tPicpO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlUmVyZW5kZXIoKTtcblxuICAgIHRoaXMucmVyZW5kZXIoeyBmb286ICdZaXBwaWUhJyB9KTtcbiAgICBlcXVhbHNFbGVtZW50KGZpcnN0LCAnZGl2Jywge30sICdbWWlwcGllIV0nKTtcbiAgICBlcXVhbHNFbGVtZW50KHNlY29uZCwgJ2RpdicsIHt9LCAnJyk7XG4gICAgdGhpcy5hc3NlcnRIVE1MKCc8IS0tLS0+PCEtLS0tPicpO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlUmVyZW5kZXIoKTtcbiAgfVxuXG4gIEB0ZXN0XG4gIE11bHRpcGxlKCkge1xuICAgIGxldCBmaXJzdEVsZW1lbnQgPSB0aGlzLmRlbGVnYXRlLmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgIGxldCBzZWNvbmRFbGVtZW50ID0gdGhpcy5kZWxlZ2F0ZS5jcmVhdGVFbGVtZW50KCdkaXYnKTtcblxuICAgIHRoaXMucmVuZGVyKFxuICAgICAgc3RyaXBUaWdodGBcbiAgICAgICAge3sjaW4tZWxlbWVudCBmaXJzdEVsZW1lbnR9fVxuICAgICAgICAgIFt7e2Zvb319XVxuICAgICAgICB7ey9pbi1lbGVtZW50fX1cbiAgICAgICAge3sjaW4tZWxlbWVudCBzZWNvbmRFbGVtZW50fX1cbiAgICAgICAgICBbe3tiYXJ9fV1cbiAgICAgICAge3svaW4tZWxlbWVudH19XG4gICAgICAgIGAsXG4gICAgICB7XG4gICAgICAgIGZpcnN0RWxlbWVudCxcbiAgICAgICAgc2Vjb25kRWxlbWVudCxcbiAgICAgICAgZm9vOiAnSGVsbG8hJyxcbiAgICAgICAgYmFyOiAnV29ybGQhJyxcbiAgICAgIH1cbiAgICApO1xuXG4gICAgZXF1YWxzRWxlbWVudChmaXJzdEVsZW1lbnQsICdkaXYnLCB7fSwgc3RyaXBUaWdodGBbSGVsbG8hXWApO1xuICAgIGVxdWFsc0VsZW1lbnQoc2Vjb25kRWxlbWVudCwgJ2RpdicsIHt9LCBzdHJpcFRpZ2h0YFtXb3JsZCFdYCk7XG4gICAgdGhpcy5hc3NlcnRIVE1MKCc8IS0tLS0+PCEtLS0tPicpO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlUmVyZW5kZXIoKTtcblxuICAgIHRoaXMucmVyZW5kZXIoeyBmb286ICdHb29kQnllIScgfSk7XG4gICAgZXF1YWxzRWxlbWVudChmaXJzdEVsZW1lbnQsICdkaXYnLCB7fSwgc3RyaXBUaWdodGBbR29vZEJ5ZSFdYCk7XG4gICAgZXF1YWxzRWxlbWVudChzZWNvbmRFbGVtZW50LCAnZGl2Jywge30sIHN0cmlwVGlnaHRgW1dvcmxkIV1gKTtcbiAgICB0aGlzLmFzc2VydEhUTUwoJzwhLS0tLT48IS0tLS0+Jyk7XG4gICAgdGhpcy5hc3NlcnRTdGFibGVSZXJlbmRlcigpO1xuXG4gICAgdGhpcy5yZXJlbmRlcih7IGJhcjogJ0ZvbGtzIScgfSk7XG4gICAgZXF1YWxzRWxlbWVudChmaXJzdEVsZW1lbnQsICdkaXYnLCB7fSwgc3RyaXBUaWdodGBbR29vZEJ5ZSFdYCk7XG4gICAgZXF1YWxzRWxlbWVudChzZWNvbmRFbGVtZW50LCAnZGl2Jywge30sIHN0cmlwVGlnaHRgW0ZvbGtzIV1gKTtcbiAgICB0aGlzLmFzc2VydEhUTUwoJzwhLS0tLT48IS0tLS0+Jyk7XG4gICAgdGhpcy5hc3NlcnRTdGFibGVSZXJlbmRlcigpO1xuXG4gICAgdGhpcy5yZXJlbmRlcih7IGZvbzogJ0hlbGxvIScsIGJhcjogJ1dvcmxkIScgfSk7XG4gICAgZXF1YWxzRWxlbWVudChmaXJzdEVsZW1lbnQsICdkaXYnLCB7fSwgc3RyaXBUaWdodGBbSGVsbG8hXWApO1xuICAgIGVxdWFsc0VsZW1lbnQoc2Vjb25kRWxlbWVudCwgJ2RpdicsIHt9LCBzdHJpcFRpZ2h0YFtXb3JsZCFdYCk7XG4gICAgdGhpcy5hc3NlcnRIVE1MKCc8IS0tLS0+PCEtLS0tPicpO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlUmVyZW5kZXIoKTtcbiAgfVxuXG4gIEB0ZXN0XG4gICdJbnNpZGUgYSBsb29wJygpIHtcbiAgICB0aGlzLnRlc3RUeXBlID0gJ0R5bmFtaWMnO1xuICAgIHRoaXMucmVnaXN0ZXJDb21wb25lbnQoJ0Jhc2ljJywgJ0Zvb0JhcicsICc8cD57e0B2YWx1ZX19PC9wPicpO1xuXG4gICAgbGV0IHJvb3RzID0gW1xuICAgICAgeyBpZDogMCwgZWxlbWVudDogdGhpcy5kZWxlZ2F0ZS5jcmVhdGVFbGVtZW50KCdkaXYnKSwgdmFsdWU6ICdmb28nIH0sXG4gICAgICB7IGlkOiAxLCBlbGVtZW50OiB0aGlzLmRlbGVnYXRlLmNyZWF0ZUVsZW1lbnQoJ2RpdicpLCB2YWx1ZTogJ2JhcicgfSxcbiAgICAgIHsgaWQ6IDIsIGVsZW1lbnQ6IHRoaXMuZGVsZWdhdGUuY3JlYXRlRWxlbWVudCgnZGl2JyksIHZhbHVlOiAnYmF6JyB9LFxuICAgIF07XG5cbiAgICB0aGlzLnJlbmRlcihcbiAgICAgIHN0cmlwVGlnaHRgXG4gICAgICAgIHt7fiNlYWNoIHJvb3RzIGtleT1cImlkXCIgYXMgfHJvb3R8fn19XG4gICAgICAgICAge3t+I2luLWVsZW1lbnQgcm9vdC5lbGVtZW50IH59fVxuICAgICAgICAgICAge3tjb21wb25lbnQgJ0Zvb0JhcicgdmFsdWU9cm9vdC52YWx1ZX19XG4gICAgICAgICAge3t+L2luLWVsZW1lbnR+fX1cbiAgICAgICAge3t+L2VhY2h9fVxuICAgICAgICBgLFxuICAgICAge1xuICAgICAgICByb290cyxcbiAgICAgIH1cbiAgICApO1xuXG4gICAgZXF1YWxzRWxlbWVudChyb290c1swXS5lbGVtZW50LCAnZGl2Jywge30sICc8cD5mb288L3A+Jyk7XG4gICAgZXF1YWxzRWxlbWVudChyb290c1sxXS5lbGVtZW50LCAnZGl2Jywge30sICc8cD5iYXI8L3A+Jyk7XG4gICAgZXF1YWxzRWxlbWVudChyb290c1syXS5lbGVtZW50LCAnZGl2Jywge30sICc8cD5iYXo8L3A+Jyk7XG4gICAgdGhpcy5hc3NlcnRIVE1MKCc8IS0tLS0+PCEtLS0tPjwhLS0tPicpO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlUmVyZW5kZXIoKTtcblxuICAgIHNldChyb290c1swXSwgJ3ZhbHVlJywgJ3F1eCEnKTtcbiAgICB0aGlzLnJlcmVuZGVyKCk7XG4gICAgZXF1YWxzRWxlbWVudChyb290c1swXS5lbGVtZW50LCAnZGl2Jywge30sICc8cD5xdXghPC9wPicpO1xuICAgIGVxdWFsc0VsZW1lbnQocm9vdHNbMV0uZWxlbWVudCwgJ2RpdicsIHt9LCAnPHA+YmFyPC9wPicpO1xuICAgIGVxdWFsc0VsZW1lbnQocm9vdHNbMl0uZWxlbWVudCwgJ2RpdicsIHt9LCAnPHA+YmF6PC9wPicpO1xuICAgIHRoaXMuYXNzZXJ0SFRNTCgnPCEtLS0tPjwhLS0tLT48IS0tLT4nKTtcbiAgICB0aGlzLmFzc2VydFN0YWJsZVJlcmVuZGVyKCk7XG5cbiAgICBzZXQocm9vdHNbMV0sICd2YWx1ZScsICdkZXJwJyk7XG4gICAgdGhpcy5yZXJlbmRlcigpO1xuICAgIGVxdWFsc0VsZW1lbnQocm9vdHNbMF0uZWxlbWVudCwgJ2RpdicsIHt9LCAnPHA+cXV4ITwvcD4nKTtcbiAgICBlcXVhbHNFbGVtZW50KHJvb3RzWzFdLmVsZW1lbnQsICdkaXYnLCB7fSwgJzxwPmRlcnA8L3A+Jyk7XG4gICAgZXF1YWxzRWxlbWVudChyb290c1syXS5lbGVtZW50LCAnZGl2Jywge30sICc8cD5iYXo8L3A+Jyk7XG4gICAgdGhpcy5hc3NlcnRIVE1MKCc8IS0tLS0+PCEtLS0tPjwhLS0tPicpO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlUmVyZW5kZXIoKTtcblxuICAgIHNldChyb290c1swXSwgJ3ZhbHVlJywgJ2ZvbycpO1xuICAgIHNldChyb290c1sxXSwgJ3ZhbHVlJywgJ2JhcicpO1xuICAgIHRoaXMucmVyZW5kZXIoKTtcbiAgICBlcXVhbHNFbGVtZW50KHJvb3RzWzBdLmVsZW1lbnQsICdkaXYnLCB7fSwgJzxwPmZvbzwvcD4nKTtcbiAgICBlcXVhbHNFbGVtZW50KHJvb3RzWzFdLmVsZW1lbnQsICdkaXYnLCB7fSwgJzxwPmJhcjwvcD4nKTtcbiAgICBlcXVhbHNFbGVtZW50KHJvb3RzWzJdLmVsZW1lbnQsICdkaXYnLCB7fSwgJzxwPmJhejwvcD4nKTtcbiAgICB0aGlzLmFzc2VydEhUTUwoJzwhLS0tLT48IS0tLS0+PCEtLS0+Jyk7XG4gICAgdGhpcy5hc3NlcnRTdGFibGVSZXJlbmRlcigpO1xuICAgIHRoaXMudGVzdFR5cGUgPSAnQmFzaWMnO1xuICB9XG5cbiAgQHRlc3RcbiAgTmVzdGluZygpIHtcbiAgICBsZXQgZmlyc3RFbGVtZW50ID0gdGhpcy5kZWxlZ2F0ZS5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICBsZXQgc2Vjb25kRWxlbWVudCA9IHRoaXMuZGVsZWdhdGUuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG5cbiAgICB0aGlzLnJlbmRlcihcbiAgICAgIHN0cmlwVGlnaHRgXG4gICAgICAgIHt7I2luLWVsZW1lbnQgZmlyc3RFbGVtZW50fX1cbiAgICAgICAgICBbe3tmb299fV1cbiAgICAgICAgICB7eyNpbi1lbGVtZW50IHNlY29uZEVsZW1lbnR9fVxuICAgICAgICAgICAgW3t7YmFyfX1dXG4gICAgICAgICAge3svaW4tZWxlbWVudH19XG4gICAgICAgIHt7L2luLWVsZW1lbnR9fVxuICAgICAgICBgLFxuICAgICAge1xuICAgICAgICBmaXJzdEVsZW1lbnQsXG4gICAgICAgIHNlY29uZEVsZW1lbnQsXG4gICAgICAgIGZvbzogJ0hlbGxvIScsXG4gICAgICAgIGJhcjogJ1dvcmxkIScsXG4gICAgICB9XG4gICAgKTtcblxuICAgIGVxdWFsc0VsZW1lbnQoZmlyc3RFbGVtZW50LCAnZGl2Jywge30sIHN0cmlwVGlnaHRgW0hlbGxvIV08IS0tLS0+YCk7XG4gICAgZXF1YWxzRWxlbWVudChzZWNvbmRFbGVtZW50LCAnZGl2Jywge30sIHN0cmlwVGlnaHRgW1dvcmxkIV1gKTtcbiAgICB0aGlzLmFzc2VydEhUTUwoJzwhLS0tLT4nKTtcbiAgICB0aGlzLmFzc2VydFN0YWJsZVJlcmVuZGVyKCk7XG5cbiAgICB0aGlzLnJlcmVuZGVyKHsgZm9vOiAnR29vZEJ5ZSEnIH0pO1xuICAgIGVxdWFsc0VsZW1lbnQoZmlyc3RFbGVtZW50LCAnZGl2Jywge30sIHN0cmlwVGlnaHRgW0dvb2RCeWUhXTwhLS0tLT5gKTtcbiAgICBlcXVhbHNFbGVtZW50KHNlY29uZEVsZW1lbnQsICdkaXYnLCB7fSwgc3RyaXBUaWdodGBbV29ybGQhXWApO1xuICAgIHRoaXMuYXNzZXJ0SFRNTCgnPCEtLS0tPicpO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlUmVyZW5kZXIoKTtcblxuICAgIHRoaXMucmVyZW5kZXIoeyBiYXI6ICdGb2xrcyEnIH0pO1xuICAgIGVxdWFsc0VsZW1lbnQoZmlyc3RFbGVtZW50LCAnZGl2Jywge30sIHN0cmlwVGlnaHRgW0dvb2RCeWUhXTwhLS0tLT5gKTtcbiAgICBlcXVhbHNFbGVtZW50KHNlY29uZEVsZW1lbnQsICdkaXYnLCB7fSwgc3RyaXBUaWdodGBbRm9sa3MhXWApO1xuICAgIHRoaXMuYXNzZXJ0SFRNTCgnPCEtLS0tPicpO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlUmVyZW5kZXIoKTtcblxuICAgIHRoaXMucmVyZW5kZXIoeyBiYXI6ICdXb3JsZCEnIH0pO1xuICAgIGVxdWFsc0VsZW1lbnQoZmlyc3RFbGVtZW50LCAnZGl2Jywge30sIHN0cmlwVGlnaHRgW0dvb2RCeWUhXTwhLS0tLT5gKTtcbiAgICBlcXVhbHNFbGVtZW50KHNlY29uZEVsZW1lbnQsICdkaXYnLCB7fSwgc3RyaXBUaWdodGBbV29ybGQhXWApO1xuICAgIHRoaXMuYXNzZXJ0SFRNTCgnPCEtLS0tPicpO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlUmVyZW5kZXIoKTtcblxuICAgIHRoaXMucmVyZW5kZXIoeyBmb286ICdIZWxsbyEnIH0pO1xuICAgIGVxdWFsc0VsZW1lbnQoZmlyc3RFbGVtZW50LCAnZGl2Jywge30sIHN0cmlwVGlnaHRgW0hlbGxvIV08IS0tLS0+YCk7XG4gICAgZXF1YWxzRWxlbWVudChzZWNvbmRFbGVtZW50LCAnZGl2Jywge30sIHN0cmlwVGlnaHRgW1dvcmxkIV1gKTtcbiAgICB0aGlzLmFzc2VydEhUTUwoJzwhLS0tLT4nKTtcbiAgICB0aGlzLmFzc2VydFN0YWJsZVJlcmVuZGVyKCk7XG4gIH1cblxuICBAdGVzdFxuICAnQ29tcG9uZW50cyBhcmUgZGVzdHJveWVkJygpIHtcbiAgICBsZXQgZGVzdHJveWVkID0gMDtcblxuICAgIGNsYXNzIERlc3Ryb3lNZUNvbXBvbmVudCBleHRlbmRzIEVtYmVyaXNoQ3VybHlDb21wb25lbnQge1xuICAgICAgZGVzdHJveSgpIHtcbiAgICAgICAgc3VwZXIuZGVzdHJveSgpO1xuICAgICAgICBkZXN0cm95ZWQrKztcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLnJlZ2lzdGVyQ29tcG9uZW50KCdHbGltbWVyJywgJ0Rlc3Ryb3lNZScsICdkZXN0cm95IG1lIScsIERlc3Ryb3lNZUNvbXBvbmVudCBhcyBhbnkpO1xuICAgIGxldCBleHRlcm5hbEVsZW1lbnQgPSB0aGlzLmRlbGVnYXRlLmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuXG4gICAgdGhpcy5yZW5kZXIoXG4gICAgICBzdHJpcFRpZ2h0YFxuICAgICAgICB7eyNpZiBzaG93RXh0ZXJuYWx9fVxuICAgICAgICAgIHt7I2luLWVsZW1lbnQgZXh0ZXJuYWxFbGVtZW50fX1bPERlc3Ryb3lNZSAvPl17ey9pbi1lbGVtZW50fX1cbiAgICAgICAge3svaWZ9fVxuICAgICAgYCxcbiAgICAgIHtcbiAgICAgICAgZXh0ZXJuYWxFbGVtZW50LFxuICAgICAgICBzaG93RXh0ZXJuYWw6IGZhbHNlLFxuICAgICAgfVxuICAgICk7XG5cbiAgICBlcXVhbHNFbGVtZW50KGV4dGVybmFsRWxlbWVudCwgJ2RpdicsIHt9LCBzdHJpcFRpZ2h0YGApO1xuICAgIHRoaXMuYXNzZXJ0LmVxdWFsKGRlc3Ryb3llZCwgMCwgJ2NvbXBvbmVudCB3YXMgZGVzdHJveWVkJyk7XG4gICAgdGhpcy5hc3NlcnRIVE1MKCc8IS0tLS0+Jyk7XG4gICAgdGhpcy5hc3NlcnRTdGFibGVSZXJlbmRlcigpO1xuXG4gICAgdGhpcy5yZXJlbmRlcih7IHNob3dFeHRlcm5hbDogdHJ1ZSB9KTtcbiAgICBlcXVhbHNFbGVtZW50KGV4dGVybmFsRWxlbWVudCwgJ2RpdicsIHt9LCBzdHJpcFRpZ2h0YFtkZXN0cm95IG1lIV1gKTtcbiAgICB0aGlzLmFzc2VydC5lcXVhbChkZXN0cm95ZWQsIDAsICdjb21wb25lbnQgd2FzIGRlc3Ryb3llZCcpO1xuICAgIHRoaXMuYXNzZXJ0SFRNTCgnPCEtLS0tPicpO1xuICAgIHRoaXMuYXNzZXJ0U3RhYmxlUmVyZW5kZXIoKTtcblxuICAgIHRoaXMucmVyZW5kZXIoeyBzaG93RXh0ZXJuYWw6IGZhbHNlIH0pO1xuICAgIGVxdWFsc0VsZW1lbnQoZXh0ZXJuYWxFbGVtZW50LCAnZGl2Jywge30sIHN0cmlwVGlnaHRgYCk7XG4gICAgdGhpcy5hc3NlcnQuZXF1YWwoZGVzdHJveWVkLCAxLCAnY29tcG9uZW50IHdhcyBkZXN0cm95ZWQnKTtcbiAgICB0aGlzLmFzc2VydEhUTUwoJzwhLS0tLT4nKTtcbiAgICB0aGlzLmFzc2VydFN0YWJsZVJlcmVuZGVyKCk7XG4gIH1cbn1cbiJdfQ==