import { AureliaConfiguration } from 'aurelia-configuration';
import { EventAggregator } from 'aurelia-event-aggregator';
import { autoinject, LogManager } from 'aurelia-framework';
import { AppStore } from './app-store';

import { OplogWebsocketClient } from './OplogWebsocketClient';
import { StateService } from './state-service';
import { SubscriptionsProviderService } from './subscriptions-provider-service';

const logger = LogManager.getLogger('OplogService');

@autoinject
export class OplogService {
  private subscriptionsProviderService: SubscriptionsProviderService;
  private websocketClient: OplogWebsocketClient;
  /**
   * Initialise a new instance of this class
   * @returns {{subscribeOn: (function(keyField, keyValue))}}
   * which exposes the following
   * @returns {{in: (function(nameSpace))}}
   * which then returns a new instance of this class
   * USAGE
   * --------
   * service.subscribeOn('fieldName', 'fieldValue').in('nameSpace');
   */
  constructor(
    private eventAggregator: EventAggregator,
    private stateService: StateService,
    private appStore: AppStore,
    private aureliaConfiguration: AureliaConfiguration
  ) {
    this.init();
  }

  public init(isReconnecting?: boolean): void {
    if (!isReconnecting) {
      this.subscriptionsProviderService = new SubscriptionsProviderService();
    }
    logger.debug('WP | init websocket');
    this.websocketClient = new OplogWebsocketClient(this.aureliaConfiguration, this.stateService, this.appStore);
    _subscription(this.websocketClient, this.subscriptionsProviderService, this.eventAggregator).registerEvents();
  }

  public async start(userId): Promise<void> {
    logger.debug('WP | start websocket for user', userId);
    await this.websocketClient.start(userId);
    _subscription(this.websocketClient, this.subscriptionsProviderService, this.eventAggregator).resubscribeOplog();
  }

  public async stop(): Promise<void> {
    _subscription(this.websocketClient, this.subscriptionsProviderService, this.eventAggregator).deregister(true);
    await this.websocketClient.stop();
  }

  subscribeOn(keyField, keyValue) {
    return {
      in: nameSpace => {
        let instance = new Instance(this.websocketClient, this.subscriptionsProviderService, this.eventAggregator);
        instance.keyField = keyField;
        instance.keyValue = keyValue;
        instance.nameSpace = nameSpace;

        return instance;
      },
    };
  }
}

class Instance {
  nameSpace = null;
  keyField = null;
  keyValue = null;
  operations = [];

  constructor(
    private websocketClient: OplogWebsocketClient,
    private subscriptionService: SubscriptionsProviderService,
    private eventAggregator: EventAggregator
  ) {}

  /**
   * subscribe to database operations
   * @param operation ['insert', 'update', 'delete']
   * @param callback
   * @param customFormat
   */
  on(operation, callback, customFormat?) {
    this.operations.push(operation);

    _subscription(this.websocketClient, this.subscriptionService, this.eventAggregator).subscribeToOplog(
      this.nameSpace,
      operation,
      this.keyField,
      this.keyValue,
      response => {
        callback(
          customFormat
            ? _format(
                customFormat.field && response[customFormat.field] ? response[customFormat.field] : response,
                operation
              )
            : response
        );
      }
    );
  }

  /**
   * unsubscribe from all database operations
   */
  unsubscribe() {
    for (let operation of this.operations) {
      _subscription(this.websocketClient, this.subscriptionService, this.eventAggregator).unSubscribeOplog(
        this.nameSpace,
        operation,
        this.keyField,
        this.keyValue
      );
    }
    this.operations = [];
  }

  unsubscribeFromTable(nameSpace, operation, keyField, keyValue) {
    _subscription(this.websocketClient, this.subscriptionService, this.eventAggregator).unSubscribeOplog(
      nameSpace,
      operation,
      keyField,
      keyValue
    );
  }
}

