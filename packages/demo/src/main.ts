import './style.css';

import Ember from 'ember';
import App from '@/config/application';
import { init } from '@/config/initializer';
import { setupApplicationGlobals } from '@/config/helpers';
import { extendRegistry } from '@/config/utils';
import env from '@/config/env';
import Router from './router';

import '@/config/inspector';
globalThis.EmberFunctionalHelpers = new WeakMap();
setupApplicationGlobals(Ember);

const app = init(App, Router);

window[env.APP.globalName] = app; // for debugging and experiments
app.visit(window.location.href.replace(window.location.origin, ''));
