import GlimmerComponent from '@glimmer/component';
import {
  defineComponent,
  jitSuite,
  RenderTest,
  test,
  trackedObj,
} from '@glimmer-workspace/integration-tests';

class HelperManagerTest extends RenderTest {
  static suiteName = 'Helper Managers';

  @test
  '(Default Helper Manager) plain functions work as helpers'(assert: Assert) {
    let count = 0;

    const hello = () => {
      count++;
      return 'plain function';
    };

    const Main = defineComponent({ hello }, '{{hello}}');

    this.renderComponent(Main);

    assert.strictEqual(count, 1, 'rendered once');
    this.assertHTML('plain function');

    this.rerender();

    assert.strictEqual(count, 1, 'rendered once');
    this.assertHTML('plain function');
  }

  @test
  '(Default Helper Manager) plain functions passed as component arguments work as helpers'(
    assert: Assert
  ) {
    let count = 0;

    const hello = () => {
      count++;
      return 'plain function';
    };

    const Main = defineComponent({}, '{{(@hello)}}');

    this.renderComponent(Main, {
      hello,
    });

    assert.strictEqual(count, 1, 'rendered once');
    this.assertHTML('plain function');

    this.rerender();

    assert.strictEqual(count, 1, 'rendered once');
    this.assertHTML('plain function');
  }

  @test
  '(Default Helper Manager) plain functions stored on component class properties work as helpers'(
    assert: Assert
  ) {
    let count = 0;

    const Main = defineComponent({}, '{{(this.hello)}}', {
      definition: class extends GlimmerComponent {
        hello = () => {
          count++;
          return 'plain function';
        };
      },
    });

    this.renderComponent(Main);

    assert.strictEqual(count, 1, 'rendered once');
    this.assertHTML('plain function');

    this.rerender();

    assert.strictEqual(count, 1, 'rendered once');
    this.assertHTML('plain function');
  }

  @test
  '(Default Helper Manager) plain functions track positional args'(assert: Assert) {
    let count = 0;

    let obj = (x: string) => {
      count++;
      return x;
    };
    let args = trackedObj({ value: 'hello', unused: 'unused' });

    this.renderComponent(defineComponent({ obj }, '{{obj @value @unused}}'), args);

    assert.strictEqual(count, 1, 'rendered once');
    this.assertHTML('hello');

    args['value'] = 'there';
    this.rerender();

    assert.strictEqual(count, 2, 'rendered twice');
    this.assertHTML('there');

    args['unused'] = 'unused2';
    this.rerender();

    assert.strictEqual(count, 3, 'rendered thrice');
    this.assertHTML('there');
  }

  @test
  '(Default Helper Manager) plain functions entangle with any tracked data'(assert: Assert) {
    let count = 0;
    let trackedState = trackedObj({ value: 'hello' });

    let obj = () => {
      count++;
      return trackedState['value'];
    };

    this.renderComponent(defineComponent({ obj }, '{{obj}}'));

    assert.strictEqual(count, 1, 'rendered once');
    this.assertHTML('hello');

    trackedState['value'] = 'there';
    this.rerender();
    this.assertHTML('there');
    assert.strictEqual(count, 2, 'rendered twice');
  }

  @test
  '(Default Helper Manager) plain functions do not track unused named args'(assert: Assert) {
    let count = 0;

    let obj = (x: string, _options: Record<string, unknown>) => {
      count++;
      return x;
    };
    let args = trackedObj({ value: 'hello', unused: 'unused' });

    this.renderComponent(defineComponent({ obj }, '{{obj @value namedOpt=@unused}}'), args);
    assert.strictEqual(count, 1, 'rendered once');
    this.assertHTML('hello');

    args['unused'] = 'unused2';
    this.rerender();

    assert.strictEqual(count, 1, 'rendered once');
    this.assertHTML('hello');
  }

  @test
  '(Default Helper Manager) plain functions tracked used named args'(assert: Assert) {
    let count = 0;

    let obj = (_x: string, options: Record<string, unknown>) => {
      count++;
      return options['namedOpt'];
    };

    let args = trackedObj({ value: 'hello', used: 'used' });

    this.renderComponent(defineComponent({ obj }, '{{obj @value namedOpt=@used}}'), args);
    assert.strictEqual(count, 1, 'rendered once');
    this.assertHTML('used');

    args['used'] = 'there';
    this.rerender();

    assert.strictEqual(count, 2, 'rendered twice');
    this.assertHTML('there');
  }

  @test
  '(Default Helper Manager) plain function helpers can have default values (missing data)'(
    assert: Assert
  ) {
    let count = 0;
    let obj = (x = 'default value') => {
      count++;
      return x;
    };

    let args = trackedObj({});

    this.renderComponent(defineComponent({ obj }, 'result: {{obj}}'), args);
    this.assertHTML('result: default value');
    assert.strictEqual(count, 1, 'rendered once');
  }

  @test
  '(Default Helper Manager) plain function helpers can have overwritten default values'(
    assert: Assert
  ) {
    let count = 0;
    let obj = (x = 'default value') => {
      count++;
      return x;
    };

    let args = trackedObj({ value: undefined });

    this.renderComponent(defineComponent({ obj }, 'result: {{obj @value}}'), args);
    this.assertHTML('result: default value');
    assert.strictEqual(count, 1, 'rendered once');

    args['value'] = 'value';
    this.rerender();

    this.assertHTML('result: value');
    assert.strictEqual(count, 2, 'rendered twice');
  }
}

jitSuite(HelperManagerTest);
