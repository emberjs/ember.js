import Application from 'ember-strict-application-resolver';
import * as router from '../app/router.js';
import * as aboutRoute from '../app/routes/about.js';
import * as cartService from '../app/services/cart.js';
import * as formatPrice from '../app/helpers/format-price.js';
import * as tagged from './modifiers/tagged.js';

export default class App extends Application {
  modules = {
    './router': router,
    './routes/about': aboutRoute,
    './services/cart': cartService,
    './helpers/format-price': formatPrice,
    './modifiers/tagged': tagged,
    ...import.meta.glob('./templates/*.js', { eager: true }),
    ...import.meta.glob('./components/*.js', { eager: true }),
  };
}
