/*jshint newcap:false */

import Controller from 'ember-runtime/controllers/controller';
import 'ember-application/ext/controller';

import { Registry } from 'ember-runtime/system/container';
import { A } from 'ember-runtime/system/native_array';
import ArrayController, { arrayControllerDeprecation } from 'ember-runtime/controllers/array_controller';
import { computed } from 'ember-metal/computed';

QUnit.module('Controller dependencies');

QUnit.test('If a controller specifies a dependency, but does not have a container it should error', function() {
  var AController = Controller.extend({
    needs: 'posts'
  });

  expectAssertion(function() {
    AController.create();
  }, /specifies `needs`, but does not have a container. Please ensure this controller was instantiated with a container./);
});

QUnit.test('If a controller specifies a dependency, it is accessible', function() {
  var registry = new Registry();
  var container = registry.container();

  registry.register('controller:post', Controller.extend({
    needs: 'posts'
  }));

  registry.register('controller:posts', Controller.extend());

  var postController = container.lookup('controller:post');
  var postsController = container.lookup('controller:posts');

  equal(postsController, postController.get('controllers.posts'), 'controller.posts must be auto synthesized');
});

QUnit.test('If a controller specifies an unavailable dependency, it raises', function() {
  var registry = new Registry();
  var container = registry.container();

  registry.register('controller:post', Controller.extend({
    needs: ['comments']
  }));

  throws(function() {
    container.lookup('controller:post');
  }, /controller:comments/);

  registry.register('controller:blog', Controller.extend({
    needs: ['posts', 'comments']
  }));

  throws(function() {
    container.lookup('controller:blog');
  }, /controller:posts, controller:comments/);
});

QUnit.test('Mixin sets up controllers if there is needs before calling super', function() {
  expectDeprecation(arrayControllerDeprecation);
  var registry = new Registry();
  var container = registry.container();

  registry.register('controller:other', ArrayController.extend({
    needs: 'posts',
    model: computed.alias('controllers.posts')
  }));

  registry.register('controller:another', ArrayController.extend({
    needs: 'posts',
    modelBinding: 'controllers.posts'
  }));

  registry.register('controller:posts', ArrayController.extend());

  container.lookup('controller:posts').set('model', A(['a', 'b', 'c']));

  deepEqual(['a', 'b', 'c'], container.lookup('controller:other').toArray());
  deepEqual(['a', 'b', 'c'], container.lookup('controller:another').toArray());
});

QUnit.test('raises if trying to get a controller that was not pre-defined in `needs`', function() {
  var registry = new Registry();
  var container = registry.container();

  registry.register('controller:foo', Controller.extend());
  registry.register('controller:bar', Controller.extend({
    needs: 'foo'
  }));

  var fooController = container.lookup('controller:foo');
  var barController = container.lookup('controller:bar');

  throws(function() {
    fooController.get('controllers.bar');
  }, /#needs does not include `bar`/,
  'throws if controllers is accesed but needs not defined');

  equal(barController.get('controllers.foo'), fooController, 'correctly needed controllers should continue to work');

  throws(function() {
    barController.get('controllers.baz');
  }, /#needs does not include `baz`/,
  'should throw if no such controller was needed');
});

QUnit.test('setting the value of a controller dependency should not be possible', function() {
  var registry = new Registry();
  var container = registry.container();

  registry.register('controller:post', Controller.extend({
    needs: 'posts'
  }));

  registry.register('controller:posts', Controller.extend());

  var postController = container.lookup('controller:post');
  container.lookup('controller:posts');

  throws(function() {
    postController.set('controllers.posts', 'epic-self-troll');
  },
  /You cannot overwrite the value of `controllers.posts` of .+/,
  'should raise when attempting to set the value of a controller dependency property');

  postController.set('controllers.posts.title', 'A Troll\'s Life');
  equal(postController.get('controllers.posts.title'), 'A Troll\'s Life', 'can set the value of controllers.posts.title');
});

QUnit.test('raises if a dependency with a period is requested', function() {
  var registry = new Registry();
  var container = registry.container();

  registry.register('controller:big.bird', Controller.extend());
  registry.register('controller:foo', Controller.extend({
    needs: 'big.bird'
  }));

  expectAssertion(function() {
    container.lookup('controller:foo');
  }, /needs must not specify dependencies with periods in their names \(big\.bird\)/,
  'throws if periods used');
});

QUnit.test('can unit test controllers with `needs` dependencies by stubbing their `controllers` properties', function() {
  expect(1);

  var BrotherController = Controller.extend({
    needs: 'sister',
    foo: computed.alias('controllers.sister.foo')
  });

  var broController = BrotherController.create({
    controllers: {
      sister: { foo: 5 }
    }
  });

  equal(broController.get('foo'), 5, '`needs` dependencies can be stubbed');
});

