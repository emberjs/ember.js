export default function didRenderNode(morph, env) {
  env.renderedNodes[morph.guid] = true;
}
