import './zai-icon.less';

import { bindable } from 'aurelia-framework';

export class ZaiIcon {
  @bindable
  private icon: string = '';
  @bindable
  private iconColor: string = 'grey';
  @bindable
  private size: string = 'small';
}
