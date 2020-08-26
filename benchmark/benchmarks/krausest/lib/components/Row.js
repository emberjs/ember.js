export default class Row {
  constructor(args) {
    this.args = args;
    this.onSelect = () => {
      const item = this.args.item;
      const select = this.args.select;
      select(item);
    };
  }
}
