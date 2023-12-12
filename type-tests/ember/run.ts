import Ember from 'ember';
import { expectTypeOf } from 'expect-type';

function testRun() {
  const r = Ember.run(() => {
    // code to be executed within a RunLoop
    return 123;
  });
  expectTypeOf(r).toEqualTypeOf<number>();

  function destroyApp(application: Ember.Application) {
    Ember.run(application, 'destroy');
    Ember.run(application, function () {
      this.destroy();
    });
  }
}
