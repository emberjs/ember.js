// scripts/dist-ast.mjs — reads the code of a shipped dist file with babel, so
// the dist gates (assert-native-dist.mjs, bundle-size-check.mjs) read imports
// and calls from the AST and never from text: a comment, a string or a regex
// literal that looks like an import or a call is none.
import { createRequire } from 'node:module';

const babel = createRequire(import.meta.url)('@babel/core');

// The name a call is made through: `name(…)`, `obj.name(…)`, `obj["name"](…)`
// and `(0, name)(…)`; `null` for any other callee.
function calleeName(callee) {
  if (callee.type === 'SequenceExpression') {
    return calleeName(callee.expressions[callee.expressions.length - 1]);
  }
  if (callee.type === 'Identifier') return callee.name;
  if (callee.type === 'MemberExpression' || callee.type === 'OptionalMemberExpression') {
    if (!callee.computed && callee.property.type === 'Identifier') return callee.property.name;
    if (callee.computed && callee.property.type === 'StringLiteral') return callee.property.value;
  }
  return null;
}

// Parse one shipped file: its static / dynamic import specifiers (from the AST,
// so doc-comment examples never count), its calls, and its code re-printed
// WITHOUT comments. A call is `{ callee, read }`: the name it is made through
// (`calleeName`) and whether a member of its result is read (`f().x`,
// `f()?.x`). Rollup's residue of `__GXT_MODE__`-folded guards — `if (false &&
// …) ;`, a dead statement a minifier deletes — is removed from the grep text
// too.
export function analyze(code, filename) {
  const result = babel.transformSync(code, {
    filename,
    configFile: false,
    babelrc: false,
    sourceType: 'module',
    comments: false,
    ast: true,
    code: true,
  });
  const statics = new Set();
  const dynamics = new Set();
  const calls = [];
  for (const node of result.ast.program.body) {
    if (
      (node.type === 'ImportDeclaration' ||
        node.type === 'ExportNamedDeclaration' ||
        node.type === 'ExportAllDeclaration') &&
      node.source
    ) {
      statics.add(node.source.value);
    }
  }
  babel.traverse(result.ast, {
    'CallExpression|OptionalCallExpression'(path) {
      const { node, parent } = path;
      const arg = node.arguments[0];
      if (node.callee.type === 'Import' && arg?.type === 'StringLiteral') {
        dynamics.add(arg.value);
        return;
      }
      const callee = calleeName(node.callee);
      if (callee === null) return;
      const read =
        (parent.type === 'MemberExpression' || parent.type === 'OptionalMemberExpression') &&
        parent.object === node;
      calls.push({ callee, read });
    },
    ImportExpression(path) {
      if (path.node.source.type === 'StringLiteral') dynamics.add(path.node.source.value);
    },
  });
  const text = result.code.replace(/if \(false && [^;{}]*\);?/g, '');
  return { statics: [...statics], dynamics: [...dynamics], calls, text };
}

// The live gxt-bridge calls the classic dist must not contain (see
// bundle-size-check.mjs): a read of the renderer (`getGxtRenderer().x` /
// `getGxtRenderer()?.x`), a call of a bridge publisher, any call of the glimmer
// host accessors. A dead `function getGxtRenderer() {…}` stub and a
// doc-comment that names the bridge are no call.
const GXT_BRIDGE_PUBLISHERS = new Set([
  'installCompilePipelinePart',
  'installRootComponentPart',
  'installViewUtilsPart',
  'installRuntimePart',
  'installRenderPassPart',
  'installBacktrackingPart',
  'setGxtRenderer',
  'setControllerOutletRerender',
  'getGxtGlimmerHost',
  'setGxtGlimmerHost',
]);

/**
 * The live gxt-bridge calls of one dist file, as `name()` (a call) or
 * `name().` (a read of its result), each name once, in order.
 */
export function liveGxtBridgeCalls(code, filename) {
  const found = new Set();
  for (const { callee, read } of analyze(code, filename).calls) {
    if (GXT_BRIDGE_PUBLISHERS.has(callee)) found.add(`${callee}()`);
    else if (callee === 'getGxtRenderer' && read) found.add(`${callee}().`);
  }
  return [...found];
}
