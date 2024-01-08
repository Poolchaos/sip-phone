export const ERROR_MESSAGES = {
  AUTH: {
    FAILURE: {
      message: 'Auth Failed - Check credentials',
      code: 'ATH-0001',
    },
    UNKNOWN: {
      message: 'Other Auth - check SSL Cert, etc.',
      code: 'ATH-0002',
    },
  },
  OPLOG: {
    REGISTRATION_ERROR: {
      message: 'Oplog Registration Error (Contact Support)',
      code: 'OP-0001',
    }
  },
  TELEPHONY: {
    REGISTRATION_ERROR: {
      message: 'SIP Registration Error (Check Credentials/Domain)',
      code: 'TL-0001',
    },
    GENERAL_NETWORK_ERROR: {
      message: 'General Networking Error (Check SSL, etc)',
      code: 'TL-0002',
    },
    CONNECTION_TIMEOUT_ERROR: {
      message: 'Connection Timeout (Check telephony options)',
      code: 'TL-0003',
    },
    UNKNOWN_ERROR: {
      message: 'Unknown Telephony Error (Contact Support)',
      code: 'TL-0004',
    },
  },
  STATUS: {
    DEVICE_INFORMATION: {
      INVALID_DEVICE_INFORMATION: {
        message: 'Invalid Device Information (Contact Support)',
        code: 'ST-0001',
      },
      UNKNOWN_ERROR: {
        message: 'Unknown Device Information Error',
        code: 'ST-0002',
      }, // shouldn't be displayed to use, just being set in state
    },
    ORGANISATION: {
      UNKNOWN_ERROR: {
        message: 'Unknown Org Error',
        code: 'ST-0003',
      }, // shouldn't be displayed to use, just being set in state
    },
    INITIAL_STATUS: {
      FETCH_ERROR: {
        message: 'Initial Status Fetch Error',
        code: 'ST-0004',
      },
    },
  },
  APPLICATION: {
    SERIOUS_APPLICATION_ERROR: {
      message: 'Err 4141',
      code: 'AS-4141',
    },
  },
};
