import { runAppend, runDestroy } from 'ember-runtime/tests/utils';
import ComponentLookup from 'ember-views/component_lookup';
import Component from 'ember-views/components/component';
import GlimmerComponent from 'ember-htmlbars/glimmer-component';
import compile from 'ember-template-compiler/system/compile';
import run from 'ember-metal/run_loop';
import isEnabled from 'ember-metal/features';
import isEmpty from 'ember-metal/is_empty';
import { OWNER } from 'container/owner';
import buildOwner from 'container/tests/test-helpers/build-owner';

let component, owner;

if (isEnabled('ember-contextual-components')) {
  QUnit.module('ember-htmlbars: closure component helper', {
    setup() {
      owner = buildOwner();

      owner.registerOptionsForType('template', { instantiate: false });
      owner.register('component-lookup:main', ComponentLookup);
    },

    teardown() {
      runDestroy(component);
      runDestroy(owner);
      owner = component = null;
    }
  });

  QUnit.test('[Component] renders with component helper', function() {
    let expectedText = 'Hodi';

    owner.register(
      'component:-looked-up',
      Component.extend()
    );

    owner.register(
      'template:components/-looked-up',
      compile(expectedText)
    );

    let template = compile('{{component (component "-looked-up")}}');
    component = Component.extend({
      [OWNER]: owner,
      template
    }).create();

    runAppend(component);
    equal(component.$().text(), expectedText, '-looked-up component rendered');
  });

  QUnit.test('[Component] updates when component path is bound', function() {
    let Mandarin = Component.extend();
    owner.register(
      'component:-mandarin',
      Mandarin
    );
    owner.register(
      'template:components/-mandarin',
      compile('ni hao')
    );
    owner.register(
      'template:components/-hindi',
      compile('Namaste')
    );

    let template = compile('{{component (component lookupComponent)}}');
    component = Component.extend({
      [OWNER]: owner,
      template,
      lookupComponent: '-mandarin'
    }).create();

    runAppend(component);

    equal(component.$().text(), `ni hao`,
          'mandarin lookupComponent renders greeting');

    run(() => {
      component.set('lookupComponent', '-hindi');
    });
    equal(component.$().text(), `Namaste`,
          'hindi lookupComponent renders greeting');
  });

  QUnit.test('updates when curried hash arguments is bound in block form', function() {
    owner.register(
      'template:components/-looked-up',
      compile(`{{greeting}}`)
    );

    let template = compile(
      `{{#with (hash comp=(component "-looked-up" greeting=greeting)) as |my|}}
      {{#my.comp}}{{/my.comp}}
      {{/with}}`
    );

    component = Component.extend({
      [OWNER]: owner,
      template
    }).create();

    runAppend(component);
    equal(component.$().text().trim(), '', '-looked-up component rendered');
    run(() => {
      component.set('greeting', 'Hodi');
    });
    equal(component.$().text().trim(), `Hodi`,
          'greeting is bound');
  });

  QUnit.test('[Component] updates when curried hash argument is bound', function() {
    owner.register(
      'component:-lookup-up',
      Component.extend()
    );

    owner.register(
      'template:components/-looked-up',
      compile(`{{greeting}}`)
    );

    let template = compile(
      `{{component (component "-looked-up" greeting=greeting)}}`
    );

    component = Component.extend({
      [OWNER]: owner,
      template
    }).create();

    runAppend(component);
    equal(component.$().text(), '', '-looked-up component rendered');
    run(() => {
      component.set('greeting', 'Hodi');
    });
    equal(component.$().text(), `Hodi`,
          'greeting is bound');
  });

  QUnit.test('[Component] raises an assertion when component path is null', function() {
    let template = compile(`{{component (component lookupComponent)}}`);
    component = Component.extend({
      [OWNER]: owner,
      template
    }).create();

    expectAssertion(() => {
      runAppend(component);
    });
  });

  QUnit.test('[Component] renders with dot path', function() {
    let expectedText = 'Hodi';

    owner.register(
      'component:-looked-up',
      Component.extend()
    );

    owner.register(
      'template:components/-looked-up',
      compile(`<div>${expectedText}</div>`)
    );

    let template = compile('{{#with (hash lookedup=(component "-looked-up")) as |object|}}{{object.lookedup}}{{/with}}');
    component = Component.extend({
      [OWNER]: owner,
      template
    }).create();

    runAppend(component);
    equal(component.$().text(), expectedText, '-looked-up component rendered');
  });

  QUnit.test('[Component] bound outer named parameters get updated in the right scope', function() {
    let InnerComponent = Component.extend();
    InnerComponent.reopenClass({
      positionalParams: ['comp']
    });
    owner.register(
      'component:-inner-component',
      InnerComponent
    );
    owner.register(
      'template:components/-inner-component',
      compile(`{{component comp "Inner"}}`)
    );

    let LookedUp = Component.extend();
    LookedUp.reopenClass({
      positionalParams: ['name', 'age']
    });
    owner.register(
      'component:-looked-up',
      LookedUp
    );
    owner.register(
      'template:components/-looked-up',
      compile(`{{name}} {{age}}`)
    );

    let template = compile(
      `{{component "-inner-component" (component "-looked-up" outerName outerAge)}}`
    );
    component = Component.extend({
      [OWNER]: owner,
      template,
      outerName: 'Outer',
      outerAge: 28
    }).create();

    runAppend(component);
    equal(component.$().text(), 'Inner 28', '-looked-up component rendered');
  });

  QUnit.test('[Component] bound outer hash parameters get updated in the right scope', function() {
    let InnerComponent = Component.extend();
    InnerComponent.reopenClass({
      positionalParams: ['comp']
    });
    owner.register(
      'component:-inner-component',
      InnerComponent
    );
    owner.register(
      'template:components/-inner-component',
      compile(`{{component comp name="Inner"}}`)
    );

    let LookedUp = Component.extend();
    LookedUp.reopenClass({
    });
    owner.register(
      'component:-looked-up',
      LookedUp
    );
    owner.register(
      'template:components/-looked-up',
      compile(`{{name}} {{age}}`)
    );

    let template = compile(
      `{{component "-inner-component" (component "-looked-up" name=outerName age=outerAge)}}`
    );
    component = Component.extend({
      [OWNER]: owner,
      template,
      outerName: 'Outer',
      outerAge: 28
    }).create();

    runAppend(component);
    equal(component.$().text(), 'Inner 28', '-looked-up component rendered');
  });

  QUnit.test('[Component] conflicting positional and hash parameters raise and assertion if in the same closure', function() {
    let LookedUp = Component.extend();
    LookedUp.reopenClass({
      positionalParams: ['name']
    });
    owner.register(
      'component:-looked-up',
      LookedUp
    );
    owner.register(
      'template:components/-looked-up',
      compile(`{{greeting}} {{name}}`)
    );

    let template = compile(
      `{{component (component "-looked-up" "Hodari" name="Sergio") "Hodari" greeting="Hodi"}}`
    );
    component = Component.extend({
      [OWNER]: owner,
      template
    }).create();

    expectAssertion(function() {
      runAppend(component);
    }, `You cannot specify both a positional param (at position 0) and the hash argument \`name\`.`);
  });

  QUnit.test('[Component] conflicting positional and hash parameters does not raise and assertion if rerendered', function() {
    let LookedUp = Component.extend();
    LookedUp.reopenClass({
      positionalParams: ['name']
    });
    owner.register(
      'component:-looked-up',
      LookedUp
    );
    owner.register(
      'template:components/-looked-up',
      compile(`{{greeting}} {{name}}`)
    );

    let template = compile(
      `{{component (component "-looked-up" name greeting="Hodi")}}`
    );

    component = Component.extend({
      [OWNER]: owner,
      template,
      name: 'Hodari'
    }).create();

    runAppend(component);
    equal(component.$().text(), 'Hodi Hodari', 'component is rendered');

    run(() => component.set('name', 'Sergio'));

    equal(component.$().text(), 'Hodi Sergio', 'component is rendered');
  });

  QUnit.test('[Component] conflicting positional and hash parameters does not raise and assertion if in the different closure', function() {
    let LookedUp = Component.extend();
    LookedUp.reopenClass({
      positionalParams: ['name']
    });
    owner.register(
      'component:-looked-up',
      LookedUp
    );
    owner.register(
      'template:components/-looked-up',
      compile(`{{greeting}} {{name}}`)
    );

    let template = compile(
      `{{component (component "-looked-up" "Hodari") name="Sergio" greeting="Hodi"}}`
    );
    component = Component.extend({
      [OWNER]: owner,
      template
    }).create();

    runAppend(component);
    equal(component.$().text(), 'Hodi Sergio', 'component is rendered');
  });

  QUnit.test('[Component] renders with dot path and attr', function() {
    let expectedText = 'Hodi';

    owner.register(
      'component:-looked-up',
      Component.extend()
    );

    owner.register(
      'template:components/-looked-up',
      compile('{{expectedText}}')
    );

    let template = compile('{{#with (hash lookedup=(component "-looked-up")) as |object|}}{{object.lookedup expectedText=expectedText}}{{/with}}');
    component = Component.extend({
      [OWNER]: owner,
      template
    }).create({
      expectedText
    });

    runAppend(component);
    equal(component.$().text(), expectedText, '-looked-up component rendered');
  });

  QUnit.test('[Component] renders with dot path curried over attr', function() {
    let expectedText = 'Hodi';

    owner.register(
      'component:-looked-up',
      Component.extend()
    );

    owner.register(
      'template:components/-looked-up',
      compile('{{expectedText}}')
    );

    let template = compile('{{#with (hash lookedup=(component "-looked-up" expectedText=expectedText)) as |object|}}{{object.lookedup}}{{/with}}');
    component = Component.extend({
      [OWNER]: owner,
      template
    }).create({
      expectedText
    });

    runAppend(component);
    equal(component.$().text(), expectedText, '-looked-up component rendered');
  });

  QUnit.test('[Component] renders with dot path and with rest positional parameters', function() {
    let LookedUp = Component.extend();
    LookedUp.reopenClass({
      positionalParams: 'params'
    });
    owner.register(
      'component:-looked-up',
      LookedUp
    );
    let expectedText = 'Hodi';
    owner.register(
      'template:components/-looked-up',
      compile('{{params}}')
    );

    let template = compile('{{#with (hash lookedup=(component "-looked-up")) as |object|}}{{object.lookedup expectedText "Hola"}}{{/with}}');
    component = Component.extend({
      [OWNER]: owner,
      template
    }).create({
      expectedText
    });

    runAppend(component);
    equal(component.$().text(), `${expectedText},Hola`, '-looked-up component rendered with rest params');
  });

  QUnit.test('[Component] renders with dot path and rest parameter does not leak', function() {
    let value = false;
    let MyComponent = Component.extend({
      didReceiveAttrs() {
        value = this.getAttr('value');
      }
    });

    MyComponent.reopenClass({
      positionalParams: ['value']
    });

    owner.register(
      'component:my-component',
      MyComponent
    );

    let template = compile(
      `{{#with (hash my-component=(component 'my-component')) as |c|}}
        {{c.my-component }}
       {{/with}}`
    );

    component = Component.extend({
      [OWNER]: owner,
      template
    }).create();

    runAppend(component);

    ok(isEmpty(value), 'value is an empty parameter');
  });

  QUnit.test('[Component] renders with dot path and updates attributes', function() {
    owner.register(
      'component:my-nested-component',
      Component.extend({
        didReceiveAttrs() {
          let prop = this.getAttr('my-parent-attr');
          this.set('myProp', prop);
        }
      })
    );

    owner.register(
      'template:components/my-nested-component',
      compile(`<span id='nested-prop'>{{myProp}}</span>`)
    );

    owner.register(
      'template:components/my-component',
      compile(`{{yield (hash my-nested-component=(component 'my-nested-component' my-parent-attr=attrs.my-attr))}}`)
    );

    let template = compile(`{{#my-component my-attr=myProp as |api|}}
                             {{api.my-nested-component}}
                           {{/my-component}}
                           <br>
                           <button onclick={{action 'changeValue'}}>Change value</button>`);
    component = Component.extend({
      [OWNER]: owner,
      template,
      myProp: 1,
      actions: {
        changeValue() { this.incrementProperty(`myProp`); }
      }
    }).create({ });

    runAppend(component);

    component.$('button').click();

    equal(component.$('#nested-prop').text(), '2', 'value got updated');

    component.$('button').click();

    equal(component.$('#nested-prop').text(), '3', 'value got updated again');
  });

  QUnit.test('[Component] adding parameters to a closure component\'s instance does not add it to other instances', function(assert) {
    owner.register(
      'template:components/select-box',
      compile('{{yield (hash option=(component "select-box-option"))}}')
    );

    owner.register(
      'template:components/select-box-option',
      compile('{{label}}')
    );

    let template = compile(
      '{{#select-box as |sb|}}{{sb.option label="Foo"}}{{sb.option}}{{/select-box}}'
    );

    component = Component.extend({
      [OWNER]: owner,
      template
    }).create();

    runAppend(component);
    equal(component.$().text(), 'Foo', 'there is only one Foo');
  });

  QUnit.test('[Component] raises an assertion when component path is not a component name', function() {
    let template = compile(`{{component (component "not-a-component")}}`);
    component = Component.extend({
      [OWNER]: owner,
      template
    }).create();

    expectAssertion(() => {
      runAppend(component);
    }, `The component helper cannot be used without a valid component name. You used "not-a-component" via (component "not-a-component")`);

    template = compile(`{{component (component compName)}}`);
    component = Component.extend({
      [OWNER]: owner,
      template,
      compName: 'not-a-component'
    }).create();

    expectAssertion(() => {
      runAppend(component);
    }, `The component helper cannot be used without a valid component name. You used "not-a-component" via (component compName)`);
  });

  QUnit.test('[Component] renders with component helper with invocation params, hash', function() {
    let LookedUp = Component.extend();
    LookedUp.reopenClass({
      positionalParams: ['name']
    });
    owner.register(
      'component:-looked-up',
      LookedUp
    );
    owner.register(
      'template:components/-looked-up',
      compile(`<div>{{greeting}} {{name}}</div>`)
    );

    let template = compile(
      `{{component (component "-looked-up") "Hodari" greeting="Hodi"}}`
    );
    component = Component.extend({
      [OWNER]: owner,
      template
    }).create();

    runAppend(component);
    equal(component.$().text(), 'Hodi Hodari', '-looked-up component rendered');
  });

  QUnit.test('[Component] renders with component helper with curried params, hash', function() {
    let LookedUp = Component.extend();
    LookedUp.reopenClass({
      positionalParams: ['name']
    });
    owner.register(
      'component:-looked-up',
      LookedUp
    );
    owner.register(
      'template:components/-looked-up',
      compile(`{{greeting}} {{name}}`)
    );

    let template = compile(
      `{{component (component "-looked-up" "Hodari" greeting="Hodi") greeting="Hola"}}`
    );
    component = Component.extend({
      [OWNER]: owner,
      template
    }).create();

    runAppend(component);
    equal(component.$().text(), 'Hola Hodari', '-looked-up component rendered');
  });

  QUnit.test('[Component] nested components overwrites named positional parameters', function() {
    let LookedUp = Component.extend();
    LookedUp.reopenClass({
      positionalParams: ['name', 'age']
    });
    owner.register(
      'component:-looked-up',
      LookedUp
    );
    owner.register(
      'template:components/-looked-up',
      compile(`{{name}} {{age}}`)
    );

    let template = compile(
      `{{component
      (component (component "-looked-up" "Sergio" 28)
      "Marvin" 21)
      "Hodari"}}`
    );

    component = Component.extend({
      [OWNER]: owner,
      template
    }).create();

    runAppend(component);
    equal(component.$().text(), 'Hodari 21', '-looked-up component rendered');
  });

  QUnit.test('[Component] nested components overwrites hash parameters', function() {
    owner.register(
      'component:-looked-up',
      Component.extend()
    );

    owner.register(
      'template:components/-looked-up',
      compile(`{{greeting}} {{name}} {{age}}`)
    );

    let template = compile(
      `{{component (component (component "-looked-up"
      greeting="Hola" name="Dolores" age=33)
      greeting="Hej" name="Sigmundur")
      greeting=greeting}}`
    );

    component = Component.extend({
      [OWNER]: owner,
      template,
      greeting: 'Hodi'
    }).create();

    runAppend(component);

    equal(component.$().text(), 'Hodi Sigmundur 33', '-looked-up component rendered');
  });

  if (isEnabled('ember-htmlbars-component-generation')) {
    QUnit.test('[GlimmerComponent] it does not render with component helper', function() {
      owner.register(
        'component:-looked-up',
        GlimmerComponent.extend()
      );

      owner.register(
        'template:components/-looked-up',
        compile('<div>Hola</div>')
      );

      let template = compile('{{component (component "-looked-up")}}');
      component = Component.extend({
        [OWNER]: owner,
        template
      }).create();

      expectAssertion(function() {
        runAppend(component);
      }, /curly braces/);
    });

    QUnit.test('[GlimmerComponent] it does not render with dot path and curly braces', function() {
      owner.register(
        'component:-looked-up',
        GlimmerComponent.extend()
      );

      owner.register(
        'template:components/-looked-up',
        compile('<div>Hola</div>')
      );

      let template = compile(`{{#with (hash comp=(component "-looked-up")) as |my|}}
                                {{my.comp}}
                              {{/with}}`);

      component = Component.extend({
        [OWNER]: owner,
        template
      }).create();

      expectAssertion(function() {
        runAppend(component);
      }, /curly braces/);
    });

    QUnit.test('[GlimmerComponent] it renders with angle brackets', function() {
      owner.register(
        'component:-looked-up',
        GlimmerComponent.extend()
      );

      owner.register(
        'template:components/-looked-up',
        compile('<div>Hola</div>')
      );

      let template = compile(`{{#with (hash comp=(component "-looked-up")) as |my|}}
                                <my.comp></my.comp>
                              {{/with}}`);

      component = Component.extend({
        [OWNER]: owner,
        template
      }).create();

      runAppend(component);

      equal(component.$().text().trim(), 'Hola', 'component gets rendered');
    });

    QUnit.test('[GlimmerComponent] it receives the attributes', function() {
      owner.register('component:my-glimmer-component', GlimmerComponent.extend({
        layout: compile('<span>{{value}}</span>'),
        didReceiveAttrs() {
          this._super(...arguments);
          console.log(this.attrs);
          this.set(`value`, this.attrs.value);
        }
      }));
      let template = compile(`{{#with (hash glimmer=(component "my-glimmer-component")) as |comp|}}
                                <comp.glimmer value={{val}}></comp.glimmer>
                              {{/with}}`);

      component = Component.extend({
        [OWNER]: owner,
        val: 12,
        template
      }).create();

      runAppend(component);

      equal(component.$().text().trim(), '12', 'component gets the right value');
    });

    QUnit.test('[GlimmerComponent] it updates the attributes', function() {
      owner.register('component:my-glimmer-component', GlimmerComponent.extend({
        layout: compile('<span>{{value}}</span>'),
        didReceiveAttrs() {
          this._super(...arguments);
          console.log(this.attrs);
          this.set(`value`, this.attrs.value);
        }
      }));
      let template = compile(`{{#with (hash glimmer=(component "my-glimmer-component")) as |comp|}}
                                <comp.glimmer value={{val}}></comp.glimmer>
                              {{/with}}`);

      component = Component.extend({
        [OWNER]: owner,
        val: 12,
        template
      }).create();

      runAppend(component);

      equal(component.$().text().trim(), '12', 'component gets the right value');

      run(() => {
        component.set('val', 14);
      });

      equal(component.$().text().trim(), '14', 'attribute got updated');
    });
  }
}
