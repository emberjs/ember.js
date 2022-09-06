import Controller, { inject } from '@ember/controller';

class MyController extends Controller {
  queryParams = ['category'];
  category = null;
  isExpanded = false;

  @inject declare first: Controller;
  @inject('second') declare second: Controller;

  toggleBody() {
    this.toggleProperty('isExpanded');
  }
}
