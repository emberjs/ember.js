import { HelperLike } from '../index';

export type HasBlockParamsKeyword = HelperLike<{
  Args: { Positional: [blockName?: string] };
  Return: boolean;
}>;
