import './zai-tab.less';

import { bindable } from 'aurelia-framework';

export class ZaiTab {
  @bindable
  private activeTab: boolean;
  @bindable
  private selectHandler: Function;

  private select(selection: any): void {
    if (this.selectHandler && typeof this.selectHandler === 'function') {
      this.activeTab = !this.activeTab;
      this.selectHandler(selection);
    }
  }
}
