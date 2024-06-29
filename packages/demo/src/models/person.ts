import Model, { attr, belongsTo, hasMany } from '@ember-data/model';

export default class PersonModel extends Model {
  @attr name;
  @belongsTo('pet', { inverse: 'owner', async: false }) dog;
  @hasMany('person', { inverse: 'friends', async: false }) friends;
}
