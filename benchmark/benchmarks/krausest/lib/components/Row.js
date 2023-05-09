export default class Row {
  /**
   * @param {Readonly<Record<string, any>> & {item: unknown; select: (item: unknown) => void}} args
   */
  constructor(args) {
    this.args = args;
    this.onSelect = () => {
      const item = this.args.item;
      const select = this.args.select;
      select(item);
    };
  }
}
