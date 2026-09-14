import { ComponentLike } from '../index';

export type WithKeyword = abstract new <T>() => InstanceType<
  ComponentLike<{
    Args: {
      Positional: [value: T];
    };
    Blocks: {
      default: [value: T];
      else: [];
    };
  }>
>;
