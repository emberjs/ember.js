declare module '@ember/template' {
  import { TrustedString } from '@ember/template/-private/handlebars';
  export type { TrustedString };

  export function unsafelyTrustString(str: string): TrustedString;
  export function isTrustedString(str: unknown): str is TrustedString;

  /** @deprecated use `unsafelyTrustString` instead */
  export function htmlSafe(str: string): TrustedString;
  /** @deprecated use `isTrustedString` instead */
  export function isHTMLSafe(str: unknown): str is TrustedString;
}
