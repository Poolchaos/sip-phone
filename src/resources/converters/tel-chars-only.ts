import { LogManager } from 'aurelia-framework';

const logger = LogManager.getLogger('tel-chars-only');

export class TelCharsOnlyValueConverter {
  toView(value) {
    try {
      let newValue = '';
      if (value) {
        newValue = value.replace(/[^0-9+*#]/g, '');
      }
      return newValue;
    } catch (e) {
      logger.error('toView error:', e, 'error message:', e.message);
      return value;
    }
  }
}
