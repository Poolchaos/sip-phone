import {LogManager} from 'aurelia-framework';

const logger = LogManager.getLogger('ArrayTools');

export class ArrayTools {

  static containsAll(a1, a2) {

    if (a1.length !== a2.length) {
      return false;
    }

    for (let i1 of a1) {

      if (a2.indexOf(i1) === -1) {
        return false;
      }
    }

    return true;
  }

  static sort(list, key, keyToIgnore?) {

    if(!list) return [];

    return list.sort(function(a,b) {

      let _a = a[key];
      let _b = b[key];

      if(!_a || !_b) return 0;
      if(keyToIgnore && (a[keyToIgnore] || b[keyToIgnore])) return 0;

      if (typeof _a === 'number') {
        return (_a > _b) ? 1 : ((_b > _a) ? -1 : 0);
      }
      return (_a.toLowerCase() > _b.toLowerCase()) ? 1 : ((_b.toLowerCase() > _a.toLowerCase()) ? -1 : 0);
    });
  }
}
