import { RenderingTest, moduleFor } from '../../utils/test-case';

moduleFor('Helpers test: custom helpers', class extends RenderingTest {

  ['@test it can resolve custom helpers']() {
    this.registerHelper('hello-world', () => 'hello world');

    this.render('{{hello-world}}');

    this.assertText('hello world');
  }

  ['@test it can resolve custom class-based helpers']() {
    this.registerHelper('hello-world', {
      compute() {
        return 'hello world';
      }
    });

    this.render('{{hello-world}}');

    this.assertText('hello world');
  }

});
