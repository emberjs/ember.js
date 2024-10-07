const { module, test } = QUnit;

module('@ember/template-compiler', function () {
  module('Build-time', function () {
    test('template-only', function (assert) {
      let file = `
        import { template } from "@ember/template-compiler";

        export let x = template("Hello {{message}}", {
          scope: () => ({ message }),
        });
      `;

      assert.notOk(file);
    });

    test('class-based', function (assert) {
      let file = `
        import { template } from "@ember/template-compiler";

        export class Example extends Component {
          static {
            template(
              "Hello {{message}}",
              {
                component: this,
                scope: () => ({ message }),
              },
            );
          }
        }
      `;

      assert.notOk(file);
    });
  });

  module('Run-time', function () {
    test('it works', function (assert) {});
  });
});
