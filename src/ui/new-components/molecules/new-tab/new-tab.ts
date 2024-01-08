import './new-tab.less';

import { children } from 'aurelia-framework';
import { TabView } from '../tab-view/tab-view';

export class NewTab {
  @children('tab-view')
  private tabViews: TabView[] = [];

  // @children('div')
  // private myChildren;

  public attached(): void {
    console.log('MS  this.tabViews', this.tabViews);
  }
}
