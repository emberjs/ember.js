import { RenderingTest, moduleFor } from '../utils/test-case';
import { set } from 'ember-metal/property_set';
import { computed } from 'ember-metal/computed';
import EmberObject from 'ember-runtime/system/object';

moduleFor('Static content tests', class extends RenderingTest {

  ['@test it can render a static text node']() {
    this.render('hello');
    let text1 = this.assertTextNode(this.firstChild, 'hello');

    this.rerender();
    let text2 = this.assertTextNode(this.firstChild, 'hello');

    this.assertSameNode(text1, text2);
  }

  ['@test it can render a static element']() {
    this.render('<p>hello</p>');
    let p1 = this.assertElement(this.firstChild, { tagName: 'p' });
    let text1 = this.assertTextNode(this.firstChild.firstChild, 'hello');

    this.rerender();
    let p2 = this.assertElement(this.firstChild, { tagName: 'p' });
    let text2 = this.assertTextNode(this.firstChild.firstChild, 'hello');

    this.assertSameNode(p1, p2);
    this.assertSameNode(text1, text2);
  }

  ['@test it can render a static template']() {
    let template = `
      <div class="header">
        <h1>Welcome to Ember.js</h1>
      </div>
      <div class="body">
        <h2>Why you should use Ember.js?</h2>
        <ol>
          <li>It's great</li>
          <li>It's awesome</li>
          <li>It's Ember.js</li>
        </ol>
      </div>
      <div class="footer">
        Ember.js is free, open source and always will be.
      </div>
    `;

    this.render(template);
    this.assertHTML(template);

    this.rerender();
    this.assertHTML(template);
  }

});

moduleFor('Dynamic content tests', class extends RenderingTest {

  ['@test it can render a dynamic text node']() {
    this.render('{{message}}', {
      message: 'hello'
    });
    let text1 = this.assertTextNode(this.firstChild, 'hello');

    this.rerender();
    let text2 = this.assertTextNode(this.firstChild, 'hello');

    this.assertSameNode(text1, text2);

    set(this.context, 'message', 'goodbye');

    this.rerender();
    let text3 = this.assertTextNode(this.firstChild, 'goodbye');

    this.assertSameNode(text1, text3);

    set(this.context, 'message', 'hello');

    this.rerender();
    let text4 = this.assertTextNode(this.firstChild, 'hello');

    this.assertSameNode(text1, text4);
  }

  ['@test it can render a dynamic text node with deeply nested paths']() {
    this.render('{{a.b.c.d.e.f}}', {
      a: { b: { c: { d: { e: { f: 'hello' } } } } }
    });
    let text1 = this.assertTextNode(this.firstChild, 'hello');

    this.rerender();
    let text2 = this.assertTextNode(this.firstChild, 'hello');

    this.assertSameNode(text1, text2);

    set(this.context, 'a.b.c.d.e.f', 'goodbye');

    this.rerender();
    let text3 = this.assertTextNode(this.firstChild, 'goodbye');

    this.assertSameNode(text1, text3);

    set(this.context, 'a.b.c.d.e.f', 'hello');

    this.rerender();
    let text4 = this.assertTextNode(this.firstChild, 'hello');

    this.assertSameNode(text1, text4);
  }

  ['@test it can render a dynamic text node where the value is a computed property']() {
    let Formatter = EmberObject.extend({
      formattedMessage: computed('message', function() {
        return this.get('message').toUpperCase();
      })
    });

    let m = Formatter.create({ message: 'hello' });

    this.render('{{m.formattedMessage}}', { m });

    let text1 = this.assertTextNode(this.firstChild, 'HELLO');

    this.rerender();
    let text2 = this.assertTextNode(this.firstChild, 'HELLO');

    this.assertSameNode(text1, text2);

    set(m, 'message', 'goodbye');

    this.rerender();
    let text3 = this.assertTextNode(this.firstChild, 'GOODBYE');

    this.assertSameNode(text1, text3);

    set(m, 'message', 'hello');

    this.rerender();
    let text4 = this.assertTextNode(this.firstChild, 'HELLO');

    this.assertSameNode(text1, text4);
  }

  ['@test it can render a dynamic element']() {
    this.render('<p>{{message}}</p>', {
      message: 'hello'
    });
    let p1 = this.assertElement(this.firstChild, { tagName: 'p' });
    let text1 = this.assertTextNode(this.firstChild.firstChild, 'hello');

    this.rerender();
    let p2 = this.assertElement(this.firstChild, { tagName: 'p' });
    let text2 = this.assertTextNode(this.firstChild.firstChild, 'hello');

    this.assertSameNode(p1, p2);
    this.assertSameNode(text1, text2);

    set(this.context, 'message', 'goodbye');

    this.rerender();
    let p3 = this.assertElement(this.firstChild, { tagName: 'p' });
    let text3 = this.assertTextNode(this.firstChild.firstChild, 'goodbye');

    this.assertSameNode(p1, p3);
    this.assertSameNode(text1, text3);

    set(this.context, 'message', 'hello');

    this.rerender();
    let p4 = this.assertElement(this.firstChild, { tagName: 'p' });
    let text4 = this.assertTextNode(this.firstChild.firstChild, 'hello');

    this.assertSameNode(p1, p4);
    this.assertSameNode(text1, text4);
  }

  ['@test it can render a dynamic template']() {
    let template = `
      <div class="header">
        <h1>Welcome to {{framework}}</h1>
      </div>
      <div class="body">
        <h2>Why you should use {{framework}}?</h2>
        <ol>
          <li>It's great</li>
          <li>It's awesome</li>
          <li>It's {{framework}}</li>
        </ol>
      </div>
      <div class="footer">
        {{framework}} is free, open source and always will be.
      </div>
    `;

    let ember = `
      <div class="header">
        <h1>Welcome to Ember.js</h1>
      </div>
      <div class="body">
        <h2>Why you should use Ember.js?</h2>
        <ol>
          <li>It's great</li>
          <li>It's awesome</li>
          <li>It's Ember.js</li>
        </ol>
      </div>
      <div class="footer">
        Ember.js is free, open source and always will be.
      </div>
    `;

    let react = `
      <div class="header">
        <h1>Welcome to React</h1>
      </div>
      <div class="body">
        <h2>Why you should use React?</h2>
        <ol>
          <li>It's great</li>
          <li>It's awesome</li>
          <li>It's React</li>
        </ol>
      </div>
      <div class="footer">
        React is free, open source and always will be.
      </div>
    `;

    this.render(template, {
      framework: 'Ember.js'
    });
    this.assertHTML(ember);

    this.rerender();
    this.assertHTML(ember);

    set(this.context, 'framework', 'React');

    this.rerender();
    this.assertHTML(react);

    set(this.context, 'framework', 'Ember.js');

    this.rerender();
    this.assertHTML(ember);
  }

});
