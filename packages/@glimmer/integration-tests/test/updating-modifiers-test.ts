import { RenderTest, test, jitSuite } from '..';
import { SimpleElement } from '@simple-dom/interface';
import { assert } from './support';

function makeSyncDataAttrModifier(hooks: string[]) {
  return class SyncDataAttrModifier {
    element!: SimpleElement;
    didInsertElement([param]: string[]) {
      this.element.setAttribute('data-modifier', `installed - ${param}`);
      hooks.push('didInsertElement');
    }

    didUpdate([param]: string[]) {
      this.element.setAttribute('data-modifier', `updated - ${param}`);
      hooks.push('didUpdate');
    }

    willDestroyElement() {
      hooks.push('willDestroyElement');
    }
  };
}

class UpdatingModifiers extends RenderTest {
  static suiteName = 'Updating Element Modifier';

  @test
  'Updating a element modifier'() {
    let hooks: string[] = [];

    this.registerModifier('foo', makeSyncDataAttrModifier(hooks));

    this.render('<div><div {{foo bar baz=fizz}}></div></div>', {
      bar: 'Super Metroid',
    });

    this.assertHTML(
      '<div><div data-modifier="installed - Super Metroid"></div></div>',
      'initial render'
    );
    assert.deepEqual(hooks, ['didInsertElement'], 'hooks fired correctly on initial render');

    this.rerender();

    this.assertHTML(
      '<div><div data-modifier="installed - Super Metroid"></div></div>',
      'modifier updated'
    );
    assert.deepEqual(hooks, ['didInsertElement'], 'hooks not fired on rerender without changes');

    this.rerender({ bar: 'Super Mario' });
    this.assertHTML('<div><div data-modifier="updated - Super Mario"></div></div>', 'no change');
    assert.deepEqual(hooks, ['didInsertElement', 'didUpdate'], 'hooks fired correctly on rerender');
  }

  @test
  "Const input doesn't trigger update in a element modifier"() {
    let hooks: string[] = [];

    this.registerModifier('foo', makeSyncDataAttrModifier(hooks));

    this.render('<div><div {{foo "bar"}}></div></div>', {});
    this.assertHTML('<div><div data-modifier="installed - bar"></div></div>', 'initial render');
    assert.deepEqual(hooks, ['didInsertElement'], 'hooks fired correctly on initial render');

    this.rerender();

    this.assertHTML('<div><div data-modifier="installed - bar"></div></div>', 'no change');
    assert.deepEqual(hooks, ['didInsertElement'], 'hooks fired correctly on update');
  }

  @test
  'Destructor is triggered on element modifiers'() {
    let hooks: string[] = [];

    this.registerModifier('foo', makeSyncDataAttrModifier(hooks));

    this.render('{{#if bar}}<div {{foo bar}}></div>{{else}}<div></div>{{/if}}', {
      bar: true,
    });

    this.assertHTML('<div data-modifier="installed - true"></div>', 'initial render');
    assert.deepEqual(hooks, ['didInsertElement'], 'hooks fired correctly on initial render');

    this.rerender({ bar: false });

    this.assertHTML('<div></div>', 'no more modifier');
    assert.deepEqual(
      hooks,
      ['didInsertElement', 'willDestroyElement'],
      'hooks fired correctly on rerender'
    );

    this.rerender({ bar: true });

    this.assertHTML('<div data-modifier="installed - true"></div>', 'back to default render');
    assert.deepEqual(
      hooks,
      ['didInsertElement', 'willDestroyElement', 'didInsertElement'],
      'hooks fired correctly on rerender'
    );
  }
}

jitSuite(UpdatingModifiers);
