import { Simple, Option, Opaque } from "@glimmer/interfaces";
import { ElementBuilder } from '../element-builder';
import { Environment } from '../../environment';

export interface Attribute {
  element: Simple.Element;
  name: string;
  namespace: Option<string>;
}

export interface AttributeOperation {
  attribute: Attribute;
  set(dom: ElementBuilder, value: Opaque, env: Environment): void;
  update(value: Opaque, env: Environment): void;
}
