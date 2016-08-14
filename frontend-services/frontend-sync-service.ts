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
import {LocalMcdState, LocalMcdStorage} from "../local-storage/local-mcd-storage";

export class FrontendSyncService {
  constructor(private studyStorage:LocalStudyStorage,
              private settingsStorage:LocalSettingsStorage,
              private mcdStorage:LocalMcdStorage,
              private putMcds:AjaxHandler<apiModels.PutMcdsRequest, apiModels.PutMcdsResponse>,
              private getMcds:AjaxHandler<apiModels.GetMcdsRequest, apiModels.GetMcdsResponse>,
              private fetchSchedule:AjaxHandler<apiModels.FetchScheduleRequest, apiModels.FetchScheduleResponse>,
              private updateSchedule:AjaxHandler<apiModels.UpdateScheduleRequest, apiModels.UpdateScheduleResponse>,
              private getLatestNote:AjaxHandler<apiModels.GetLatestNoteRequest, apiModels.GetLatestNoteResponse>) {
  }

  private loadingSubject = new Rx.Subject<Rx.Observable<ScheduledStudy>>();
  private syncCompleteSubject = new Rx.Subject<boolean>();
  scheduledStudy$ = this.loadingSubject.switch();
  syncCompletion$ = this.syncCompleteSubject.asObservable();

  private syncSavedAnswers():Rx.Observable<number> {
    var updates = this.studyStorage.getScheduleUpdates();
    if (updates.length == 0) {
      return Rx.Observable.just(0);
    }

    var request = new apiModels.UpdateScheduleRequest();
    request.schedules = updates.slice(0, 10);

    return this.updateSchedule.request(request, loadClientSession()).flatMap(response => {
      this.studyStorage.storeUpdateScheduleResponse(response);

      if (updates.length > 10) {
        return this.syncSavedAnswers();
      }

      return Rx.Observable.just(response.completed.length);
    });
  }

  private syncCommittedMcds():Rx.Observable<number> {
    var updates = this.mcdStorage.getState().committed;
    if (updates.length == 0) {
      return Rx.Observable.just(0);
    }

    var request = new apiModels.PutMcdsRequest();
    request.notes = updates.slice(0, 10);

    return this.putMcds.request(request, loadClientSession()).flatMap(response => {
      var state = this.mcdStorage.getState();
      state.committed = state.committed.filter(n => response.completedIds.indexOf(n.id) == -1);
      this.mcdStorage.writeState(state);

      if (updates.length > 10) {
        return this.syncCommittedMcds();
      }

      return Rx.Observable.just(response.completedIds.length);
    })
  }

  private syncNewMcds():Rx.Observable<any> {
    var state = this.mcdStorage.getState();
    var request = new apiModels.GetMcdsRequest();

    if (state.edited) return Rx.Observable.just(null);

    request.ignoreIds = state.committed.map(n => n.id);

    return this.getMcds.request(request, loadClientSession()).doOnNext(response => {
      var state = this.mcdStorage.getState();
      state.queue = response.notes;
      this.mcdStorage.writeState(state);
    })
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
      return this.fetchSchedule.request(request, session).flatMap(response => {
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
    var syncedAnswerCount = 0;

    var sync = Rx.Observable.merge([
      this.syncSavedAnswers().scan((total, n) => total + n, 0).takeLast(1).doOnNext((count) => {
        syncedAnswerCount = count;
      }),
      this.syncCommittedMcds()
    ]).ignoreElements().toArray();

    return sync.flatMap(() => {
      if (localOnly) return Rx.Observable.empty<ScheduledStudy>();
      return this.fetchScheduleBatch();
    }).doOnCompleted(() => {
      this.syncCompleteSubject.onNext(syncedAnswerCount > 0 || !localOnly);
    }).catch(e => {
      this.syncCompleteSubject.onNext(false);
      return Rx.Observable.empty<ScheduledStudy>();
    }).startWith(this.studyStorage.getSchedule());
  }

  connect(requestSync:Rx.Observable<boolean>,
          loadScheduledStudy:Rx.Observer<ScheduledStudy>,
          finishSync:Rx.Observer<boolean>,
          requestLoadMcds:Rx.Observable<void>,
          finishLoadingMcds:Rx.Observer<void>) {
    this.scheduledStudy$.subscribe(loadScheduledStudy);

    requestSync.subscribe((localOnly) => this.loadingSubject.onNext(this.sync(localOnly)));
    this.syncCompleteSubject.subscribe(finishSync);
    requestLoadMcds.subscribe(
      () => this.syncNewMcds().doOnCompleted(() => finishLoadingMcds.onNext(null)))
  }

  complete() {
    this.loadingSubject.onCompleted();
    this.syncCompleteSubject.onCompleted();
  }
}