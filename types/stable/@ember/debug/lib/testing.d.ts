declare module '@ember/debug/lib/testing' {
  export function isTesting(): boolean;
  export function setTesting(value: boolean): void;
}
