export function autoRegister(): Runner;

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface Runner {}

interface Default {
  autoRegister: typeof autoRegister;
}

declare const DEFAULT: Default;

export default DEFAULT;
