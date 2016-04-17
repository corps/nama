import * as QUnit from "qunitjs";
import * as Rx from "rx-lite";
import * as apiModels from "../../api/api-models";
import {FakeHandler} from "../../ajax-handler/fake-handler";
import {MemoryStorage} from "../../local-storage/local-storage";
import {LocalStorage} from "../../local-storage/local-storage";
import {LocalStudyStorage} from "../../local-storage/local-study-storage";
import {ScheduleUpdate} from "../../api/api-models";
import {ScheduledStudy} from "../../local-storage/local-study-storage";
import {FrontendSyncService} from "../frontend-sync-service";
import {FrontendAppState} from "../../frontend-app-state-machine/frontend-app-state";
import {UpdateScheduleResponse} from "../../api/api-models";
import {FetchScheduleResponse} from "../../api/api-models";
import {ScheduledClozeIdentifier} from "../../api/api-models";
import {GetLatestNoteResponse} from "../../api/api-models";
import {LocalSettingsStorage} from "../../local-storage/local-settings-storage";
import {LocalSettings} from "../../local-storage/local-settings-model";

var fetchSchedule:FakeHandler<apiModels.FetchScheduleRequest, apiModels.FetchScheduleResponse>;
var updateSchedule:FakeHandler<apiModels.UpdateScheduleRequest, apiModels.UpdateScheduleResponse>;
var getLatest:FakeHandler<apiModels.GetLatestNoteRequest, apiModels.GetLatestNoteResponse>;
var finishSync:Rx.Subject<boolean>;
var studyStorage = {} as LocalStudyStorage;
var scheduleUpdates:ScheduleUpdate[];
var scheduledStudy:ScheduledStudy;
var loadScheduledStudy:Rx.Subject<ScheduledStudy>;
var requestSync:Rx.Subject<boolean>;
var requestNoteUpdate:Rx.Subject<[string, number]>;
var stubCalls:any[];
var settingsStorage = {} as LocalSettingsStorage;
var settings:LocalSettings;

QUnit.module("frontend-sync-service", {
  beforeEach: () => {
    settings = new LocalSettings();
    stubCalls = [];
    requestNoteUpdate = new Rx.Subject<[string, number]>();
    requestSync = new Rx.Subject<boolean>();
    loadScheduledStudy = new Rx.Subject<ScheduledStudy>();
    finishSync = new Rx.Subject<boolean>();
    fetchSchedule =
      new FakeHandler<apiModels.FetchScheduleRequest, apiModels.FetchScheduleResponse>();
    updateSchedule =
      new FakeHandler<apiModels.UpdateScheduleRequest, apiModels.UpdateScheduleResponse>();
    getLatest = new FakeHandler<apiModels.GetLatestNoteRequest, apiModels.GetLatestNoteResponse>();
    scheduleUpdates = [];
    scheduledStudy = new ScheduledStudy();
    studyStorage.getScheduleUpdates = () => {
      stubCalls.push(['getScheduleUpdates']);
      return scheduleUpdates;
    }
    settingsStorage.loadSettings = () => settings;
    studyStorage.storeFetchResponse =
      (response) => stubCalls.push(['storeFetchResponse', response]);
    studyStorage.storeUpdateScheduleResponse =
      (response) => stubCalls.push(['storeUpdateScheduleResponse', response]);
    studyStorage.storeNoteResponse =
      (response) => stubCalls.push(['storeNoteResponse', response]);
    studyStorage.getSchedule = () => {
      stubCalls.push(['getSchedule']);
      return scheduledStudy
    }
  }
});

function complete() {
  fetchSchedule.complete();
  updateSchedule.complete();
  getLatest.complete();
  loadScheduledStudy.onCompleted();
  requestNoteUpdate.onCompleted();
  requestSync.onCompleted();
  finishSync.onCompleted();
}

QUnit.test("syncing with an empty study update does not make an update request", (assert) => {
  var service = new FrontendSyncService(studyStorage, settingsStorage, fetchSchedule, updateSchedule, getLatest);
  service.connect(requestSync, loadScheduledStudy, finishSync, requestNoteUpdate);

  assert.expect(2);

  Rx.Observable.merge<any>([
    updateSchedule.requestSubject.toArray().doOnNext(requests => assert.equal(requests.length, 0)),
    fetchSchedule.requestSubject.toArray().doOnNext(requests => assert.equal(requests.length, 1))
  ]).catch((e) => {
    assert.ok(false, e + "");
    return Rx.Observable.just(null);
  }).finally(assert.async()).subscribe();

  fetchSchedule.requestSubject.subscribe(() => {
    complete();
  });

  requestSync.onNext(null);
});

