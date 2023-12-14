declare module '@ember/-internals/error-handling' {
  export const onErrorTarget: {
    readonly onerror: Function | undefined;
  };
  export function getOnerror(): Function | undefined;
  export function setOnerror(handler: Function | undefined): void;
  export function getDispatchOverride(): Function | null;
  export function setDispatchOverride(handler: Function | null): void;
}
