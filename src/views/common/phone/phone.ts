import { autoinject } from 'aurelia-framework';
import { AppStore } from 'services/app-store';

@autoinject()
export class Phone {
  constructor(public appStore: AppStore) {}
}