QUnit.test(`
  1.  when there are updates, requesting a sync will first request to apply those updates
  2.  after applying those udpates, it will apply that response to the study storage
  3.  then it will request the difference of the cur queue size and the max queue size from fetch
      it also applies the state's current study filters.
  4.  it then stores that fetch result
  5.  it loads study schedule into the subject.
  6.  Multiple consecutive sync requests will switch and only one load will occur from them.
`, (assert) => {
  var service = new FrontendSyncService(studyStorage, settingsStorage, fetchSchedule, updateSchedule, getLatest);

  scheduledStudy.scheduledClozes = [null, null, null];
  settings.maxQueueSize = 7;
  settings.studyFilters = ["a", "b"];
  service.connect(requestSync, loadScheduledStudy, finishSync, requestNoteUpdate);

  assert.expect(10);

  var updateResponse = new UpdateScheduleResponse();
  updateResponse.completed = [new ScheduledClozeIdentifier()];
  var fetchResponse = new FetchScheduleResponse();
  fetchResponse.expires = 9837;
  scheduleUpdates.push(new ScheduleUpdate());

  Rx.Observable.merge<any>([
    updateSchedule.requestSubject.toArray().doOnNext(requests => assert.equal(requests.length, 2)),
    fetchSchedule.requestSubject.toArray().doOnNext(requests => assert.equal(requests.length, 1)),
    updateSchedule.requestSubject.take(1).doOnNext(([req, resSubject]) => {
      requestSync.onNext(null);
    }),
    updateSchedule.requestSubject.doOnNext(([req, resSubject]) => {
      assert.deepEqual(req.schedules, scheduleUpdates.slice(0, 10));
      resSubject.onNext(updateResponse);
      resSubject.onCompleted();
    }),
    fetchSchedule.requestSubject.doOnNext(([req, resSubject]) => {
      assert.equal(req.requestedNum, 4);
      assert.equal(req.studyFilters, settings.studyFilters);
      resSubject.onNext(fetchResponse);
      resSubject.onCompleted();
    }),
    loadScheduledStudy.toArray().doOnNext(studies => {
      assert.equal(studies.length, 3);
      assert.equal(studies[studies.length - 1], scheduledStudy);
    }),
  ]).catch((e) => {
    assert.ok(false, e + "");
    return Rx.Observable.just(null);
  }).finally(assert.async()).subscribe();

  finishSync.subscribe((successful) => {
    assert.equal(successful, true);
    assert.deepEqual(stubCalls, [
      ['getScheduleUpdates'],
      ['getSchedule'],
      ['getScheduleUpdates'],
      ['getSchedule'],
      ['storeUpdateScheduleResponse', updateResponse],
      ['getSchedule'],
      ['storeFetchResponse', fetchResponse],
      ['getSchedule'],
    ]);
    setTimeout(complete, 100);
  });

  requestSync.onNext(null);
});

QUnit.test(`
  1.  fetch retries up to 3 times
  2.  update retries up to 3 times
  3.  a failed sync doesn't break the load switch
`, (assert) => {
  var service = new FrontendSyncService(studyStorage, settingsStorage, fetchSchedule, updateSchedule, getLatest);
  service.connect(requestSync, loadScheduledStudy, finishSync, requestNoteUpdate);

  assert.expect(4);

  var updateResponse = new UpdateScheduleResponse();
  var fetchResponse = new FetchScheduleResponse();
  scheduleUpdates.push(new ScheduleUpdate());

  Rx.Observable.merge<any>([
    updateSchedule.requestSubject.toArray().doOnNext(requests => assert.equal(requests.length, 5)),
    fetchSchedule.requestSubject.toArray().doOnNext(requests => assert.equal(requests.length, 4)),
    updateSchedule.requestSubject.take(3).doOnNext(([req, resSubject]) => {
      resSubject.onError(new Error("oh no!"))
    }),
    fetchSchedule.requestSubject.take(3).doOnNext(([req, resSubject]) => {
      resSubject.onError(new Error("oh no!"))
    }),
    updateSchedule.requestSubject.skip(3).doOnNext(([req, resSubject]) => {
      resSubject.onNext(updateResponse);
      resSubject.onCompleted();
    }),
    fetchSchedule.requestSubject.skip(3).doOnNext(([req, resSubject]) => {
      resSubject.onNext(fetchResponse);
      resSubject.onCompleted();
    }),
    loadScheduledStudy.toArray().doOnNext(studies => {
      assert.equal(studies[studies.length - 1], scheduledStudy);
    }),
    service.syncCompletion$.toArray()
      .doOnNext(completions => assert.deepEqual(completions, [false, false, true])),
    service.syncCompletion$.take(2).doOnNext(() => {
      requestSync.onNext(null)
    })
  ]).catch((e) => {
    assert.ok(false, e + "");
    return Rx.Observable.just(null);
  }).finally(assert.async()).subscribe();

  service.syncCompletion$.take(3).subscribeOnCompleted(() => {
    Rx.Scheduler.default.scheduleFuture(null, 1, () => {
      complete();
      service.complete();
      return null;
    })
  });


  requestSync.onNext(null);
});

