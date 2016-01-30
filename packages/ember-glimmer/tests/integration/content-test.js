import { RenderingTest, moduleFor } from '../utils/test-case';

moduleFor('Content tests', class extends RenderingTest {

  ['TEST: it can render static content']() {
    this.render('hello');
    this.assertText('hello');
  }

});
