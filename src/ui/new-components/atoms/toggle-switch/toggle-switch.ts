import './toggle-switch.less';

import { computedFrom, bindable } from 'aurelia-framework';

export class ToggleSwitch {
  @bindable
  private disabled: boolean;
  @bindable
  private checked: boolean;
  @bindable
  private onLabel: string;
  @bindable
  private offLabel: string;
  @bindable
  private onChange: Function;

  private onChangeHandler(): void {
    if (this.onChange && typeof this.onChange === 'function') {
      this.onChange();
    }
  }

  @computedFrom('onLabel', 'offLabel', 'checked')
  private get displayText(): string {
    return this.checked ? this.onLabel : this.offLabel;
  }
}
