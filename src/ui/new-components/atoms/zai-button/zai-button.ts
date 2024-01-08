import './zai-button.less';

import { bindable } from 'aurelia-framework';

export class ZaiButton {
  @bindable
  private icon: string = '';
  @bindable
  private tooltip: string = '';
  @bindable
  private iconColor: string = 'grey';
  @bindable
  private buttonColor: string = 'grey';
  @bindable
  private disabled: boolean;
  @bindable
  private selected: boolean;
  @bindable
  private onClickHandler: Function;

  private onClick = (data): void => {
    if (this.onClickHandler && typeof this.onClickHandler === 'function') {
      this.onClickHandler(data);
    }
  };
}
