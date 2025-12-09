import { trackedSet } from '@glimmer/validator';
import {
  defineComponent,
  GlimmerishComponent as Component,
  jitSuite,
  RenderTest,
  strip,
  test,
} from '@glimmer-workspace/integration-tests';

class TrackedSetTest extends RenderTest {
  static suiteName = `trackedSet() (rendering)`;

  @test
  'options.equals: default equals does not dirty on no-op changes'(assert: Assert) {
    let key = { foo: '123' };
    const obj = trackedSet([key]);
    const step = () => {
      let str = String(obj.has(key));
      assert.step(str);
      return str;
    };

    const Foo = defineComponent({ step }, '{{(step)}}');

    this.renderComponent(Foo);

    this.assertHTML('true');
    assert.verifySteps(['true']);

    obj.add(key);
    this.rerender();

    this.assertHTML('true');
    this.assertStableRerender();
    assert.verifySteps([]);
  }

  @test
  'options.equals: using equals can dirty on every change'(assert: Assert) {
    let key = { foo: '123' };
    const obj = trackedSet([key], { equals: () => false });
    const step = () => {
      let str = String(obj.has(key));
      assert.step(str);
      return str;
    };

    const Foo = defineComponent({ step }, '{{(step)}}');

    this.renderComponent(Foo);

    this.assertHTML('true');
    assert.verifySteps(['true']);

    obj.add(key);
    this.rerender();

    this.assertHTML('true');
    this.assertStableRerender();
    assert.verifySteps(['true']);
  }

  @test
  'add/has'() {
    this.assertReactivity(
      class extends Component {
        set = trackedSet();

        get value() {
          return this.set.has('foo');
        }

        update() {
          this.set.add('foo');
        }
      }
    );
  }

  @test
  'add/has existing value'() {
    this.assertReactivity(
      class extends Component {
        set = trackedSet(['foo']);

        get value() {
          return this.set.has('foo');
        }

        update() {
          this.set.add('foo');
        }
      },
      false
    );
  }

  @test
  'add/has existing value (with always-dirty)'() {
    this.assertReactivity(
      class extends Component {
        set = trackedSet(['foo'], { equals: () => false });

        get value() {
          return this.set.has('foo');
        }

        update() {
          this.set.add('foo');
        }
      }
    );
  }

  @test
  'add/has unrelated value'() {
    this.assertReactivity(
      class extends Component {
        set = trackedSet();

        get value() {
          return this.set.has('foo');
        }

        update() {
          this.set.add('bar');
        }
      },
      false
    );
  }

  @test
  entries() {
    this.assertReactivity(
      class extends Component {
        set = trackedSet();

        get value() {
          return this.set.entries();
        }

        update() {
          this.set.add('foo');
        }
      }
    );
  }

  @test
  keys() {
    this.assertReactivity(
      class extends Component {
        set = trackedSet();

        get value() {
          return this.set.keys();
        }

        update() {
          this.set.add('foo');
        }
      }
    );
  }

  @test
  values() {
    this.assertReactivity(
      class extends Component {
        set = trackedSet();

        get value() {
          return this.set.values();
        }

        update() {
          this.set.add('foo');
        }
      }
    );
  }

  @test
  forEach() {
    this.assertReactivity(
      class extends Component {
        set = trackedSet();

        get value() {
          this.set.forEach(() => {
            /* no-op */
          });
          return 'test';
        }

        update() {
          this.set.add('foo');
        }
      }
    );
  }

  @test
  size() {
    this.assertReactivity(
      class extends Component {
        set = trackedSet();

        get value() {
          return this.set.size;
        }

        update() {
          this.set.add('foo');
        }
      }
    );
  }

  @test
  delete() {
    this.assertReactivity(
      class extends Component {
        set = trackedSet(['foo', 123]);

        get value() {
          return this.set.has('foo');
        }

        update() {
          this.set.delete('foo');
        }
      }
    );
  }

  @test
  'delete unrelated value'() {
    this.assertReactivity(
      class extends Component {
        set = trackedSet(['foo', 123]);

        get value() {
          return this.set.has('foo');
        }

        update() {
          this.set.delete(123);
        }
      },
      false
    );
  }

  @test
  clear() {
    this.assertReactivity(
      class extends Component {
        set = trackedSet(['foo', 123]);

        get value() {
          return this.set.has('foo');
        }

        update() {
          this.set.clear();
        }
      }
    );
  }

  @test
  'each: add'() {
    this.assertEachReactivity(
      class extends Component {
        collection = trackedSet(['foo', 123]);

        update() {
          this.collection.add('bar');
        }
      }
    );
  }

  @test
  'each: add existing value'() {
    this.assertEachReactivity(
      class extends Component {
        collection = trackedSet(['foo', 123]);

        update() {
          this.collection.add('foo');
        }
      }
    );
  }

  // TODO: These tests are currently unstable on release, turn back on once
  // behavior is fixed
  // eachInReactivityTest(
  //   'add',
  //   class extends Component {
  //     collection = trackedSet(['foo', 123]);
  //     update() {
  //       this.collection.add('bar');
  //     }
  //   }
  // );
  // eachInReactivityTest(
  //   'add existing value',
  //   class extends Component {
  //     collection = trackedSet(['foo', 123]);
  //     update() {
  //       this.collection.add('foo');
  //     }
  //   }
  // );

  /**
   *
   * If any rendered change occurs at all, that's a success
   *
   */
  @test
  union() {
    this.#testIfChange.call(this, {
      op: (a: Set<string>, b: Set<string>) => {
        return a.union(b);
      },
      change: (x: Set<string>) => x.add('another'),
    });
  }

  @test
  intersection() {
    this.#testIfChange.call(this, {
      op: (a: Set<string>, b: Set<string>) => {
        return a.intersection(b);
      },
      change: (x: Set<string>) => x.add('another'),
    });
  }

  @test
  difference() {
    this.#testIfChange.call(this, {
      op: (a: Set<string>, b: Set<string>) => {
        return a.difference(b);
      },
      change: (x: Set<string>) => x.add('another'),
    });
  }

  @test
  symmetricDifference() {
    this.#testIfChange.call(this, {
      op: (a: Set<string>, b: Set<string>) => {
        return a.symmetricDifference(b);
      },
      change: (x: Set<string>) => x.add('another'),
    });
  }

  #testIfChange({
    op,
    change,
  }: {
    change: (x: Set<string>) => void;
    op: (a: Set<string>, b: Set<string>) => Set<string>;
  }) {
    let a = trackedSet(['123']);
    let b = trackedSet(['abc']);

    let renderedSet = new Set<string>();
    let steps: string[] = [];

    function verifySteps(s: string[]) {
      QUnit.assert.deepEqual(steps, s);
      steps = [];
    }
    function stepRecord(set: Set<string>) {
      renderedSet = set;
      steps.push(String(set.size));
    }

    const Foo = defineComponent(
      { stepRecord, op, a, b },
      strip`
        {{#let (op a b) as |c|}}
          {{stepRecord c}}
        {{/let}}
      `
    );

    this.renderComponent(Foo);
    verifySteps([String(renderedSet.size)]);

    change(a);

    this.rerender();
    verifySteps([String(renderedSet.size)]);

    change(b);

    this.rerender();
    verifySteps([String(renderedSet.size)]);
  }
}

jitSuite(TrackedSetTest);
