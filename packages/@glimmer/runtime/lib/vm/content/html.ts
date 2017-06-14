import DynamicContentBase, { DynamicContent } from './dynamic';
import Bounds from '../../bounds';
import Environment from '../../environment';
import { isSafeString, SafeString, normalizeTrustedValue } from '../../dom/normalize';
import { Opaque } from "@glimmer/interfaces";

export default class DynamicHTMLContent extends DynamicContentBase {
  constructor(public bounds: Bounds, private lastValue: SafeString, trusted: boolean) {
    super(trusted);
  }

  update(env: Environment, value: Opaque): DynamicContent {
    let { lastValue } = this;

    if (value === lastValue) return this;

    if (isSafeString(value) && isSafeString(lastValue) && value.toHTML() === lastValue.toHTML()) {
      this.lastValue = value;
      return this;
    }

    return this.retry(env, value);
  }
}

export class DynamicTrustedHTMLContent extends DynamicContentBase {
  constructor(public bounds: Bounds, private lastValue: string, trusted: boolean) {
    super(trusted);
  }

  update(env: Environment, value: Opaque): DynamicContent {
    let { lastValue } = this;

    if (typeof value === 'string' && value === lastValue) return this;
    let newValue = normalizeTrustedValue(value);
    if (newValue === lastValue) return this;

    return this.retry(env, value);
  }
}
