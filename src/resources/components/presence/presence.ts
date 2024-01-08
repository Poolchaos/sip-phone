import { autoinject, customElement, containerless, bindable, LogManager } from 'aurelia-framework';
import { EventAggregator } from 'aurelia-event-aggregator';
import { ArrayTools } from 'resources/array-tools';

const logger = LogManager.getLogger('presence');

@customElement('presence')
@autoinject()
@containerless()
export class Presence {
  @bindable public presences: Array<{ presenceCodeName: string; color: string; }>;
  @bindable public presence: any;

  @bindable public statusIsChanging: any;

  @bindable public disabled: boolean;
  @bindable public reconnecting: boolean;
  @bindable public manual: boolean;
  @bindable({ attribute: 'select-handler' }) private selectHandler: (item: any) => void;

  selectedPresence:{ presenceCodeName: string; color: string; };
  activity;
  allPresences = [];
  showDropdown;
  isHovering;
  hoverTimeout;
  isWorkingPresence = false;


  constructor(protected eventAggregator: EventAggregator) {}

  public bind(): void {
    this.selectedPresence = this.presences.find(presence => presence.presenceCodeName.toLowerCase() === this.presence.toLowerCase());
  }

  protected async attached(): Promise<any> {
    this.presences.forEach(presence => {
      presence.presenceCodeName = presence.presenceCodeName.toLowerCase();
    });
    this.allPresences = ArrayTools.sort(this.presences, 'presenceCodeName');
    console.log(' ::>> this.presences >>>> ', this.presences);
  }

  selectPresence(presence: { presenceCodeName: string; color: string; }) {
    this.showDropdown = false;
    this.selectedPresence = presence;
    if (this.selectHandler && typeof this.selectHandler === 'function') {
      this.selectHandler(presence.presenceCodeName);
    }
  }

  hasHover() {
    this.isHovering = true;
    if (this.hoverTimeout) {
      window.clearTimeout(this.hoverTimeout);
      this.hoverTimeout = null;
    }
  }

  noHover() {
    if (this.showDropdown) {
      this.hoverTimeout = setTimeout(() => {
        if (!this.isHovering) {
          this.showDropdown = false;
        }
      }, 1500);
    }

    this.isHovering = false;
  }

  toggleDropdown() {
    this.showDropdown = !this.showDropdown;
  }

  protected detached(): void {}
}
