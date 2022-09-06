declare module '@ember/template' {
  import { SafeString } from '@ember/template/-private/handlebars';
  export function htmlSafe(str: string): SafeString;
  export function isHTMLSafe(str: unknown): str is SafeString;
}
