export default function createFreshScope() {
  return {
    self: null,
    block: null,
    component: null,
    view: null,
    attrs: null,
    locals: {}
  };
}
