import { swapRows, type Item, updateData, buildData } from '@/utils/data';
import { createCell } from '@glimmer-workspace/benchmark-env';
export default class Application {
  cell!: ReturnType<typeof createCell>;
  lastSelected: Item | null = null;
  constructor() {
    this.cell = createCell(this, 'cell', []);
  }
  get items() {
    return this.cell.get() as Item[];
  }
  set items(value: Item[]) {
    this.cell.set(value);
  }
  select = (item: Item) => {
    if (this.lastSelected !== item && this.lastSelected !== null) {
      this.lastSelected.selected = false;
    }
    this.lastSelected = item;
    item.selected = true;
  };
  create = () => {
    this.items = buildData(1000);
  };
  runLots = () => {
    this.items = buildData(10000);
  };
  add = () => {
    this.items = this.items.concat(buildData(1000));
  };
  update = () => {
    this.items = updateData(this.items);
  };
  clear = () => {
    this.items = [];
  };
  swapRows = () => {
    this.items = swapRows(this.items);
  };
  remove = (item: Item) => {
    this.items = this.items.filter((el) => el !== item);
  };
}
