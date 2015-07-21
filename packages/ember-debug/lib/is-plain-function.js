export default function isPlainFunction(test) {
  return typeof test === 'function' && test.PrototypeMixin === undefined;
}
