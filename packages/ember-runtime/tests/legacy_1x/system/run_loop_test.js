import {
  observer as emberObserver,
  run,
  Binding
} from 'ember-metal';
import Observable from '../../../mixins/observable';
import EmberObject from '../../../system/object';

/*
  NOTE: This test is adapted from the 1.x series of unit tests.  The tests
  are the same except for places where we intend to break the API we instead
  validate that we warn the developer appropriately.

  CHANGES FROM 1.6:

  * Updated the API usage for setting up and syncing Binding since these
    are not the APIs this file is testing.

  * Disabled a call to invokeOnce() around line 127 because it appeared to be
    broken anyway.  I don't think it ever even worked.
*/

let MyApp;

QUnit.module('System:run_loop() - chained binding', {
  setup() {
    MyApp = {};
    MyApp.first = EmberObject.extend(Observable).create({
      output: 'MyApp.first'
    });

    MyApp.second = EmberObject.extend(Observable, {
      inputDidChange: emberObserver('input', function() {
        this.set('output', this.get('input'));
      })
    }).create({
      input: 'MyApp.second',
      output: 'MyApp.second'
    });

    MyApp.third = EmberObject.extend(Observable).create({
      input: 'MyApp.third'
    });
  }
});

let deprecationMessage = /`Ember.Binding` is deprecated/;

QUnit.test('Should propagate bindings after the RunLoop completes (using Ember.RunLoop)', function() {
  run(() => {
    //Binding of output of MyApp.first object to input of MyApp.second object
    expectDeprecation(() => {
      Binding.from('first.output')
        .to('second.input').connect(MyApp);
    }, deprecationMessage);

    //Binding of output of MyApp.second object to input of MyApp.third object
    expectDeprecation(() => {
      Binding.from('second.output')
        .to('third.input').connect(MyApp);
    }, deprecationMessage);
  });

  run(() => {
    // Based on the above binding if you change the output of MyApp.first
    // object it should change the all the variable of
    //  MyApp.first,MyApp.second and MyApp.third object
    MyApp.first.set('output', 'change');

    //Changes the output of the MyApp.first object
    equal(MyApp.first.get('output'), 'change');

    //since binding has not taken into effect the value still remains as change.
    equal(MyApp.second.get('output'), 'MyApp.first');
  }); // allows bindings to trigger...

  //Value of the output variable changed to 'change'
  equal(MyApp.first.get('output'), 'change');

  //Since binding triggered after the end loop the value changed to 'change'.
  equal(MyApp.second.get('output'), 'change');
});

QUnit.test('Should propagate bindings after the RunLoop completes', function() {
  run(() => {
    //Binding of output of MyApp.first object to input of MyApp.second object
    expectDeprecation(() => {
      Binding.from('first.output')
        .to('second.input').connect(MyApp);
    }, deprecationMessage);

    //Binding of output of MyApp.second object to input of MyApp.third object
    expectDeprecation(() => {
      Binding.from('second.output')
        .to('third.input').connect(MyApp);
    }, deprecationMessage);
  });

  run(() => {
    //Based on the above binding if you change the output of MyApp.first object it should
    //change the all the variable of MyApp.first,MyApp.second and MyApp.third object
    MyApp.first.set('output', 'change');

    //Changes the output of the MyApp.first object
    equal(MyApp.first.get('output'), 'change');

    //since binding has not taken into effect the value still remains as change.
    equal(MyApp.second.get('output'), 'MyApp.first');
  });

  //Value of the output variable changed to 'change'
  equal(MyApp.first.get('output'), 'change');

  //Since binding triggered after the end loop the value changed to 'change'.
  equal(MyApp.second.get('output'), 'change');
});
