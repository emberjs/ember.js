import Registry from 'container/registry';
import View from 'ember-views/views/view';
import GlimmerComponent from 'ember-htmlbars/glimmer-component';
import compile from 'ember-template-compiler/system/compile';
import { runAppend, runDestroy } from 'ember-runtime/tests/utils';
import ComponentLookup from 'ember-views/component_lookup';
import isEnabled from 'ember-metal/features';

let view;

if (isEnabled('ember-htmlbars-component-generation')) {
  QUnit.module('A basic glimmer component', {
    teardown() {
      runDestroy(view);
    }
  });

  QUnit.test('it renders', function(assert) {
    let component;

    let MyComponent = GlimmerComponent.extend({
      init() {
        component = this;
        this._super(...arguments);
      },
      layout: compile(`<my-component>...{{yield}}...</my-component>`)
    });

    renderComponent('my-component', {
      implementation: MyComponent,
      yielded: 'Hello world'
    });

    ok(component instanceof GlimmerComponent, 'the component was instantiated correctly');
    equal(view.childViews[0], component, 'the component was rendered and inserted into child views');
    hasSelector(assert, `my-component.ember-view[id=${component.elementId}]`);
    equal(view.$().text(), '...Hello world...');
  });
}

function renderComponent(tag, component) {
  let { params, hash, yielded, implementation } = component;
  params = params || [];
  hash = hash || {};
  let stringParams = params.join(' ');
  let stringHash = Object.keys(hash)
    .map(key => `${key}=${hash[key]}`)
    .join(' ');

  let registry = new Registry();
  registry.register('component-lookup:main', ComponentLookup);
  registry.register(`component:${tag}`, implementation);

  view = View.extend({
    container: registry.container(),
    template: compile(`<${tag} ${stringParams} ${stringHash}>${yielded}</${tag}>`)
  }).create();

  runAppend(view);
}

function hasSelector(assert, selector) {
  assert.ok(document.querySelector(`#qunit-fixture ${selector}`), `${selector} exists`);
}


//testForComponent({
  //name: 'my-component',
  //params: [],
  //hash: {},
  //template: `
    //<my-component>
      //Hello world
    //</my-component>
  //`,
  //component: MyComponent
//});
