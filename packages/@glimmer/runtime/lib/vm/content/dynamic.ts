import Environment from '../../environment';
import Bounds, { clear } from '../../bounds';
import { Opaque, Simple, Option } from "@glimmer/interfaces";
import { NewElementBuilder } from '../element-builder';

export interface DynamicContent {
  bounds: Bounds;
  update(env: Environment, value: Opaque): DynamicContent;
}

export default abstract class DynamicContentBase implements DynamicContent {
  constructor(protected trusting: boolean) {}

  abstract update(env: Environment, value: Opaque): DynamicContent;

  public abstract bounds: Bounds;

  protected retry(env: Environment, value: Opaque): DynamicContent {
    let { bounds } = this;
    let parentElement = bounds.parentElement();
    let nextSibling = clear(bounds);

    let stack = new NewElementBuilder(env, parentElement, nextSibling);

    if (this.trusting) {
      return stack.__appendTrustingDynamicContent(value);
    } else {
      return stack.__appendCautiousDynamicContent(value);
    }
  }
}

export class DynamicContentWrapper implements DynamicContent, Bounds {
  parentElement(): Simple.Element {
    return this.bounds.parentElement();
  }

  firstNode(): Option<Simple.Node> {
    return this.bounds.firstNode();
  }

  lastNode(): Option<Simple.Node> {
    return this.bounds.lastNode();
  }

  public bounds: Bounds;

  constructor(private inner: DynamicContent) {
    this.bounds = inner.bounds;
  }

  update(env: Environment, value: Opaque): DynamicContentWrapper {
    let inner = this.inner = this.inner.update(env, value);
    this.bounds = inner.bounds;
    return this;
  }
}
