/** @private
  This private helper is used by the legacy class bindings AST transformer
  to concatenate class names together.
*/
export default function concat(params, hash) {
  return params.join(hash.separator);
}
