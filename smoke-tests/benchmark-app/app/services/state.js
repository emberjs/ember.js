import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { trackedArray } from '@ember/reactive/collections';

import { run, runLots, add, update, swapRows, deleteRow } from './utils.js';

export default class State extends Service {
  data = new trackedArray();
  id = 1;
  @tracked selected;

  create = () => {
    let id = this.id;
    const result = run(id);

    this.id = result.id;
    this.data.length = 0;

    this.data.push(...result.data);
    this.selected = undefined;
  };

  add = () => {
    let result = add(this.id);
    this.data.push(...result.data);
    this.id = result.id;
  };

  update = () => {
    update(this.data);
  };

  runLots = () => {
    const result = runLots(this.id);

    this.data.length = 0;
    this.data.push(...result.data);
    this.id = result.id;
    this.selected = undefined;
  };

  clear = () => {
    this.data.length = 0;
    this.selected = undefined;
  };

  swapRows = () => {
    swapRows(this.data);
  };

  remove = ({ id }) => {
    let idx = this.data.findIndex((d) => d.id === id);
    this.data.splice(idx, 1);
  };

  select = ({ id }) => {
    this.selected = id;
  };

  isSelected = ({ id }) => {
    return this.selected === id;
  };
}