import { arrayOf } from "../model-helpers/model-helpers";

export class User {
  id = -1;
  logins = arrayOf(OauthLogin);
  studyBook = new StudyBook();

  getEvernoteLogin() {
    return this.logins.filter(login => login.provider === "evernote")[0];
  }
}

export class StudyBook {
  guid = "";
  id = -1;
  syncVersion = 0;
}

export class OauthLogin {
  provider = "";
  token = "";
  secret = "";
  externalId = "";
}