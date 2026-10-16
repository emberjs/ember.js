import { ComponentLike } from '../index';

type ArrayLike<T> = ReadonlyArray<T> | Iterable<T>;

export type EachKeyword = abstract new <T = any>() => InstanceType<
  ComponentLike<{
    Args: {
      Positional: [items: Iterable<T> | null | undefined];
      Named: { key?: string };
    };
    Blocks: {
      default: [T, number];
      else: [];
    };
  }>
>;
