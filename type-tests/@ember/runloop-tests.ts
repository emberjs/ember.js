import {
  run,
  begin,
  bind,
  cancel,
  debounce,
  end,
  join,
  later,
  next,
  once,
  schedule,
  scheduleOnce,
  throttle,
  // private, supported via `declare module` below
  _backburner,
} from '@ember/runloop';
import EmberObject, { action } from '@ember/object';
import { AnyFn, MethodsOf } from '@ember/-internals/utility-types';
import { expectTypeOf } from 'expect-type';

function testRun() {
  run(() => {
    // code to be executed within a RunLoop
    return 123;
  });

  // run(target, method)
  run({}, () => {
    // code to be executed within a RunLoop
    return 123;
  });

  // run(target, method, ...args)
  run(
    {},
    (beforeExecute: () => void, extraLog: string, misc: unknown) => {
      // code to be executed within a RunLoop
      beforeExecute();
      console.log(extraLog);
      console.info(misc);
      return 123;
    },
    () => {
      console.log('foo');
    },
    'bar',
    {}
  );

  function destroyApp(application: EmberObject) {
    run(application, 'destroy');
    run(application, function () {
      this.destroy();
    });
  }
}

class TestBind extends EmberObject {
  init() {
    const bound = bind(this, this.setupEditor);
    bound('hello');
    // @ts-expect-error
    bound(123);
    // @ts-expect-error
    bound();

    const boundWithArg = bind(this, this.setupEditor, 'hello');
    boundWithArg();
    // @ts-expect-error
    boundWithArg('hello');
    // @ts-expect-error
    boundWithArg(123);

    // @ts-expect-error
    const badBind = bind(this, this.setupEditor, 123);

    // We would like to make this safe in the same way as the version above,
    // but TS cannot see the string relationship *specifically when doing a
    // lookup against a `this` type*, so we fall back to the comparable types
    // as in `Function.prototype.bind` here.
    const boundAgain = bind(this, 'setupEditor');
    boundAgain('hello');
  }

  editor: string | null = null;

  setupEditor(editor: string) {
    this.set('editor', editor);
  }
}

// We *can* check that it works on a general instance, though.
declare let testBindInstance: TestBind;
let bound = bind(testBindInstance, 'setupEditor');
bound('hello');
// @ts-expect-error
bound(123);
// @ts-expect-error
bound();

let boundWithArg = bind(testBindInstance, 'setupEditor', 'hello');
boundWithArg();
// @ts-expect-error
boundWithArg('hello');
// @ts-expect-error
boundWithArg(123);

// @ts-expect-error
const badBindValue = bind(testBindInstance, testBindInstance.setupEditor, 123);
// This would be *nice* to check, bug it falls into the 'fallback' path.
const badBindString = bind(testBindInstance, 'setupEditor', 123);

function testCancel() {
  const myContext = {
    method(arg: string, another: number): number {
      return arg.length + another;
    },
  };

  cancel(undefined);

  const runNext = next(myContext, () => {
    // will not be executed
  });

  cancel(runNext);

  const anotherRunNext = next(myContext, 'method', 'hello', 123);
  // @ts-expect-error
  const aBadRunNext = next(myContext, 'method', false, 'goodbye');

  const aSimpleNext = next((name: string) => name.length, 'hello');

  const runLater = later(
    myContext,
    () => {
      // will not be executed
    },
    500
  );

  cancel(runLater);

  const runScheduleOnce = scheduleOnce('afterRender', myContext, () => {
    // will not be executed
  });

  cancel(runScheduleOnce);

  const anotherScheduleOnce = scheduleOnce('render', myContext, 'method', 'hello', 123);

  const aBadScheduleOnce =
    // @ts-expect-error
    scheduleOnce('render', myContext, 'method', true, 'boo');

  const runOnce = once(myContext, () => {
    // will not be executed
  });

  cancel(runOnce);

  const throttled = throttle(
    myContext,
    () => {
      // will not be executed
    },
    1,
    false
  );

  cancel(throttled);

  const aGoodThrottled = throttle(myContext, 'method', 'hello', 123, 1_000);
  const anotherGoodThrottled = throttle(myContext, 'method', 'hello', 123, 1_000, true);
  // @ts-expect-error
  const aBadThrottled = throttle(myContext, 'method', 1_000);
  // @ts-expect-error
  const anotherBadThrottled = throttle(myContext, 'method', false, {}, 1_000);

  const debounced = debounce(
    myContext,
    () => {
      // will not be executed
    },
    1
  );

  cancel(debounced);

  const debounceImmediate = debounce(
    myContext,
    () => {
      // will be executed since we passed in true (immediate)
    },
    100,
    true
  );

  // the 100ms delay until this method can be called again will be canceled
  cancel(debounceImmediate);
}

function testDebounce() {
  function runIt() {}

  const myContext = { name: 'debounce' };

  debounce(runIt, 150);
  debounce(myContext, runIt, 150);
  debounce(myContext, runIt, 150, true);

  class DebounceExample extends EmberObject {
    searchValue = 'test';
    fetchResults(value: string) {}

    @action
    handleTyping() {
      // the fetchResults function is passed into the component from its parent
      debounce(this, this.fetchResults, this.searchValue, 250);
    }
  }

  EmberObject.extend({
    searchValue: 'test',
    fetchResults(value: string) {},
  });
}

function testBegin() {
  begin();
  // code to be executed within a RunLoop
  end();
}

function testJoin() {
  join(() => {
    // creates a new run-loop
  });

  run(() => {
    // creates a new run-loop
    join(() => {
      // joins with the existing run-loop, and queues for invocation on
      // the existing run-loops action queue.
    });
  });

  later(() => {
    console.log({ msg: 'Hold Your Horses' });
  }, 3000);
}

function testLater() {
  const myContext = {};
  later(
    myContext,
    () => {
      // code here will execute within a RunLoop in about 500ms with this == myContext
    },
    500
  );
}

function testNext() {
  const myContext = {};
  next(myContext, () => {
    // code to be executed in the next run loop,
    // which will be scheduled after the current one
  });
  next(() => {
    // code to be executed in the next run loop,
    // which will be scheduled after the current one
  });
}

class TestOnce extends EmberObject {
  init() {
    once(this as TestOnce, 'processFullName');
    once(this, this.processFullName);
  }

  processFullName() {}
}

function testSchedule() {
  EmberObject.extend({
    init() {
      schedule('sync', this, () => {
        // this will be executed in the first RunLoop queue, when bindings are synced
        console.log('scheduled on sync queue');
      });

      schedule('actions', this, () => {
        // this will be executed in the 'actions' queue, after bindings have synced.
        console.log('scheduled on actions queue');
      });
    },
  });

  schedule('actions', () => {
    // Do more things
  });
}

function testScheduleOnce() {
  function sayHi() {
    console.log('hi');
  }

  const myContext = {};
  run(() => {
    scheduleOnce('afterRender', myContext, sayHi);
    scheduleOnce('afterRender', myContext, sayHi);
    // sayHi will only be executed once, in the afterRender queue of the RunLoop
  });
  scheduleOnce('actions', myContext, () => {
    console.log('Closure');
  });
}

function testThrottle() {
  function runIt() {}

  const myContext = { name: 'throttle' };

  throttle(runIt, 150);
  throttle(myContext, runIt, 150);
}
