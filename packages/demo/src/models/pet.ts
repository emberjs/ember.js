import Model, { attr, belongsTo } from '@ember-data/model';

export default class PetModel extends Model {
  @attr name;
  @belongsTo('person', { inverse: 'dog', async: false }) owner;
}