function _subscription(ws, subscriptionService, eventAggregator: EventAggregator) {
  function _registerEvents() {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    eventAggregator.subscribe('logout', view => {
      logger.info('on logout, _deregister');
      _deregister();
    });

    ws.subscribe({
      name: 'OperationLogged',
      callback: message => {
        // logger.debug(
        //   'OplogService OperationLogged subscription. subscriptionService.subscribers:',
        //   subscriptionService.subscribers
        // );
        let id = message.state.id;
        let obj = message.state.o;

        if (
          !subscriptionService.subscribers[id] ||
          !subscriptionService.subscribers[id].callback ||
          typeof subscriptionService.subscribers[id].callback !== 'function'
        ) return;

        subscriptionService.subscribers[id].callback(obj);
      },
    });
  }

  function _subscribeOplog(nameSpace, operation, keyField, keyValue, callback) {
    let id = _provisionId(nameSpace, operation, keyField, keyValue);

    subscriptionService.subscribers[id] = {
      callback,
      nameSpace: nameSpace,
      operation: operation,
      keyField: keyField,
      keyValue: keyValue,
    };
    ws.publish({
      name: 'RegisterOperationLog',
      state: {
        nameSpace: nameSpace,
        operation: operation,
        keyField: keyField,
        keyValue: keyValue,
      },
    });
  }

  function _resubscribeOplog() {
    const subscribers = Object.entries(subscriptionService.subscribers)
    subscribers.forEach(data => {
      const subscriber: any = data[1];
      ws.publish({
        name: 'RegisterOperationLog',
        state: {
          nameSpace: subscriber.nameSpace,
          operation: subscriber.operation,
          keyField: subscriber.keyField,
          keyValue: subscriber.keyValue
        },
      });
    });
  }

  function _unSubscribeOplog(nameSpace, operation, keyField, keyValue) {
    let id = _provisionId(nameSpace, operation, keyField, keyValue);
    delete subscriptionService.subscribers[id];

    ws.publish({
      name: 'DeregisterOperationLog',
      state: {
        nameSpace: nameSpace,
        operation: operation,
        keyField: keyField,
        keyValue: keyValue,
      },
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function _deregister(isReconnecting?: boolean) {
    if (!isReconnecting) {
      subscriptionService.subscribers = {};
    }
    ws.publish({
      name: 'DeregisterOperationLog',
    });
  }

  function _provisionId(nameSpace, operation, keyField, keyValue) {
    let sep = '~';
    return nameSpace + sep + operation + sep + keyField + sep + keyValue;
  }

  return {
    registerEvents: _registerEvents,
    subscribeToOplog: _subscribeOplog,
    unSubscribeOplog: _unSubscribeOplog,
    resubscribeOplog: _resubscribeOplog,
    deregister: _deregister,
  };
}

/**
 * Return response from different format oplog key fields as per examples:
 * `_response.85eab590-370b-11e7-a919-92ebcb67fe33: {...}`
 * `_response.campaigns: {...}`
 * `_response.campaigns.85eab590-370b-11e7-a919-92ebcb67fe33:: {...}`
 * `_response.campaigns.85eab590-370b-11e7-a919-92ebcb67fe33.numberOfTasksRemaining: 4`
 * @param _response
 * @param operation
 * @private
 */
function _format(_response, operation) {
  const indicators = {
    insert: {
      wildcard: '-',
      callback: _insert,
    },
    update: {
      wildcard: '.',
      callback: _update,
    },
    delete: {
      wildcard: '_',
      callback: _delete,
    },
  };

  function _insert(_property) {
    return _response[_property];
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function _delete(_property) {
    // return _response[_property];
  }

  function _update(_property, existingData) {
    let keys = _property.split('.');
    let data = _response;

    data[keys[0]] = existingData ? existingData[keys[0]] : {};

    if (keys[1]) {
      if (keys[2]) {
        data[keys[0]][keys[2]] = _response[_property];
      } else {
        data[keys[0]] = _response[_property];
      }
      data[keys[0]]._id = keys[1];
    } else {
      data = _response[_property];
    }
    return data;
  }

  let concatData;

  for (let _property in _response) {
    if (_response.hasOwnProperty(_property) && _property.includes(indicators[operation].wildcard)) {
      concatData = indicators[operation].callback(_property, concatData);
    }
  }
  return concatData;
}