QUnit.test(`
  does not fetch it the current study queue is sufficient
  but still reloads the current state from the database.
`, (assert) => {
  var service = new FrontendSyncService(studyStorage, settingsStorage, fetchSchedule, updateSchedule, getLatest);
  settings.maxQueueSize = 3;
  scheduledStudy.scheduledClozes.push(null, null, null);
  service.connect(requestSync, loadScheduledStudy, finishSync, requestNoteUpdate);

  assert.expect(4);

  var updateResponse = new UpdateScheduleResponse();
  scheduleUpdates.push(new ScheduleUpdate());

  Rx.Observable.merge<any>([
    updateSchedule.requestSubject.toArray().doOnNext(requests => assert.equal(requests.length, 1)),
    fetchSchedule.requestSubject.toArray().doOnNext(requests => assert.equal(requests.length, 0)),
    updateSchedule.requestSubject.doOnNext(([req, resSubject]) => {
      resSubject.onNext(updateResponse);
      resSubject.onCompleted();
    }),
    loadScheduledStudy.toArray().doOnNext(reqs => assert.equal(reqs.length, 2)),
    service.syncCompletion$.toArray()
      .doOnNext(completions => assert.deepEqual(completions, [true]))
  ]).catch((e) => {
    assert.ok(false, e + "");
    return Rx.Observable.just(null);
  }).finally(assert.async()).subscribe();

  service.syncCompletion$.subscribe(() => {
    Rx.Scheduler.default.scheduleFuture(null, 1, () => {
      complete();
      service.complete();
      return null;
    })
  });

  requestSync.onNext(null);
});

QUnit.test(`
  on requestnote, makes a request to getlatest note
  stores that result
  issues a load study state when wasUpToDate is false
`, (assert) => {
  var service = new FrontendSyncService(studyStorage, settingsStorage, fetchSchedule, updateSchedule, getLatest);
  service.connect(requestSync, loadScheduledStudy, finishSync, requestNoteUpdate);

  assert.expect(7);

  var getLatestResponse = new GetLatestNoteResponse();
  getLatestResponse.wasUpToDate = false;
  scheduleUpdates.push(new ScheduleUpdate());

  Rx.Observable.merge<any>([
    getLatest.requestSubject.toArray().doOnNext(requests => assert.equal(requests.length, 1)),
    getLatest.requestSubject.doOnNext(([req, resSubject]) => {
      assert.equal(req.noteId, "noteid");
      assert.equal(req.noteVersion, 123);
      resSubject.onNext(getLatestResponse);
      resSubject.onCompleted();
    }),
    loadScheduledStudy.toArray().doOnNext(reqs => assert.equal(reqs.length, 1)),
    service.syncCompletion$.toArray()
      .doOnNext(completions => assert.deepEqual(completions, [true]))
  ]).catch((e) => {
    assert.ok(false, e + "");
    return Rx.Observable.just(null);
  }).finally(assert.async()).subscribe();

  loadScheduledStudy.subscribe((latestStudy) => {
    assert.equal(latestStudy, scheduledStudy);
    assert.deepEqual(stubCalls, [
      ['storeNoteResponse', getLatestResponse],
      ['getSchedule']
    ]);
    Rx.Scheduler.default.scheduleFuture(null, 1, () => {
      complete();
      service.complete();
      return null;
    })
  });

  requestNoteUpdate.onNext(["noteid", 123])
});

