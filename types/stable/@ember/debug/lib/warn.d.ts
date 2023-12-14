declare module '@ember/debug/lib/warn' {
  import type { HandlerCallback } from '@ember/debug/lib/handlers';
  export interface WarnOptions {
    id: string;
  }
  export type RegisterHandlerFunc = (handler: HandlerCallback<WarnOptions>) => void;
  export interface WarnFunc {
    (message: string): void;
    (message: string, test: boolean): void;
    (message: string, options: WarnOptions): void;
    (message: string, test: boolean, options: WarnOptions): void;
  }
  let registerHandler: RegisterHandlerFunc;
  let warn: WarnFunc;
  let missingOptionsDeprecation: string;
  let missingOptionsIdDeprecation: string;
  export default warn;
  export { registerHandler, missingOptionsIdDeprecation, missingOptionsDeprecation };
}
