import { RenderingTest, moduleFor } from '../../utils/test-case';
import { runDestroy } from 'ember-runtime/tests/utils';
import { set } from 'ember-metal/property_set';

let assert = QUnit.assert;

moduleFor('Helpers test: custom helpers', class extends RenderingTest {

  ['@test it can resolve custom simple helpers with or without dashes']() {
    this.registerHelper('hello', () => 'hello');
    this.registerHelper('hello-world', () => 'hello world');

    this.render('{{hello}} | {{hello-world}}');

    this.assertText('hello | hello world');

    this.runTask(() => this.rerender());

    this.assertText('hello | hello world');
  }

  ['@test it can resolve custom class-based helpers with or without dashes']() {
    this.registerHelper('hello', {
      compute() {
        return 'hello';
      }
    });

    this.registerHelper('hello-world', {
      compute() {
        return 'hello world';
      }
    });

    this.render('{{hello}} | {{hello-world}}');

    this.assertText('hello | hello world');

    this.runTask(() => this.rerender());

    this.assertText('hello | hello world');
  }

  ['@test class-based helper can recompute a new value']() {
    let destroyCount = 0;
    let computeCount = 0;
    let helper;

    this.registerHelper('hello-world', {
      init() {
        this._super(...arguments);
        helper = this;
      },
      compute() {
        return ++computeCount;
      },
      destroy() {
        destroyCount++;
        this._super();
      }
    });

    this.render('{{hello-world}}');

    this.assertText('1');

    this.runTask(() => this.rerender());

    this.assertText('1');

    this.runTask(() => helper.recompute());

    this.assertText('2');

    assert.strictEqual(destroyCount, 0, 'destroy is not called on recomputation');
  }

  ['@test class-based helper with static arguments can recompute a new value']() {
    let destroyCount = 0;
    let computeCount = 0;
    let helper;

    this.registerHelper('hello-world', {
      init() {
        this._super(...arguments);
        helper = this;
      },
      compute() {
        return ++computeCount;
      },
      destroy() {
        destroyCount++;
        this._super();
      }
    });

    this.render('{{hello-world "whut"}}');

    this.assertText('1');

    this.runTask(() => this.rerender());

    this.assertText('1');

    this.runTask(() => helper.recompute());

    this.assertText('2');

    assert.strictEqual(destroyCount, 0, 'destroy is not called on recomputation');
  }

  ['@test simple helper is called for param changes']() {
    let computeCount = 0;

    this.registerHelper('hello-world', ([value]) => {
      computeCount++;
      return `${value}-value`;
    });

    this.render('{{hello-world model.name}}', {
      model: { name: 'bob' }
    });

    this.assertText('bob-value');

    assert.strictEqual(computeCount, 1, 'compute is called exactly 1 time');

    this.runTask(() => this.rerender());

    this.assertText('bob-value');

    assert.strictEqual(computeCount, 1, 'compute is called exactly 1 time');

    this.runTask(() => set(this.context, 'model.name', 'sal'));

    this.assertText('sal-value');

    assert.strictEqual(computeCount, 2, 'compute is called exactly 2 times');

    this.runTask(() => set(this.context, 'model', { name: 'bob' }));

    this.assertText('bob-value');

    assert.strictEqual(computeCount, 3, 'compute is called exactly 3 times');
  }

  ['@test class-based helper compute is called for param changes']() {
    let createCount = 0;
    let computeCount = 0;

    this.registerHelper('hello-world', {
      init() {
        this._super(...arguments);
        createCount++;
      },
      compute([value]) {
        computeCount++;
        return `${value}-value`;
      }
    });

    this.render('{{hello-world model.name}}', {
      model: { name: 'bob' }
    });

    this.assertText('bob-value');

    assert.strictEqual(computeCount, 1, 'compute is called exactly 1 time');

    this.runTask(() => this.rerender());

    this.assertText('bob-value');

    assert.strictEqual(computeCount, 1, 'compute is called exactly 1 time');

    this.runTask(() => set(this.context, 'model.name', 'sal'));

    this.assertText('sal-value');

    assert.strictEqual(computeCount, 2, 'compute is called exactly 2 times');

    this.runTask(() => set(this.context, 'model', { name: 'bob' }));

    this.assertText('bob-value');

    assert.strictEqual(computeCount, 3, 'compute is called exactly 3 times');
    assert.strictEqual(createCount, 1, 'helper is only created once');
  }

  ['@test simple helper receives params, hash']() {
    this.registerHelper('hello-world', (_params, _hash) => {
      return `params: ${JSON.stringify(_params)}, hash: ${JSON.stringify(_hash)}`;
    });

    this.render('{{hello-world model.name "rich" first=model.age last="sam"}}', {
      model: {
        name: 'bob',
        age: 42
      }
    });

    this.assertText('params: ["bob","rich"], hash: {"first":42,"last":"sam"}');

    this.runTask(() => this.rerender());

    this.assertText('params: ["bob","rich"], hash: {"first":42,"last":"sam"}');

    this.runTask(() => set(this.context, 'model.name', 'sal'));

    this.assertText('params: ["sal","rich"], hash: {"first":42,"last":"sam"}');

    this.runTask(() => set(this.context, 'model.age', 28));

    this.assertText('params: ["sal","rich"], hash: {"first":28,"last":"sam"}');

    this.runTask(() => set(this.context, 'model', { name: 'bob', age: 42 }));

    this.assertText('params: ["bob","rich"], hash: {"first":42,"last":"sam"}');
  }

  ['@test class-based helper receives params, hash']() {
    this.registerHelper('hello-world', {
      compute(_params, _hash) {
        return `params: ${JSON.stringify(_params)}, hash: ${JSON.stringify(_hash)}`;
      }
    });

    this.render('{{hello-world model.name "rich" first=model.age last="sam"}}', {
      model: {
        name: 'bob',
        age: 42
      }
    });

    this.assertText('params: ["bob","rich"], hash: {"first":42,"last":"sam"}');

    this.runTask(() => this.rerender());

    this.assertText('params: ["bob","rich"], hash: {"first":42,"last":"sam"}');

    this.runTask(() => set(this.context, 'model.name', 'sal'));

    this.assertText('params: ["sal","rich"], hash: {"first":42,"last":"sam"}');

    this.runTask(() => set(this.context, 'model.age', 28));

    this.assertText('params: ["sal","rich"], hash: {"first":28,"last":"sam"}');

    this.runTask(() => set(this.context, 'model', { name: 'bob', age: 42 }));

    this.assertText('params: ["bob","rich"], hash: {"first":42,"last":"sam"}');
  }

  ['@test class-based helper usable in subexpressions']() {
    this.registerHelper('join-words', {
      compute(params) {
        return params.join(' ');
      }
    });

    this.render(
      `{{join-words "Who"
                   (join-words "overcomes" "by")
                   model.reason
                   (join-words (join-words "hath overcome but" "half"))
                   (join-words "his" (join-words "foe"))}}`, {
      model: { reason: 'force' }
    });

    this.assertText('Who overcomes by force hath overcome but half his foe');

    this.runTask(() => this.rerender());

    this.assertText('Who overcomes by force hath overcome but half his foe');

    this.runTask(() => set(this.context, 'model.reason', 'Nickleback'));

    this.assertText('Who overcomes by Nickleback hath overcome but half his foe');

    this.runTask(() => set(this.context, 'model', { reason: 'force' }));

    this.assertText('Who overcomes by force hath overcome but half his foe');
  }

  ['@test simple helper not usable with a block']() {
    this.registerHelper('some-helper', () => {});

    expectAssertion(() => {
      this.render(`{{#some-helper}}{{/some-helper}}`);
    }, /Helpers may not be used in the block form/);
  }

  ['@htmlbars class-based helper not usable with a block']() {
    this.registerHelper('some-helper', {
      compute() {
      }
    });

    expectAssertion(() => {
      this.render(`{{#some-helper}}{{/some-helper}}`);
    }, /Helpers may not be used in the block form/);
  }

  ['@htmlbars simple helper not usable within element']() {
    this.registerHelper('some-helper', () => {});

    expectAssertion(() => {
      this.render(`<div {{some-helper}}></div>`);
    }, /Helpers may not be used in the element form/);
  }

  ['@htmlbars class-based helper not usable within element']() {
    this.registerHelper('some-helper', {
      compute() {
      }
    });

    expectAssertion(() => {
      this.render(`<div {{some-helper}}></div>`);
    }, /Helpers may not be used in the element form/);
  }

  ['@htmlbars class-based helper is torn down']() {
    let destroyCalled = 0;

    this.registerHelper('some-helper', {
      destroy() {
        destroyCalled++;
        this._super(...arguments);
      },
      compute() {
        return 'must define a compute';
      }
    });

    this.render(`{{some-helper}}`);

    runDestroy(this.component);

    assert.strictEqual(destroyCalled, 1, 'destroy called once');
  }

  ['@test class-based helper used in subexpression can recompute']() {
    let helper;
    let phrase = 'overcomes by';

    this.registerHelper('dynamic-segment', {
      init() {
        this._super(...arguments);
        helper = this;
      },
      compute() {
        return phrase;
      }
    });

    this.registerHelper('join-words', {
      compute(params) {
        return params.join(' ');
      }
    });

    this.render(
      `{{join-words "Who"
                   (dynamic-segment)
                   "force"
                   (join-words (join-words "hath overcome but" "half"))
                   (join-words "his" (join-words "foe"))}}`);

    this.assertText('Who overcomes by force hath overcome but half his foe');

    this.runTask(() => this.rerender());

    this.assertText('Who overcomes by force hath overcome but half his foe');

    phrase = 'believes his';

    this.runTask(() => helper.recompute());

    this.assertText('Who believes his force hath overcome but half his foe');

    phrase = 'overcomes by';

    this.runTask(() => helper.recompute());

    this.assertText('Who overcomes by force hath overcome but half his foe');
  }

  ['@test class-based helper used in subexpression can recompute component']() {
    let helper;
    let phrase = 'overcomes by';

    this.registerHelper('dynamic-segment', {
      init() {
        this._super(...arguments);
        helper = this;
      },
      compute() {
        return phrase;
      }
    });

    this.registerHelper('join-words', {
      compute(params) {
        return params.join(' ');
      }
    });

    this.registerComponent('some-component', {
      template: '{{first}} {{second}} {{third}} {{fourth}} {{fifth}}'
    });

    this.render(
      `{{some-component first="Who"
                   second=(dynamic-segment)
                   third="force"
                   fourth=(join-words (join-words "hath overcome but" "half"))
                   fifth=(join-words "his" (join-words "foe"))}}`);

    this.assertText('Who overcomes by force hath overcome but half his foe');

    this.runTask(() => this.rerender());

    this.assertText('Who overcomes by force hath overcome but half his foe');

    phrase = 'believes his';

    this.runTask(() => helper.recompute());

    this.assertText('Who believes his force hath overcome but half his foe');

    phrase = 'overcomes by';

    this.runTask(() => helper.recompute());

    this.assertText('Who overcomes by force hath overcome but half his foe');
  }

  ['@htmlbars class-based helper used in subexpression is destroyed']() {
    let destroyCount = 0;

    this.registerHelper('dynamic-segment', {
      phrase: 'overcomes by',
      init() {
        this._super(...arguments);
      },
      compute() {
        return this.phrase;
      },
      destroy() {
        destroyCount++;
        this._super(...arguments);
      }
    });

    this.registerHelper('join-words', {
      compute(params) {
        return params.join(' ');
      }
    });

    this.render(
      `{{join-words "Who"
                   (dynamic-segment)
                   "force"
                   (join-words (join-words "hath overcome but" "half"))
                   (join-words "his" (join-words "foe"))}}`);

    runDestroy(this.component);

    equal(destroyCount, 1, 'destroy is called after a view is destroyed');
  }

});
