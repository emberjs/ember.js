import { createCell } from '@glimmer/benchmark-env';

class Item {
  /** @type {number} */
  id;

  /** @type {string} */
  label;

  // eslint-disable-next-line no-invalid-this
  _selected = createCell(this, 'selected', false);

  /**
   * @param {number} id
   * @param {string} label
   */
  constructor(id, label) {
    this.id = id;
    this.label = label;
  }

  get selected() {
    return this._selected.get();
  }

  set selected(value) {
    this._selected.set(value);
  }
}

function _random(max) {
  // eslint-disable-next-line no-bitwise
  return (Math.random() * max) | 0;
}

let rowId = 1;

export default function buildData(count = 1000) {
  const adjectives = [
      'pretty',
      'large',
      'big',
      'small',
      'tall',
      'short',
      'long',
      'handsome',
      'plain',
      'quaint',
      'clean',
      'elegant',
      'easy',
      'angry',
      'crazy',
      'helpful',
      'mushy',
      'odd',
      'unsightly',
      'adorable',
      'important',
      'inexpensive',
      'cheap',
      'expensive',
      'fancy',
    ],
    colours = [
      'red',
      'yellow',
      'blue',
      'green',
      'pink',
      'brown',
      'purple',
      'brown',
      'white',
      'black',
      'orange',
    ],
    nouns = [
      'table',
      'chair',
      'house',
      'bbq',
      'desk',
      'car',
      'pony',
      'cookie',
      'sandwich',
      'burger',
      'pizza',
      'mouse',
      'keyboard',
    ],
    data = [];
  for (let i = 0; i < count; i++)
    data.push(
      new Item(
        rowId++,
        adjectives[_random(adjectives.length)] +
          ' ' +
          colours[_random(colours.length)] +
          ' ' +
          nouns[_random(nouns.length)]
      )
    );
  return data;
}
