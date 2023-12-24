import { swapRows, type Item, updateData, buildData } from '@/utils/data';
import { createCell } from '@glimmer-workspace/benchmark-env';
import { fn } from '@glimmer/runtime';
export default class Application {
  cell!: ReturnType<typeof createCell>;
  selectedItemCell!: ReturnType<typeof createCell>;
  constructor() {
    this.cell = createCell(this, 'cell', []);
    this.selectedItemCell = createCell(this, 'selectedItem', null);
  }
  fn = fn;
  eq = (a: Item | null, b: Item | null) => {
    return a === b;
  };
  get selectedItem() {
    return this.selectedItemCell.get() as Item | null;
  }
  set selectedItem(value: Item | null) {
    this.selectedItemCell.set(value);
  }
  get items() {
    return this.cell.get() as Item[];
  }
  set items(value: Item[]) {
    this.cell.set(value);
  }
  select = (item: Item) => {
    this.selectedItem = item;
  };
  create = () => {
    this.items = buildData(1000);
  };
  runLots = () => {
    this.items = buildData(5000);
  };
  add = () => {
    this.items = this.items.concat(buildData(1000));
  };
  update = () => {
    this.items = updateData(this.items);
  };
  clear = () => {
    this.items = [];
    this.selectedItem = null;
  };
  swapRows = () => {
    this.items = swapRows(this.items);
  };
  remove = (item: Item) => {
    this.items = this.items.filter((el) => el !== item);
    if (this.selectedItem === item) {
      this.selectedItem = null;
    }
  };
}
