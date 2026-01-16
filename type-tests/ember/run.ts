import type Application from '@ember/application';
import { run } from '@ember/runloop';
import { expectTypeOf } from 'expect-type';

function testRun() {
  const r = run(() => {
    // code to be executed within a RunLoop
    return 123;
  });
  expectTypeOf(r).toEqualTypeOf<number>();

  function destroyApp(application: Application) {
    run(application, 'destroy');
    run(application, function () {
      this.destroy();
    });
  }
}
