import {LogManager, Container} from 'aurelia-framework';
import { AureliaConfiguration } from 'aurelia-configuration';
import { HttpRequestMessage, HttpResponseMessage, RequestBuilder } from 'aurelia-http-client';

const logger = LogManager.getLogger('HttpInterceptor');
const codes: Array<number> = [500, 501, 502, 503, 504];

let configure = Container.instance.get(AureliaConfiguration);
const environment = configure.environment;

export default class HttpInterceptor {
  constructor() {}

  public request(message: IHttpRequestMessage): IHttpRequestMessage {
    return message;
  }

  public requestError(error: HttpResponseMessage): HttpResponseMessage {
    throw error;
  }

  public response(message: IHttpRequestMessage): IHttpRequestMessage {
    if (canIgnoreMessageStructure(message)) {
      return message;
    }

    let msg = parseMessage(message);
    let formattedResponse = msg._embedded || msg;

    if (msg instanceof Object && msg.page) {
      formattedResponse.page = msg.page;
    }
    return formattedResponse;
  }

  public responseError(error: HttpResponseMessage): any {

    return new Promise((resolve, reject) => {
      reject(error);
    });
  }
}

const canIgnoreMessageStructure = (message: IHttpRequestMessage): boolean => {
  if (!message.response && message.response !== '') {
    return true;
  }
  if (message.responseType === 'application/zip') {
    return true;
  }
  return false;
};

const parseMessage = (message: IHttpRequestMessage): any => {
  try {
    return typeof message.response === 'string' ? JSON.parse(message.response) : message.response;
  } catch (e) {
    return message.response;
  }
}

interface IHttpRequestMessage {
  headers: Headers;
  isSuccess: boolean;
  mimeType: string;
  requestMessage: HttpRequestMessage;
  response: string;
  responseType: string;
  reviver: any; // HttpReviver
  statusCode: number;
  statusText: string;
  content: any;
}