QUnit.test(`
  on requestnote, makes a request to getlatest note
  does not issue a load study state when wasUpToDate is true
  does not store anything when wasUpToDate is true;
`, (assert) => {
  var service = new FrontendSyncService(studyStorage, settingsStorage, fetchSchedule, updateSchedule, getLatest);
  service.connect(requestSync, loadScheduledStudy, finishSync, requestNoteUpdate);

  assert.expect(6);

  var getLatestResponse = new GetLatestNoteResponse();
  getLatestResponse.wasUpToDate = true;
  scheduleUpdates.push(new ScheduleUpdate());

  Rx.Observable.merge<any>([
    getLatest.requestSubject.toArray().doOnNext(requests => assert.equal(requests.length, 1)),
    getLatest.requestSubject.doOnNext(([req, resSubject]) => {
      assert.equal(req.noteId, "noteid");
      assert.equal(req.noteVersion, 123);
      resSubject.onNext(getLatestResponse);
      resSubject.onCompleted();
    }),
    loadScheduledStudy.toArray().doOnNext(reqs => assert.equal(reqs.length, 0)),
    service.syncCompletion$.toArray()
      .doOnNext(completions => assert.deepEqual(completions, [true]))
  ]).catch((e) => {
    assert.ok(false, e + "");
    return Rx.Observable.just(null);
  }).finally(assert.async()).subscribe();

  service.syncCompletion$.subscribe(() => {
    assert.deepEqual(stubCalls, []);
    Rx.Scheduler.default.scheduleFuture(null, 1, () => {
      complete();
      service.complete();
      return null;
    })
  });

  requestNoteUpdate.onNext(["noteid", 123])
});

QUnit.test(`
  on consecutive note requests, switches correctly and only issues one load
`, (assert) => {
  var service = new FrontendSyncService(studyStorage, settingsStorage, fetchSchedule, updateSchedule, getLatest);
  service.connect(requestSync, loadScheduledStudy, finishSync, requestNoteUpdate);

  assert.expect(4);

  var getLatestResponse = new GetLatestNoteResponse();
  getLatestResponse.wasUpToDate = false;
  scheduleUpdates.push(new ScheduleUpdate());

  Rx.Observable.merge<any>([
    getLatest.requestSubject.toArray().doOnNext(requests => assert.equal(requests.length, 2)),
    getLatest.requestSubject.take(1).doOnNext(([req, resSubject]) => {
      requestNoteUpdate.onNext(["noteid2", 144]);
    }),
    getLatest.requestSubject.doOnNext(([req, resSubject]) => {
      resSubject.onNext(getLatestResponse);
      resSubject.onCompleted();
    }),
    loadScheduledStudy.toArray().doOnNext(reqs => assert.equal(reqs.length, 1)),
    service.syncCompletion$.toArray().doOnNext(completions => assert.deepEqual(completions, [true]))
  ]).catch((e) => {
    assert.ok(false, e + "");
    return Rx.Observable.just(null);
  }).finally(assert.async()).subscribe();

  service.syncCompletion$.subscribe(() => {
    assert.deepEqual(stubCalls, [
      ['storeNoteResponse', getLatestResponse],
      ['getSchedule']
    ]);
    Rx.Scheduler.default.scheduleFuture(null, 1, () => {
      complete();
      service.complete();
      return null;
    })
  });

  requestNoteUpdate.onNext(["noteid", 123])
});

QUnit.test(`
  errors do not break future switches
`, (assert) => {
  var service = new FrontendSyncService(studyStorage, settingsStorage, fetchSchedule, updateSchedule, getLatest);
  service.connect(requestSync, loadScheduledStudy, finishSync, requestNoteUpdate);

  assert.expect(4);

  var getLatestResponse = new GetLatestNoteResponse();
  getLatestResponse.wasUpToDate = false;
  scheduleUpdates.push(new ScheduleUpdate());

  Rx.Observable.merge<any>([
    getLatest.requestSubject.toArray().doOnNext(requests => assert.equal(requests.length, 2)),
    getLatest.requestSubject.take(1).doOnNext(([req, resSubject]) => {
      resSubject.onError(new Error("oh snap!"));
    }),
    getLatest.requestSubject.doOnNext(([req, resSubject]) => {
      resSubject.onNext(getLatestResponse);
      resSubject.onCompleted();
    }),
    loadScheduledStudy.toArray().doOnNext(reqs => assert.equal(reqs.length, 1)),
    service.syncCompletion$.toArray()
      .doOnNext(completions => assert.deepEqual(completions, [false, true])),
    service.syncCompletion$.take(1).doOnNext(() => {
      requestNoteUpdate.onNext(["noteid", 123]);
    })
  ]).catch((e) => {
    assert.ok(false, e + "");
    return Rx.Observable.just(null);
  }).finally(assert.async()).subscribe();

  loadScheduledStudy.subscribe((latestStudySchedule) => {
    assert.equal(latestStudySchedule, scheduledStudy)
    Rx.Scheduler.default.scheduleFuture(null, 1, () => {
      complete();
      service.complete();
      return null;
    })
  });

  requestNoteUpdate.onNext(["noteid", 123])
});
