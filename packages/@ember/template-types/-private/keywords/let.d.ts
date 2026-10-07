import { ComponentReturn, DirectInvokable } from '../integration';

export type LetKeyword = DirectInvokable<{
  <T extends unknown[]>(
    ...values: T
  ): ComponentReturn<{
    default: T;
  }>;
}>;
