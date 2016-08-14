import {LocalStorage} from "./local-storage";
import {LocalSettingsStorage} from "./local-settings-storage";
import {arrayOf, assignFromJson} from "../model-helpers/model-helpers";
import {Note} from "../study-model/note-model";

export class LocalMcdState {
  committed = arrayOf(Note);
  edited = false;
  queue = arrayOf(Note);
}

export class LocalMcdStorage {
  constructor(private localStorage: LocalStorage,
              private localSettingsStorage: LocalSettingsStorage) {
  }

  getState() {
    var result = new LocalMcdState();
    assignFromJson(result, this.localStorage.get("committed-queue"));
    return result;
  }

  writeState(state: LocalMcdState) {
    if (this.localSettingsStorage.authenticateWriteSession()) {
      this.localStorage.set("committed-queue", state);
    }
  }
}