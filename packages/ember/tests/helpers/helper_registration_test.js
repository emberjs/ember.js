import { moduleFor, ApplicationTestCase } from 'internal-test-helpers';
import { Controller, Service, inject } from 'ember-runtime';
import { Helper, helper } from 'ember-glimmer';

moduleFor('Application Lifecycle - Helper Registration', class extends ApplicationTestCase {
  ['@test Unbound dashed helpers registered on the container can be late-invoked'](assert) {
    this.addTemplate('application', `<div id='wrapper'>{{x-borf}} {{x-borf 'YES'}}</div>`);

    let myHelper = helper(params => params[0] || 'BORF');
    this.application.register('helper:x-borf', myHelper);

    return this.visit('/').then(() => {
      assert.equal(this.$('#wrapper').text(), 'BORF YES', 'The helper was invoked from the container');
    });
  }

  ['@test Bound helpers registered on the container can be late-invoked'](assert) {
    this.addTemplate('application', `<div id='wrapper'>{{x-reverse}} {{x-reverse foo}}</div>`);

    this.add('controller:application', Controller.extend({
      foo: 'alex'
    }));

    this.application.register('helper:x-reverse', helper(function([ value ]) {
      return value ? value.split('').reverse().join('') : '--';
    }));

    return this.visit('/').then(() => {
      assert.equal(this.$('#wrapper').text(), '-- xela', 'The bound helper was invoked from the container');
    });
  }

  ['@test Undashed helpers registered on the container can be invoked'](assert) {
    this.addTemplate('application', `<div id='wrapper'>{{omg}}|{{yorp 'boo'}}|{{yorp 'ya'}}</div>`);

    this.application.register('helper:omg', helper(() => 'OMG'));

    this.application.register('helper:yorp', helper(([ value ]) => value));

    return this.visit('/').then(() => {
      assert.equal(this.$('#wrapper').text(), 'OMG|boo|ya', 'The helper was invoked from the container');
    });
  }

  ['@test Helpers can receive injections'](assert) {
    this.addTemplate('application', `<div id='wrapper'>{{full-name}}</div>`);

    let serviceCalled = false;

    this.add('service:name-builder', Service.extend({
      build() {
        serviceCalled = true;
      }
    }));

    this.add('helper:full-name', Helper.extend({
      nameBuilder: inject.service('name-builder'),
      compute() {
        this.get('nameBuilder').build();
      }
    }));

    return this.visit('/').then(() => {
      assert.ok(serviceCalled, 'service was injected, method called');
    });
  }
});
