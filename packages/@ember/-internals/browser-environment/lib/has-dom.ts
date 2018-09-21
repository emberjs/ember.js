// check if window exists and actually is the global
export default typeof self === 'object' &&
  self !== null &&
  (self as any).Object === Object &&
  typeof Window !== 'undefined' &&
  self.constructor === Window &&
  typeof document === 'object' &&
  document !== null &&
  self.document === document &&
  typeof location === 'object' &&
  location !== null &&
  self.location === location &&
  typeof history === 'object' &&
  history !== null &&
  self.history === history &&
  typeof navigator === 'object' &&
  navigator !== null &&
  self.navigator === navigator &&
  typeof navigator.userAgent === 'string';
