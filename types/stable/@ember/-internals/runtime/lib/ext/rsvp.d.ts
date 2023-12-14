declare module '@ember/-internals/runtime/lib/ext/rsvp' {
  import * as RSVP from 'rsvp';
  export function onerrorDefault(reason: unknown): void;
  export default RSVP;
}
