import Ember from 'ember';

const FormatCurrencyHelper = Ember.Helper.helper((params: [number], hash: { currency: string }) => {
  const cents = params[0];
  const currency = hash.currency;
  return `${currency}${cents * 0.01}`;
});

class User extends Ember.Object {
  declare email: string;
}

class SessionService extends Ember.Service {
  declare currentUser: User;
}

declare module '@ember/service' {
  interface Registry {
    session: SessionService;
  }
}

class CurrentUserEmailHelper extends Ember.Helper {
  @Ember.inject.service('session')
  declare session: SessionService;

  compute(): string {
    return this.get('session').get('currentUser').get('email');
  }
}

