interface IStoreState {
  login:                 Login;
  user:                  User;
  organisation:          Organisation;
  device:                InteractionFlowsClass;
  routingStatus:         string;
  routingStatusActivity: RoutingStatusActivity;
  memberActivity:        string;
  interactionFlows:      InteractionFlowsClass;
  selectedPresence:      string;
  presences:             { presenceCodeName: string; color: string }[];
  activeInteractions:    ActiveInteraction[];
  callInfo:              CallInfo;
  featureFlags:          FeatureFlags;
  globalError:           string;
  oplog:                 boolean;
  connecting:            boolean;
  connectionStopped:     boolean;
  sip:                   boolean;
  ua:                    boolean;
  version:               string;
  versionUpdateRequired: boolean;
}

interface ActiveInteraction {
  interactionId:    string;
  state:            string;
  channel:          string;
  wrapUpChannelIds: string[];
  interactionType:  string;
}

interface CallInfo {
  title:     string;
  ringing:   boolean;
  remote:    string;
  onCall:    boolean;
  status:    number;
  direction: string;
  workType:  string;
  hold?:     boolean;
  muted?:    boolean;
  startTime?:number;
  endTime?:  number;
  cause?:    string;
}

interface InteractionFlowsClass {
  outboundFlowOptions: SelectedFlow[];
  devices:             DeviceElement[];
  selectedFlow?:       SelectedFlow;
}

interface DeviceElement {
  name:     string;
  pin:      Pin;
  callerId: string;
}

interface Pin {
  code:  string;
  hash1: string;
  hash2: string;
}

interface SelectedFlow {
  flowId:   string;
  flowName: string;
  selected: boolean;
}

interface FeatureFlags {
  autoAnswer:      boolean;
  incomingCallPop: boolean;
  sharedLogout:    boolean;
  logs:            boolean;
  forcedLogs:      boolean;
}

interface Login {
  loading: boolean;
  error: string;
}

interface Organisation {
  organisationId:   string;
  organisationName: string;
  country:          Country;
}

interface Country {
  name: string;
  code: string;
}

interface RoutingStatusActivity {
  wrapUp:        boolean;
  notResponding: boolean;
  endingWrapup:  boolean;
}

interface Settings {
  autoAnswer:     boolean;
  incomingCall:   boolean;
  inputDevice:  MediaDeviceInfo;
  outputDevice: MediaDeviceInfo;
  volume:         string;
  logs:           boolean;
}

interface User {
  passportId:             string;
  userId:                 string;
  personId:               string;
  recipientId:            string;
  email:                  string;
  token:                  string;
  accessCode:             string;
  userAccessRoles:        UserAccessRole[];
  memberId:               string;
  hasAdministratorRole:   boolean;
  hasAgentRole:           boolean;
  hasTeamLeaderRole:      boolean;
  hasOfficeEmployeeRole:  boolean;
  hasQARole:              boolean;
  hasQAManagerRole:       boolean;
  hasCampaignManagerRole: boolean;
  firstName:              string;
  surname:                string;
  emails:                 string[];
}

interface UserAccessRole {
  accountType:     string;
  role:            string;
  organisationId?: string;
  memberId?:       string;
}
