import { run } from '../..';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor('debounce', class extends AbstractTestCase {
  ['@test debounce - with target, with method, without args'](assert) {
    let done = assert.async();

    let calledWith = [];
    let target = {
      someFunc(...args) {
        calledWith.push(args);
      }
    };

    run.debounce(target, target.someFunc, 10);
    run.debounce(target, target.someFunc, 10);
    run.debounce(target, target.someFunc, 10);

    setTimeout(() => {
      assert.deepEqual(calledWith, [ [] ], 'someFunc called once with correct arguments');
      done();
    }, 20);
  }

  ['@test debounce - with target, with method name, without args'](assert) {
    let done = assert.async();

    let calledWith = [];
    let target = {
      someFunc(...args) {
        calledWith.push(args);
      }
    };

    run.debounce(target, 'someFunc', 10);
    run.debounce(target, 'someFunc', 10);
    run.debounce(target, 'someFunc', 10);

    setTimeout(() => {
      assert.deepEqual(calledWith, [ [] ], 'someFunc called once with correct arguments');
      done();
    }, 20);
  }

  ['@test debounce - without target, without args'](assert) {
    let done = assert.async();

    let calledWith = [];
    function someFunc(...args) {
      calledWith.push(args);
    }

    run.debounce(someFunc, 10);
    run.debounce(someFunc, 10);
    run.debounce(someFunc, 10);

    setTimeout(() => {
      assert.deepEqual(calledWith, [ [] ], 'someFunc called once with correct arguments');
      done();
    }, 20);
  }

  ['@test debounce - without target, with args'](assert) {
    let done = assert.async();

    let calledWith = [];
    function someFunc(...args) {
      calledWith.push(args);
    }

    run.debounce(someFunc, { isFoo: true }, 10);
    run.debounce(someFunc, { isBar: true }, 10);
    run.debounce(someFunc, { isBaz: true }, 10);

    setTimeout(() => {
      assert.deepEqual(calledWith, [ [ { isBaz: true } ] ], 'someFunc called once with correct arguments');
      done();
    }, 20);
  }
});
