import { RenderTest, test, assertEmberishElement } from "../render-test";
import { classes } from '../environment';
import { EmberishGlimmerComponent } from "../environment/components/emberish-glimmer";
import { strip } from "../helpers";

export class EmberishComponentTests extends RenderTest {
  @test({ kind: 'glimmer' })
  "[BUG: #644 popping args should be balanced]"() {
    class MainComponent extends EmberishGlimmerComponent {
      salutation = 'Glimmer';
    }
    this.registerComponent('Glimmer', 'Main', '<div><HelloWorld @name={{salutation}} /></div>', MainComponent);
    this.registerComponent('Glimmer', 'HelloWorld', '<h1>Hello {{@name}}!</h1>');
    this.render('<Main />');
    this.assertHTML('<div><h1>Hello Glimmer!</h1></div>');
  }

  @test({ kind: 'glimmer' })
  "[BUG] Gracefully handles application of curried args when invoke starts with 0 args"() {
    class MainComponent extends EmberishGlimmerComponent {
      salutation = 'Glimmer';
    }
    this.registerComponent('Glimmer', 'Main', '<div><HelloWorld @a={{@a}} as |wat|>{{wat}}</HelloWorld></div>', MainComponent);
    this.registerComponent('Glimmer', 'HelloWorld', '{{yield (component "A" a=@a)}}');
    this.registerComponent('Glimmer', 'A', 'A {{@a}}');
    this.render('<Main @a={{a}} />', { a: 'a' });
    this.assertHTML('<div>A a</div>');
    this.assertStableRerender();
    this.rerender({a: 'A' });
    this.assertHTML('<div>A A</div>');
    this.assertStableNodes();
  }

  @test({ kind: 'glimmer' })
  "Static block component helper"() {
    this.registerComponent('Glimmer', 'A', 'A {{#component "B" arg1=@one}}{{/component}}');
    this.registerComponent('Glimmer', 'B', 'B {{@arg1}}');
    this.render('<A @one={{arg}} />', { arg: 1 });
    this.assertHTML('A B 1');
    this.assertStableRerender();
    this.rerender({arg: 2 });
    this.assertHTML('A B 2');
    this.assertStableNodes();
  }

  @test({ kind: 'glimmer' })
  "Static inline component helper"() {
    this.registerComponent('Glimmer', 'A', 'A {{component "B" arg1=@one}}');
    this.registerComponent('Glimmer', 'B', 'B {{@arg1}}');
    this.render('<A @one={{arg}} />', { arg: 1 });
    this.assertHTML('A B 1');
    this.assertStableRerender();
    this.rerender({arg: 2 });
    this.assertHTML('A B 2');
    this.assertStableNodes();
  }

  @test({ kind: 'glimmer' })
  "top level in-element"() {
    this.registerComponent('Glimmer', 'Foo', '<Bar data-bar={{@childName}} @data={{@data}} />');
    this.registerComponent('Glimmer', 'Bar', '<div ...attributes>Hello World</div>');

    let el = document.createElement('div');

    this.render(strip`
    {{#each components key="id" as |component|}}
      {{#in-element component.mount}}
        {{component component.name childName=component.child data=component.data}}
      {{/in-element}}
    {{/each}}
    `, { components: [{ name: 'Foo', child: 'Bar', mount: el, data: { wat: 'Wat' } }] });
    assertEmberishElement(el.firstChild as HTMLElement, 'div', { 'data-bar': 'Bar' }, 'Hello World');
    this.rerender({ components: [{ name: 'Foo', child: 'Bar', mount: el, data: { wat: 'Wat' } }] });
    assertEmberishElement(el.firstChild as HTMLElement, 'div', { 'data-bar': 'Bar' }, 'Hello World');
  }

  @test({ kind: 'glimmer' })
  "recursive component invocation"() {
    let counter = 0;

    class RecursiveInvoker extends EmberishGlimmerComponent {
      id: number;

      get showChildren() {
        return this.id < 3;
      }

      constructor(...args: any[]) {
        super(...args);
        this.id = ++counter;
      }
    }

    this.registerComponent('Glimmer', 'RecursiveInvoker', '{{id}}{{#if showChildren}}<RecursiveInvoker />{{/if}}', RecursiveInvoker);

    this.render('<RecursiveInvoker />');
    this.assertHTML('123<!---->');
  }

  @test
  "non-block without properties"() {
    this.render({
      layout: 'In layout'
    });

     this.assertComponent('In layout');
     this.assertStableRerender();
  }

  @test
  "block without properties"() {
    this.render({
      layout: 'In layout -- {{yield}}',
      template: 'In template'
    });

    this.assertComponent('In layout -- In template');
    this.assertStableRerender();
  }

  @test
  "yield inside a conditional on the component"() {
    this.render({
      layout: 'In layout -- {{#if @predicate}}{{yield}}{{/if}}',
      template: 'In template',
      args: { predicate: 'predicate' },
    }, { predicate: true });

    this.assertComponent('In layout -- In template', {});
    this.assertStableRerender();

    this.rerender({predicate: false });
    this.assertComponent('In layout -- <!---->');
    this.assertStableNodes();

    this.rerender({ predicate: true });
    this.assertComponent('In layout -- In template', {});
    this.assertStableNodes();
  }

  @test
  "non-block with properties on attrs"() {
    this.render({
      layout: 'In layout - someProp: {{@someProp}}',
      args: { someProp: '"something here"'}
    });

    this.assertComponent('In layout - someProp: something here');
    this.assertStableRerender();
  }

  @test
  "block with properties on attrs"() {
    this.render({
      layout: 'In layout - someProp: {{@someProp}} - {{yield}}',
      template: 'In template',
      args: { someProp: '"something here"' }
    });

    this.assertComponent('In layout - someProp: something here - In template');
    this.assertStableRerender();
  }

  @test({ skip: true, kind: 'curly' })
  "with ariaRole specified"() {
    this.render({
      layout: 'Here!',
      attributes: { id: '"aria-test"', ariaRole: '"main"' }
    });

    this.assertComponent('Here!', { id: '"aria-test"', role: '"main"' });
    this.assertStableRerender();
  }

  @test({ skip: true, kind: 'curly' })
  "with ariaRole and class specified"() {
    this.render({
      layout: 'Here!',
      attributes: { id: '"aria-test"', class: '"foo"', ariaRole: '"main"' }
    });

    this.assertComponent('Here!', { id: '"aria-test"', class: classes('ember-view foo'), role: '"main"' });
    this.assertStableRerender();
  }

  @test({ skip: true, kind: 'curly' })
  "with ariaRole specified as an outer binding"() {
    this.render({
      layout: 'Here!',
      attributes: { id: '"aria-test"', class: '"foo"', ariaRole: 'ariaRole' }
    }, { ariaRole: 'main' });

    this.assertComponent('Here!', { id: '"aria-test"', class: classes('ember-view foo'), role: '"main"' });
    this.assertStableRerender();
  }

  @test({ skip: true, kind: 'glimmer' })
  "glimmer component with role specified as an outer binding and copied"() {
    this.render({
      layout: 'Here!',
      attributes: { id: '"aria-test"', role: 'myRole' }
    }, { myRole: 'main' });

    this.assertComponent('Here!', { id: '"aria-test"', role: '"main"' });
    this.assertStableRerender();
  }
}
