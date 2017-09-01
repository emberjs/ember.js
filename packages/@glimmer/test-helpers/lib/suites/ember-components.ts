import { AbstractRenderTest, test } from "../abstract-test-case";
import { classes } from '../environment';
import { EmberishGlimmerComponent } from "@glimmer/test-helpers";

export class EmberishComponentTests extends AbstractRenderTest {
  @test({ kind: 'glimmer' })
  "[BUG: Load to s0 is wrong]"() {
    class MainComponent extends EmberishGlimmerComponent {
      salutation = 'Glimmer';
    }
    this.registerComponent('Glimmer', 'Main', '<div><HelloWorld @name={{salutation}} /></div>', MainComponent);
    this.registerComponent('Glimmer', 'HelloWorld', '<h1>Hello {{@name}}!</h1>');
    let test = document.createElement('my-test');
    this.render('{{#each roots key="id" as |root|}}{{#in-element root.element}}{{component root.name}}{{/in-element}}{{/each}}', {
      roots: [{name: 'Main', element: test }]
    });

    console.log(test);
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
