import { HelperLike } from '../index';

export type HasBlockKeyword = HelperLike<{
  Args: { Positional: [blockName?: string] };
  Return: boolean;
}>;
