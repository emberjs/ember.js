import Ember from 'ember';
import { expectTypeOf } from 'expect-type';

Ember.Component.extend({
  layout: 'my-layout',
});

const MyComponent = Ember.Component.extend();
expectTypeOf(Ember.get(MyComponent, 'positionalParams')).toEqualTypeOf<string | string[]>();

const component1 = Ember.Component.extend({
  actions: {
    hello(name: string) {
      console.log('Hello', name);
    },
  },
});

class AnotherComponent extends Ember.Component {
  name = '';

  hello(name: string) {
    this.set('name', name);
    this.name = name;
  }
}

Ember.Component.extend({
  tagName: 'em',
});

Ember.Component.extend({
  classNames: ['my-class', 'my-other-class'],
});

class Bindings extends Ember.Component {
  classNameBindings = ['propertyA', 'propertyB'];
  propertyA = 'from-a';

  @Ember.computed()
  get propertyB() {
    if (!this.get('propertyA')) {
      return 'from-b';
    }
  }
}

Ember.Component.extend({
  classNameBindings: ['hovered'],
  hovered: true,
});

class Message extends Ember.Object {
  empty = false;
}

Ember.Component.extend({
  classNameBindings: ['messages.empty'],
  messages: Message.create({
    empty: true,
  }),
});

Ember.Component.extend({
  classNameBindings: ['isEnabled:enabled:disabled'],
  isEnabled: true,
});

Ember.Component.extend({
  classNameBindings: ['isEnabled::disabled'],
  isEnabled: true,
});

Ember.Component.extend({
  tagName: 'a',
  attributeBindings: ['href'],
  href: 'http://google.com',
});

Ember.Component.extend({
  tagName: 'a',
  attributeBindings: ['url:href'],
  url: 'http://google.com',
});

Ember.Component.extend({
  tagName: 'use',
  attributeBindings: ['xlinkHref:xlink:href'],
  xlinkHref: '#triangle',
});

Ember.Component.extend({
  tagName: 'input',
  attributeBindings: ['disabled'],
  disabled: false,
});

Ember.Component.extend({
  tagName: 'input',
  attributeBindings: ['disabled'],
  disabled: Ember.computed(() => {
    return someLogic();
  }),
});

declare function someLogic(): boolean;

Ember.Component.extend({
  tagName: 'form',
  attributeBindings: ['novalidate'],
  novalidate: null,
});

Ember.Component.extend({
  click(event: object) {
    // will be called when an instance's
    // rendered element is clicked
  },
});
