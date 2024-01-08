import { JSEncrypt } from 'jsencrypt';

const k =
  'MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCpO/u5r1sLMr7UTMg+SfZ8Tbl2eu2xCtUCVMQNvEyZAGQDZVv39ZPkjkDPkUFzzK0m3/sfYgKdJ3PyP6BJ8CEyNz+qnSHA6ks459R+gflt+QmihhLbLwe6Y5a5iaTFxLw85erdReZ3mNPmzBQ0qs7p0Vp1vTlly5nmdG/xtnMlfQIDAQAB';

export class EncryptTools {
  static encrypt(plainText) {
    let jsencrypt = new JSEncrypt();
    jsencrypt.setPublicKey(k);
    return jsencrypt.encrypt(plainText);
  }
}
