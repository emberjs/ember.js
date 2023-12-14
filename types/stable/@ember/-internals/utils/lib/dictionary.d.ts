declare module '@ember/-internals/utils/lib/dictionary' {
  export default function makeDictionary<T>(
    parent: {
      [key: string]: T;
    } | null
  ): {
    [key: string]: T;
  };
}
