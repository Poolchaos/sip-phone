import './zai-dialpad.less';
import { bindable, customElement, LogManager, inject, computedFrom, ObserverLocator } from 'aurelia-framework';

const logger = LogManager.getLogger('ZaiDialpad');

class ZaiEventListener {
  private enterPressed: boolean = false;
  private keypressTriggered: (e: { keyCode: number; preventDefault: () => void }) => void;

  constructor(callback) {
    this.keypressTriggered = e => {
      if (e.keyCode === 13 && !this.enterPressed) {
        this.enterPressed = true;
        e.preventDefault();
        callback();

        setTimeout(() => {
          this.enterPressed = false;
        }, 1000);
      }
    };
  }

  public add(eventName): { to: (targetElement: Element) => void } {
    const keypressTriggered = this.keypressTriggered;
    return {
      to: targetElement => {
        targetElement.addEventListener(eventName, keypressTriggered);
      },
    };
  }

  public remove(eventName): { from: (targetElement: Element) => void } {
    const keypressTriggered = this.keypressTriggered;
    return {
      from: targetElement => {
        targetElement.removeEventListener(eventName, keypressTriggered);
      },
    };
  }
}

@inject(ObserverLocator)
export class ZaiDialpad {
  @bindable number;
  @bindable({ attribute: 'name' }) name: string;
  @bindable({ attribute: 'on-call' }) onCall: boolean;
  @bindable({ attribute: 'call-history' }) callHistory: IHistoryItem[];
  private isEvent: boolean = false;
  private targetNumber: any;
  private zaiEventListener: ZaiEventListener;
  private observerSubscription: any;
  private showDropdown: boolean = false;
  private isHovering: boolean = false;
  private hoverTimeout: any;
  private longpress: number = 1000;
  private delay: any;

  @bindable
  dtmfKeyHandler: (char: string) => void;
  @bindable
  submitNumberHandler: (number: string) => void;

  constructor(private observerLocator: ObserverLocator) {
    this.zaiEventListener = new ZaiEventListener(() => this.notifyToStartCall());
    this.subscribeToNumberChanges();
  }

  private subscribeToNumberChanges(): void {
    this.observerSubscription = this.observerLocator //
      .getObserver(this, 'number')
      .subscribe((newValue, oldValue) => {
        if (this.isEvent) {
          return;
        }
        if (this.isPasted(newValue, oldValue)) {
          this.isEvent = true;
          this.number = newValue.replace(/[^0-9+*#]/g, '');
          setTimeout(() => {
            this.isEvent = false;
          }, 50);
          return;
        }
        this.activateAnimation(newValue, oldValue);
      });
  }

  private isPasted(newValue: string, oldValue: string): boolean {
    if (newValue && oldValue && newValue.length > oldValue.length + 1) {
      return true;
    }
    if (!oldValue && newValue.length > 1) {
      return true;
    }
    return false;
  }

  private activateAnimation(newValue: string, oldValue: string) {
    if ((newValue && oldValue && newValue.length > oldValue.length) || (newValue && newValue.length > 0 && !oldValue)) {
      let character = newValue[newValue.length - 1];

      if (character === '#') {
        character = 'hash';
      } else if (character === '*') {
        character = 'asterisk';
      } else if (character === '+') {
        character = 'plus';
      }

      this.sendDTMF(character);
      if (!character) {
        return;
      }

      this.allKeys().forEach(element => {
        element.className = element.className.replace(' active', '');
      });
      let key: any = document.querySelector(`#${this.name}-js-key-${character}.zai-dialpad__keypad__key`);
      if (key) {
        key.className += ' active';
        setTimeout(() => {
          key.className = key.className.replace(' active', '');
        }, 200);
      }
    }
  }

  private allKeys(): any {
    let keys = document.querySelectorAll(`#dialpad-${this.name} .zai-dialpad__keypad .zai-dialpad__keypad__key`);
    return keys;
  }

  private updateNumberFromEvent(number): void {
    this.isEvent = true; // used so that observer ignores this value change
    this.number = number;
    setTimeout(() => {
      this.isEvent = false;
    }, 20);
  }

  private addListenerForEnter(): void {
    logger.debug('addListenerForEnter');
    if (this.onCall) {
      return;
    }

    let targetInput = document.querySelector(`#dialpad-${this.name} .js-number-input`);
    logger.debug('addListenerForEnter targetInput', targetInput);

    if (targetInput) {
      logger.debug('addListenerForEnter adding keyup');
      this.zaiEventListener.add('keyup').to(targetInput);
    }
  }

  private attached(): void {
    logger.debug('z-dialpad attached');
    this.addListenerForEnter();
    this.targetNumber.focus();
  }

  private notifyToStartCall(): void {
    if (this.number.replace(/ /g, '').length > 0) {
      if (this.submitNumberHandler && typeof this.submitNumberHandler === 'function') {
        this.submitNumberHandler(this.number);
      }
    }
  }

  private toggleDropdown(): void {
    this.showDropdown = !this.showDropdown;
  }

  private selectExisting(number): void {
    this.number = number;
    this.showDropdown = false;
  }

  private hasHover(): void {
    this.isHovering = true;
    if (this.hoverTimeout) {
      window.clearTimeout(this.hoverTimeout);
      this.hoverTimeout = null;
    }
  }

  private noHover(): void {
    if (this.showDropdown) {
      this.hoverTimeout = setTimeout(() => {
        if (!this.isHovering) {
          this.showDropdown = false;
        }
      }, 1000);
    }
    this.isHovering = false;
  }

  private select(char): void {
    logger.debug('select char', char);
    this.number += char;
    this.targetNumber.focus();
    // this.sendDTMF(char);
  }

  private mouseDown(): void {
    let check = () => {
      this.select('+');
      this.clearDelay();
    };
    this.delay = setTimeout(() => check(), this.longpress);
  }

  private mouseUp(): void {
    if (this.delay) {
      this.select('0');
    }
    this.clearDelay();
  }

  private mouseLeave(): void {
    this.clearDelay();
  }

  private clearDelay(): void {
    clearTimeout(this.delay);
    this.delay = null;
  }

  private sendDTMF(char): void {
    if (char === '+' || char === ' ') {
      return;
    }

    if (this.dtmfKeyHandler && typeof this.dtmfKeyHandler === 'function') {
      // logger.debug(`Dialpad :: user-action :: keystroke ${char} to dtmfKeyHandler`);
      this.dtmfKeyHandler(char);
    }
    // this.sendAcrossDtlPipe(Constants.USER_EVENTS.USER_DTMF_TONE_SELECT, char);
  }

  private unbind() {
    this.removeListenerForEnter();
    if (this.observerSubscription) {
      this.observerSubscription.dispose();
    }
  }

  private removeListenerForEnter() {
    let targetInput = document.querySelector(`#dialpad-${this.name} .js-number-input`);
    if (targetInput) {
      this.zaiEventListener.remove('keyup').from(targetInput);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private sendAcrossDtlPipe(event: string, payload: any): void {
    logger.debug('dialpad.sendAcrossDtlPipe I DO NOTHING');
    // RuntimeState.dtlController.sendAcrossDtlPipe(<ICustomMessage>{
    //   messagePipe: Constants.APP_EVENTS.PHONE_EVENT,
    //   originator: this.constructor.name,
    //   messageType: event,
    //   timeStamp: new Date().getTime(),
    //   messagePayload: payload
    // });
  }

  @computedFrom('callHistory')
  private get hasCallHistory(): boolean {
    return this.callHistory && this.callHistory.length > 0;
  }
}
