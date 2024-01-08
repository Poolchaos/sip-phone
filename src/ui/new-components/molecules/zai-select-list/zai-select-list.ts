import './zai-select-list.less';

export class ZaiSelectList {
  private displayOptions: boolean;

  constructor() {}

  private toggleDisplayOptions(): void {
    this.displayOptions = !this.displayOptions;
  }
}
