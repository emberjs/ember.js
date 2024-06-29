import Controller from '@ember/controller';
import { tracked } from '@glimmer/tracking';
export class ApplicationController extends Controller {
  @tracked showModal = true;

  constructor(...args: ConstructorParameters<typeof Controller>) {
    super(...args);
  }
}
