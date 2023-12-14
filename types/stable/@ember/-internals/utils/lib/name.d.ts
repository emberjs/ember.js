declare module '@ember/-internals/utils/lib/name' {
  export function setName(obj: object, name: string): void;
  export function getName(obj: object): string | undefined;
}
