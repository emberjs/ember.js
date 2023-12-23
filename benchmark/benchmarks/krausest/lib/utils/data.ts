import { createCell } from '@glimmer-workspace/benchmark-env';

export class Item {
  /** @type {number} */
  id;

  /** @type {string} */
  _label = createCell(this, 'label', '');

  _selected = createCell(this, 'selected', false);

  constructor(id: number, label: string) {
    this.id = id;
    this.label = label;
  }
  get label() {
    return this._label.get();
  }
  set label(value: string) {
    this._label.set(value);
  }
  get selected() {
    return this._selected.get();
  }

  set selected(value) {
    this._selected.set(value);
  }
}

function _random(max: number) {
  return (Math.random() * max) | 0;
}

let rowId = 1;

export function buildData(count = 1000) {
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

export const swapRows = (data: Item[]): Item[] => {
  const newData: Item[] = [...data];
  if (newData.length > 998) {
    const temp = newData[1];
    newData[1] = newData[998] as Item;
    newData[998] = temp as Item;
  }
  return newData;
};

export const updateData = (data: Item[], mod = 10): Item[] => {
  for (let i = 0; i < data.length; i += mod) {
    let item = data[i] as Item;
    item.label = item.label + ' !!!';
  }
  return data;
};
