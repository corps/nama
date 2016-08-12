import {LocalStudyStorage} from "../local-storage/local-study-storage";
import * as Rx from "rx-lite";
import {ScheduledStudy} from "../local-storage/local-study-storage";
import {AjaxHandler} from "../ajax-handler/ajax-handler";
import * as apiModels from "../api/api-models";
import {LocalSettingsStorage} from "../local-storage/local-settings-storage";
import {LocalSettings} from "../local-storage/local-settings-model";
import {ClientSession} from "../sessions/session-model";
import {FrontendAppState} from "../frontend-app-state-machine/frontend-app-state";
import {Resource} from "../study-model/note-model";
import {loadClientSession} from "../sessions/fronted-session";

export class FrontendSyncService {
  constructor(private studyStorage:LocalStudyStorage,
              private settingsStorage:LocalSettingsStorage,
              private fetchSchedule:AjaxHandler<apiModels.FetchScheduleRequest, apiModels.FetchScheduleResponse>,
              private updateSchedule:AjaxHandler<apiModels.UpdateScheduleRequest, apiModels.UpdateScheduleResponse>,
              private getLatestNote:AjaxHandler<apiModels.GetLatestNoteRequest, apiModels.GetLatestNoteResponse>) {
  }

  private loadingSubject = new Rx.Subject<Rx.Observable<ScheduledStudy>>();
  private syncCompleteSubject = new Rx.Subject<boolean>();
  scheduledStudy$ = this.loadingSubject.switch();
  syncCompletion$ = this.syncCompleteSubject.asObservable();

  private syncUpdates():Rx.Observable<any> {
    var updates = this.studyStorage.getScheduleUpdates();
    if (updates.length == 0) {
      return Rx.Observable.empty();
    }

    var request = new apiModels.UpdateScheduleRequest();
    request.schedules = updates.slice(0, 10);

    return this.updateSchedule.request(request, loadClientSession()).doOnNext(response => {
      this.studyStorage.storeUpdateScheduleResponse(response);
    }).retry(3).flatMap(() => {
      if (updates.length > 10) {
        return this.syncUpdates();
      }

      return Rx.Observable.empty();
    });
  }

  private fetchScheduleBatch():Rx.Observable<ScheduledStudy> {
    var session = loadClientSession();
    var settings = this.settingsStorage.loadSettings();
    var request = new apiModels.FetchScheduleRequest();
    var scheduledStudy = this.studyStorage.getSchedule();
    var curQueueSize = scheduledStudy.scheduledClozes.length;
    request.requestedNum = Math.min(settings.maxQueueSize - curQueueSize, 5);
    request.studyFilters = settings.studyFilters;
    if (request.requestedNum > 0) {
      return this.fetchSchedule.request(request, session).retry(3).flatMap(response => {
        this.studyStorage.storeFetchResponse(response);
        if (response.scheduled.length > 0) {
          return Rx.Observable.merge<ScheduledStudy>(
            Rx.Observable.just<ScheduledStudy>(this.studyStorage.getSchedule()),
            this.fetchScheduleBatch()
          );
        }

        return Rx.Observable.just(this.studyStorage.getSchedule());
      });
    }
    return Rx.Observable.just(scheduledStudy);
  }

  sync(localOnly = false):Rx.Observable<ScheduledStudy> {
    return this.syncUpdates().ignoreElements().toArray().flatMap(() => {
      if (localOnly) return Rx.Observable.empty<ScheduledStudy>();
      return this.fetchScheduleBatch();
    }).doOnCompleted(() => {
      this.syncCompleteSubject.onNext(true);
    }).catch(e => {
      this.syncCompleteSubject.onNext(false);
      return Rx.Observable.empty<ScheduledStudy>();
    }).startWith(this.studyStorage.getSchedule());
  }

  connect(requestSync:Rx.Observable<boolean>,
          loadScheduledStudy:Rx.Observer<ScheduledStudy>,
          finishSync:Rx.Observer<boolean>,
          requestUpdateNote:Rx.Observable<[string, number]>) {
    this.scheduledStudy$.subscribe(loadScheduledStudy);

    requestSync.subscribe((localOnly) => this.loadingSubject.onNext(this.sync(localOnly)));
    this.syncCompleteSubject.subscribe(finishSync);
  }

  complete() {
    this.loadingSubject.onCompleted();
    this.syncCompleteSubject.onCompleted();
  }
}