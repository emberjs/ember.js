import { templateFactory } from '@glimmer/opcode-compiler';
import { setComponentTemplate } from '@glimmer/manager';
import ApplicationTemplate from './Application.hbs';

export default class Application {
  constructor(args) {
    this.args = args;

    /** @type {Item | null} */
    let lastSelected = null;
    /**
     * @param {Item} item
     */
    this.select = (item) => {
      if (lastSelected !== item && lastSelected !== null) {
        lastSelected.selected = false;
      }
      lastSelected = item;
      item.selected = true;
    };
  }
}

setComponentTemplate(templateFactory(ApplicationTemplate), Application);

/** @typedef {import('../utils/data').Item} Item */
