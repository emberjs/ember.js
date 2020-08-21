export default class Application {
  constructor(args) {
    this.args = args;

    /** @type {Item | null} */
    let lastSelected = null;
    /**
     * @param {Item} item
     */
    this.select = item => {
      if (lastSelected !== item && lastSelected !== null) {
        lastSelected.selected = false;
      }
      lastSelected = item;
      item.selected = true;
    };
  }
}

/** @typedef {import('./data').Item} Item */
