export function autoRegister(): Runner;

export interface Runner {}

interface Default {
  autoRegister: typeof autoRegister;
}

declare const DEFAULT: Default;

export default DEFAULT;
