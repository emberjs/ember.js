import ArrayController from "ember-runtime/controllers/array_controller";

export default ArrayController.extend({
  _isVirtual: true,
  modelBinding: '_eachView.dataSource'
});
