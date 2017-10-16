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
