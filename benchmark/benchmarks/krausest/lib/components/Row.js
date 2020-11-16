import { templateFactory } from '@glimmer/opcode-compiler';
import { setComponentTemplate } from '@glimmer/manager';
import RowTemplate from './Row.hbs';

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

setComponentTemplate(templateFactory(RowTemplate), Row);
