export default function createFreshScope() {
  return {
    self: null,
    blocks: {},
    component: null,
    view: null,
    attrs: null,
    locals: {},
    localPresent: {}
  };
}
