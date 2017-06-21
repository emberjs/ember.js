import { Blocks, Inlines, populateBuiltins } from "./functions";

export class Macros {
  public blocks: Blocks;
  public inlines: Inlines;

  constructor() {
    let { blocks, inlines } = populateBuiltins();
    this.blocks = blocks;
    this.inlines = inlines;
  }
}
