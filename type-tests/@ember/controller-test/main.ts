import Controller, { inject } from '@ember/controller';
import { set } from '@ember/object';

class MyController extends Controller {
  queryParams = ['category'];
  category = null;
  isExpanded = false;

  @inject declare first: Controller;
  @inject('second') declare second: Controller;

  toggleBody() {
    set(this, 'isExpanded', !this.isExpanded);
  }
}
