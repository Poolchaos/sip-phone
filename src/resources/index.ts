import { FrameworkConfiguration } from 'aurelia-framework';
import { PLATFORM } from 'aurelia-pal';

export function configure(config: FrameworkConfiguration) {
  config
    .globalResources([
      PLATFORM.moduleName('resources/converters/tel-chars-only'),
      // PLATFORM.moduleName('resources/converters/order-by-conversing'), // used by multiple
      PLATFORM.moduleName('../app-background'),
      PLATFORM.moduleName('../views/chrome/initialise/initialise')
    ])
    .feature(PLATFORM.moduleName('resources/components/index'));
}
