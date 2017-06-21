import DynamicContentBase, { DynamicContent } from './dynamic';
import Bounds from '../../bounds';
import Environment from '../../environment';
import { Opaque, Simple } from "@glimmer/interfaces";

export default class DynamicNodeContent extends DynamicContentBase {
  constructor(public bounds: Bounds, private lastValue: Simple.Node, trusting: boolean) {
    super(trusting);
  }

  update(env: Environment, value: Opaque): DynamicContent {
    let { lastValue } = this;

    if (value === lastValue) return this;

    return this.retry(env, value);
  }
}
