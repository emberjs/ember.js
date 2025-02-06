import { moduleFor, AbstractTestCase } from 'internal-test-helpers';
import { template } from '@ember/template-compiler';
import { getComponentTemplate, getInternalComponentManager } from '@glimmer/ember/manager';

moduleFor(
  'template',
  class extends AbstractTestCase {
    ['@test template() can be called with the implicit form'](assert: QUnit['assert']) {
      const component = template(`<template>hello</template>`, {
        eval: function () {
          return eval(arguments[0]);
        },
      });

      // This is a smoke test -- integration tests are forthcoming
      const internalTemplate = getComponentTemplate(component);
      assert.ok(internalTemplate, 'template is not null');

      const internalManager = getInternalComponentManager(component);
      assert.ok(internalManager, 'manager is not null');
    }
  }
);
