declare module '@ember/template' {
  import { SafeString } from '@ember/template/-private/handlebars';
  export type { SafeString };
  export function htmlSafe(str: string): SafeString;
  export function isHTMLSafe(str: unknown): str is SafeString;
}
