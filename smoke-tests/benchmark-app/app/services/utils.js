import { cell } from './cell.js';

class TodoItem {
  label;
  id;

  constructor(id, label) {
    this.label = cell(label);
    this.id = id;
  }
}

const _random = (max) => {
  return Math.round(Math.random() * 1000) % max;
};

const updateData = (data, mod = 10) => {
  for (let i = 0; i < data.length; i += mod) {
    data[i].label.set(data[i].label.read() + ' !!!');
  }
  return data;
};
var adjectives = [
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
];

var colours = [
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
];

var nouns = [
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
];

export const buildData = (id, count = 1000) => {
  var data = [];

  for (var i = 0; i < count; i++)
    data.push(
      new TodoItem(
        id++,
        adjectives[_random(adjectives.length)] +
          ' ' +
          colours[_random(colours.length)] +
          ' ' +
          nouns[_random(nouns.length)]
      )
    );

  return { data, id };
};

export const add = (id) => {
  return buildData(id, 1000);
};

export const run = (id) => {
  return buildData(id);
};

export const runLots = (id) => {
  return buildData(id, 10000);
};

export const update = (data) => {
  return updateData(data);
};

export const swapRows = (data) => {
  if (data.length > 998) {
    let temp = data[1];
    data[1] = data[998];
    data[998] = temp;
  }
};

export const deleteRow = (data, id) => {
  return data.filter((d) => {
    return d.id !== id;
  });
};