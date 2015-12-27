import * as Rx from "rx-lite";
import {LocalStorage} from "./local-storage";
import {LocalSettings} from "./local-settings-model";
import {ClientSession} from "../sessions/session-model";
import { loadClientSession } from "../sessions/fronted-session";
import { tap } from "../utils/obj";
import { assignFromJson } from "../model-helpers/model-helpers";

export class LocalSettingsStorage {
  static STORAGE_KEY = "localSettings";

  constructor(private storage:LocalStorage, private logoutHandler:()=>void) {
  }

  connect(setting$:Rx.Observable<LocalSettings>, loadSettings:Rx.Subject<LocalSettings>) {
    var settings = this.loadSettings();
    var session = loadClientSession();
    if (session.isLoggedIn()) {
      if (!settings.isLoggedIn()) {
        settings.userId = session.loggedInUserId;
        this.writeSettings(settings);
      } else if (!this.authenticateWriteSession(settings, session)) {
        return;
      }
    }

    setting$.subscribe((settings) => {
      if (this.authenticateWriteSession(settings)) {
        this.writeSettings(settings);
      }
    });
    loadSettings.onNext(settings);
  }

  loadSettings() {
    return tap(new LocalSettings())(s => {
      var json = this.storage.get(LocalSettingsStorage.STORAGE_KEY)
      if (json != null) {
        if (!assignFromJson(s, json)) {
          console.error("Failed to load", json);
        }
      }
    })
  }

  writeSettings(settings:LocalSettings) {
    this.storage.set(LocalSettingsStorage.STORAGE_KEY, settings);
  }

  authenticateWriteSession(settings = this.loadSettings(), session = loadClientSession()) {
    if (!this.isValidWriteSession(settings, session)) {
      this.logoutHandler();
      return false;
    }
    return true;
  }

  private isValidWriteSession(settings = this.loadSettings(), session = loadClientSession()) {
    return session.isLoggedIn() && settings.userId == session.loggedInUserId;
  }
}
