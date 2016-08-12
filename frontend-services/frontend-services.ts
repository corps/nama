import {FrontendAppStateMachine} from "../frontend-app-state-machine/frontend-app-state-machine";
import * as endpoints from "../api/endpoints";
import {LocalSettingsStorage} from "../local-storage/local-settings-storage";
import {LocalStorage} from "../local-storage/local-storage";
import {loadClientSession, logout} from "../sessions/fronted-session";
import {AjaxHandler} from "../ajax-handler/ajax-handler";
import * as apiModels from "../api/api-models";
import {tap} from "../utils/obj";
import {FrontendAppState} from "../frontend-app-state-machine/frontend-app-state";
import {LocalStudyStorage} from "../local-storage/local-study-storage";
import {FrontendSyncService} from "./frontend-sync-service";
import {sync} from "glob";
import * as Rx from "rx-lite";
import {focus$} from "./pagefocus-rx";
import {blur$} from "./pagefocus-rx";
import {key$} from "./keypresses-rx";
import {ScheduleUpdate} from "../api/api-models";
import {PutMcdsResponse} from "../api/api-models";
import {LocalMcdStorage} from "../local-storage/local-mcd-storage";

export class FrontendServices {
  protected visitLogin = () => {
    this.replaceLocation(endpoints.Login.path)
  };
  protected logout = () => {
    this.storage.clear();
    logout();
    this.visitLogin();
  };
  protected storage = window.localStorage;
  protected replaceLocation = (s: string) => window.location.replace(s);
  protected requestProvider = () => new XMLHttpRequest();
  protected dateProvider = () => new Date();

  constructor() {
  }

  connect(machine: FrontendAppStateMachine) {
    var localStorage = new LocalStorage(this.storage);
    var settingsStorage = new LocalSettingsStorage(localStorage, () => this.logout());
    var mcdStorage = new LocalMcdStorage(localStorage, settingsStorage);
    var studyStorage = new LocalStudyStorage(localStorage, settingsStorage, this.dateProvider);
    var apiLogout = () => {
      this.visitLogin()
    };

    var getMcds = new AjaxHandler<apiModels.GetMcdsRequest, apiModels.GetMcdsResponse>(endpoints.GetMcds, apiLogout, this.requestProvider);
    var putMcds = new AjaxHandler<apiModels.PutMcdsRequest, apiModels.PutMcdsResponse>(endpoints.PutMcds, apiLogout, this.requestProvider);
    var fetchSummaryStats = new AjaxHandler<apiModels.SummaryStatsRequest, apiModels.SummaryStatsResponse>(
      endpoints.SummaryStats, apiLogout, this.requestProvider);
    var fetchSchedule = new AjaxHandler<apiModels.FetchScheduleRequest, apiModels.FetchScheduleResponse>(
      endpoints.FetchSchedule, apiLogout, this.requestProvider);
    var updateSchedule = new AjaxHandler<apiModels.UpdateScheduleRequest, apiModels.UpdateScheduleResponse>(
      endpoints.UpdateSchedule, apiLogout, this.requestProvider);
    var getLatestNote = new AjaxHandler<apiModels.GetLatestNoteRequest, apiModels.GetLatestNoteResponse>(
      endpoints.GetLatestNote, apiLogout, this.requestProvider);
    var getResource = new AjaxHandler<apiModels.GetResourceRequest, apiModels.GetResourceResponse>(
      endpoints.GetResource, apiLogout, this.requestProvider);

    var syncService = new FrontendSyncService(
      studyStorage, settingsStorage, mcdStorage, putMcds, getMcds,
      fetchSchedule, updateSchedule, getLatestNote);

    machine.requestSummaryStats
      .withLatestFrom<FrontendAppState, FrontendAppState>(machine.allAppState$,
        (req: any, state: FrontendAppState) => state)
      .subscribe((state) => {
        machine.loadSummaryStats.onNext(fetchSummaryStats.request(
          tap(new apiModels.SummaryStatsRequest())(r => {
            r.studyFilters = state.localSettings.studyFilters;
          }),
          loadClientSession()))
      });

    machine.requestStoreScheduleUpdate.subscribe((scheduleUpdate: ScheduleUpdate) => {
      studyStorage.recordScheduleUpdate(scheduleUpdate);
    });

    var focusDisposable = focus$.subscribe(() => machine.visitSummary.subject.onNext(null));
    var keyDisposable = key$.subscribe(machine.pressKey.subject);

    machine.appState$.ignoreElements().finally(() => {
      focusDisposable.dispose();
      keyDisposable.dispose();
    }).subscribe();

    syncService.connect(machine.requestSync.subject, machine.loadStudy, machine.finishSync);
    machine.loadClientSession.onNext(loadClientSession());
    settingsStorage.connect(machine.localSetting$, machine.loadLocalSettings);
  }
}