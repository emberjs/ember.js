import { RenderingTest, moduleFor } from '../utils/test-case';
import { set } from 'ember-metal';
import { strip } from '../utils/abstract-test-case';

moduleFor('SVG element tests', class extends RenderingTest {
  ['@test unquoted viewBox property is output'](assert) {
    let viewBoxString = '0 0 100 100';

    this.render('<div><svg viewBox={{model.viewBoxString}}></svg></div>', {
      model: {
        viewBoxString
      }
    });

    this.assertInnerHTML(strip`
      <div>
        <svg viewBox="${viewBoxString}"></svg>
      </div>
    `);

    this.runTask(() => this.rerender());

    this.assertInnerHTML(strip`
      <div>
        <svg viewBox="${viewBoxString}"></svg>
      </div>
    `);

    this.runTask(() => set(this.context, 'model.viewBoxString', null));

    assert.equal(this.firstChild.getAttribute('svg'), null);

    this.runTask(() => set(this.context, 'model', { viewBoxString }));

    this.assertInnerHTML(strip`
      <div>
        <svg viewBox="${viewBoxString}"></svg>
      </div>
    `);
  }

  ['@test quoted viewBox property is output'](assert) {
    let viewBoxString = '0 0 100 100';

    this.render('<div><svg viewBox="{{model.viewBoxString}}"></svg></div>', {
      model: {
        viewBoxString
      }
    });

    this.assertInnerHTML(strip`
      <div>
        <svg viewBox="${viewBoxString}"></svg>
      </div>
    `);

    this.runTask(() => this.rerender());

    this.assertInnerHTML(strip`
      <div>
        <svg viewBox="${viewBoxString}"></svg>
      </div>
    `);

    this.runTask(() => set(this.context, 'model.viewBoxString', null));

    assert.equal(this.firstChild.getAttribute('svg'), null);

    this.runTask(() => set(this.context, 'model', { viewBoxString }));

    this.assertInnerHTML(strip`
      <div>
        <svg viewBox="${viewBoxString}"></svg>
      </div>
    `);
  }

  ['@test quoted viewBox property is concat']() {
    let viewBoxString = '100 100';

    this.render('<div><svg viewBox="0 0 {{model.viewBoxString}}"></svg></div>', {
      model: {
        viewBoxString
      }
    });

    this.assertInnerHTML(strip`
      <div>
        <svg viewBox="0 0 ${viewBoxString}"></svg>
      </div>
    `);

    this.runTask(() => this.rerender());

    this.assertInnerHTML(strip`
      <div>
        <svg viewBox="0 0 ${viewBoxString}"></svg>
      </div>
    `);

    this.runTask(() => set(this.context, 'model.viewBoxString', '200 200'));

    this.assertInnerHTML(strip`
      <div>
        <svg viewBox="0 0 200 200"></svg>
      </div>
    `);

    this.runTask(() => set(this.context, 'model', { viewBoxString }));

    this.assertInnerHTML(strip`
      <div>
        <svg viewBox="0 0 ${viewBoxString}"></svg>
      </div>
    `);
  }

  ['@test class is output']() {
    this.render('<div><svg class=\'{{model.color}} tall\'></svg></div>', {
      model: {
        color: 'blue'
      }
    });

    this.assertInnerHTML(strip`
      <div>
        <svg class="blue tall"></svg>
      </div>
    `);

    this.runTask(() => this.rerender());

    this.assertInnerHTML(strip`
      <div>
        <svg class="blue tall"></svg>
      </div>
    `);

    this.runTask(() => set(this.context, 'model.color', 'yellow'));

    this.assertInnerHTML(strip`
      <div>
        <svg class="yellow tall"></svg>
      </div>
    `);

    this.runTask(() => set(this.context, 'model', { color: 'blue' }));

    this.assertInnerHTML(strip`
      <div>
        <svg class="blue tall"></svg>
      </div>
    `);
  }
});
