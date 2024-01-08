interface IOptionsConfig {
  domain: string;
  host: string;
  port: string;
  stun: boolean;
  environment: string;
}

interface ICommunicationsConfig {
  ipAddress: string;
  apiPath: string;
  userName: string;
  id: number;
}

interface IRuntimeConfig {
  dtlController: any;
  platform: string;
  loggedInUser?: IUser;
  organisation?: any;
  context?: string;
  userAgent?: any;
  runtimeOptions: IOptionsConfig;
}

interface IPhoneConfig {
  videoElement: HTMLVideoElement;
}

interface ILoginAttempt {
  identity: string;
  password: string;
}

interface IStoreConfig {
  context: string;
}

interface IUserAgentRequest {
  action: string;
  payload: any;
}

interface ISipConfig {
  host: string;
  port: number;
  domain: string;
  userName: string;
  password: string;
}

interface IState {
  sipConnected: boolean;
  phoneConnected: boolean;
  loggedInUser?: IUser;
  organisation?: any;
  interactions?: ICall[];
  callHistory: IHistoryItem[];
}

interface IHistoryItem {
  time: number;
  number: string;
  direction: string;
}

interface ICall {
  interactionId: string;
  source: string;
  dest: string;
  channel: string;
  call_id: string;
  state: ICallState;
  isHidden: boolean;
}

interface ICallState {
  title: string;
  icon: string;
  onCall: boolean;
  onHold: boolean;
  onMute: boolean;
  onTransfer: boolean;
  offCall: boolean;
}

interface ICustomMessage {
  originator: string;
  timeStamp: number;
  messagePipe: string;
  messageType: string;
  messagePayload: any;
}

interface IPhoneState {
  sipEvent: string;
  icon: string;
  phoneState: string;
}

interface IUser {
  accessCode: string;
  email: string;
  passportId: string;
  personId: string;
  memberId: string;
  recipientId: string;
  token: string;
  userId: string;
  userAccessRoles: Array<IAccessRole>;
  deviceDetails: IDeviceDetail;
}

interface IDeviceDetail {
  devices: Array<IDevice>;
  extension: string;
  memberId: string;
  outboundFlowOptions: Array<any>;
}

interface IDevice {
  callerId: string;
  name: string;
  pin: {
    code: string;
    hash1: string;
    hash2: string;
  };
}

interface IAccessRole {
  accountType: string;
  role: string;
  memberId?: string;
  organisationId?: string;
}

interface IDtlConfig {
  baseConfig: object;
}

interface IChromeDtlConfig extends IDtlConfig {
  chromeSpecificProperty: object;
}

interface ICordovaDtlConfig extends IDtlConfig {
  cordovaSpecificProperty: object;
}

interface IFileReaderConfig {
  resourcePath: string;
}

/////// TODO: New Interfaces

// TMP: interface just to distinguish from existing interfaces
interface ICustomCommand {
  originator: string;
  timeStamp: number;
  messagePipe: string;
  messageType: string;
  messagePayload: any;
}

interface ICustomEvent {
  originator?: string;
  timeStamp: number;
  messagePipe: string;
  messageType: string;
  messagePayload: any;
}
