import { ComponentLike } from '../index';

export type InElementKeyword = ComponentLike<{
  Args: {
    Positional: [element: ShadowRoot | Element];
    Named: {
      insertBefore?: null | undefined;
    };
  };
  Blocks: {
    default: [];
  };
}>;
