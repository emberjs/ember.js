export default class Application {
  /**
   * @param {Readonly<Record<string, any>>} args
   */
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

/** @typedef {import('../utils/data').Item} Item */
