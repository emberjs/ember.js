import { jQuery } from 'ember-views';
import { run } from 'ember-metal';
import Application from '../../../system/application';
import DefaultResolver from '../../../system/resolver';
import { compile } from 'ember-template-compiler';

let application;

QUnit.module('Ember.Application Dependency Injection – customResolver', {
  setup() {
    let fallbackTemplate = compile('<h1>Fallback</h1>');

    let Resolver = DefaultResolver.extend({
      resolveTemplate(resolvable) {
        let resolvedTemplate = this._super(resolvable);
        if (resolvedTemplate) { return resolvedTemplate; }
        if (resolvable.fullNameWithoutType === 'application') {
          return fallbackTemplate;
        } else {
          return;
        }
      }
    });

    application = run(() => {
      return Application.create({
        Resolver: Resolver,
        rootElement: '#qunit-fixture'
      });
    });
  },

  teardown() {
    run(application, 'destroy');
  }
});

QUnit.test('a resolver can be supplied to application', function() {
  equal(jQuery('h1', application.rootElement).text(), 'Fallback');
});
