import './zai-select-option.less';

import { bindable } from 'aurelia-framework';

export class ZaiSelectOption {
  @bindable
  private option: Option;
  @bindable
  private onClickHandler: Function;

  constructor() {}

  private onClick(option: any): void {
    if (this.onClickHandler && typeof this.onClickHandler === 'function') {
      this.onClickHandler(option);
    }
  }
}

export class Option {
  public value: string = null;
  public selected: boolean = null;

  constructor(option) {
    Object.assign(this, option);
  }
}
