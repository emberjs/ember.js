const { } = require('');

const options = {
  moduleIds: true,
  resolveModuleSource: moduleResolve,
  plugins: [
    function (opts) {
      let t = opts.types;
      return {
        pre(file) {
          file.set("helperGenerator", function (name) {
            if (name === 'interopRequireDefault') {
              // goes into a call expression
              return t.functionExpression(null, [
                t.identifier('m')
              ], t.blockStatement([
                t.returnStatement(t.identifier('m'))
              ]));
            }
          });
        }
      };
    },
    'transform-es2015-modules-amd']
}
function toAMD() {

}