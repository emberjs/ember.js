export type ComponentContent = 0;
export type HelperContent = 1;
export type StringContent = 2;
export type EmptyContent = 3;
export type SafeStringContent = 4;
export type FragmentContent = 5;
export type NodeContent = 6;
export type OtherContent = 8;

export type ContentType =
  | ComponentContent
  | HelperContent
  | StringContent
  | EmptyContent
  | SafeStringContent
  | FragmentContent
  | NodeContent
  | OtherContent;
