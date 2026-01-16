import Controller from "@ember/controller";

class MyController extends Controller {
  queryParams = ['category'];
  category = null;
  isExpanded = false;

  toggleBody() {
    this.toggleProperty('isExpanded');
  }
}
