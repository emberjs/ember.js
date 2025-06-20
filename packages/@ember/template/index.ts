// NOTE: this intentionally *only* exports the *type* `SafeString`, not its
// value, since it should not be constructed by users.
export {
  isTrustedHTML,
  trustHTML,
  htmlSafe,
  isHTMLSafe,
  type SafeString,
} from '@ember/-internals/glimmer';
