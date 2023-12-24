import type { Item } from '@/utils/data';

type RowArgs = {
  item: Item;
  select: () => void;
  remove: (item: Item) => void;
};

export default class Row {
  args!: RowArgs;
  constructor(args: RowArgs) {
    this.args = args;
  }
  onRemove = () => {
    this.args.remove(this.args.item);
  };
  onSelect = () => {
    this.args.select();
  };
}
