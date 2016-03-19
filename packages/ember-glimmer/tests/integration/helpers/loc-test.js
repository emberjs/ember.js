import { RenderingTest, moduleFor } from '../../utils/test-case';
import Ember from 'ember-metal/core';

moduleFor('Helpers test: {{loc}}', class extends RenderingTest {

  constructor() {
    super();
    this.oldString = Ember.STRINGS;
    Ember.STRINGS = {
      '_Howdy Friend': 'Hallo Freund'
    };
  }

  teardown() {
    Ember.STRINGS = this.oldString;
  }

  ['@test it lets the original value through by default']() {
    this.render(`{{loc "Hiya buddy!"}}`);
    this.assertText('Hiya buddy!', 'the unlocalized string is correct');
    this.runTask(() => this.rerender());
    this.assertText('Hiya buddy!', 'the unlocalized string is correct after rerender');
  }

  ['@test it localizes a simple string']() {
    this.render(`{{loc "_Howdy Friend"}}`);
    this.assertText('Hallo Freund', 'the localized string is correct');
    this.runTask(() => this.rerender());
    this.assertText('Hallo Freund', 'the localized string is correct after rerender');
  }

  ['@test it takes passed formats into an account']() {
    this.render(`{{loc "%@, %@" "Hello" "Mr. Pitkin"}}`);
    this.assertText('Hello, Mr. Pitkin', 'the formatted string is correct');
    this.runTask(() => this.rerender());
    this.assertText('Hello, Mr. Pitkin', 'the formatted string is correct after rerender');
  }

});
