import * as QUnit from "qunitjs";
import {} from "../frontend-app-state-machine";
import {} from "../frontend-app-state";
import { tap } from "../../utils/obj";
import * as Rx from "rx-lite";
import makeInteractions = require("cycle-react/src/interactions");
import createEventSubject = require("cycle-react/src/rx/event-subject");
import { Interactions } from "../../cycle-rx-utils/interactions";
import {FrontendAppStateMachine} from "../frontend-app-state-machine";
import {LocalSettings} from "../../local-storage/local-settings-model";
import {FrontendAppState, CurrentPage} from "../frontend-app-state";
import {referenceDiffs} from "../../utils/diff";
import {SummaryStatsResponse} from "../../api/api-models";
import {ClozeIdentifier, Note} from "../../study-model/note-model";
import {ClientSession} from "../../sessions/session-model";
import {ScheduledStudy} from "../../local-storage/local-study-storage";
import {Resource} from "../../study-model/note-model";

QUnit.module("front-app-state-machine");

function newInteractions() {
  return new Interactions(makeInteractions(createEventSubject));
}

function getTransformations(state$:Rx.Observable<FrontendAppState>) {
  var previousState$ = state$.startWith(null);
  return Rx.Observable.zip<FrontendAppState, FrontendAppState, any>(state$, previousState$,
    (next, previous) => {
      return referenceDiffs(previous, next);
    })
}

QUnit.test(`
  1. localSettingsSinkSubject does not record loadLocalSettings changes
  2. addFilter changes apply to localSettingsSinkSubject
  3. changeFilter changes apply to localSettingsSinkSubject
  4. changeQueueMax changes apply to localSettingsSinkSubject
  5. localSetting$ debounces localSettingsSinkSubject
`, (assert) => {
  var stateMachine = new FrontendAppStateMachine(newInteractions());

  Rx.Observable.merge(
    stateMachine.localSettingsSinkSubject.toArray().doOnNext(settings => {
      assert.deepEqual(JSON.parse(JSON.stringify(settings)),
        [
          {
            "maxQueueSize": 100,
            "studyFilters": [
              "new filter"
            ],
            "userId": -1
          },
          {
            "maxQueueSize": 100,
            "studyFilters": [
              "new filter",
              "new filter 2"
            ],
            "userId": -1
          },
          {
            "maxQueueSize": 100,
            "studyFilters": [
              "new filter",
              "changed filter"
            ],
            "userId": -1
          },
          {
            "maxQueueSize": 200,
            "studyFilters": [],
            "userId": -1
          },
          {
            "maxQueueSize": 151,
            "studyFilters": [],
            "userId": -1
          }
        ]
      );
    }),
    stateMachine.localSetting$.toArray().doOnNext((settings) => {
      assert.deepEqual(JSON.parse(JSON.stringify(settings)), [{
        "maxQueueSize": 151,
        "studyFilters": [],
        "userId": -1
      }]);
    })
  ).finally(assert.async()).subscribeOnError((e) => {
    assert.ok(false, e + "");
  });

  stateMachine.loadLocalSettings.onNext(new LocalSettings());
  stateMachine.addFilter.listener("new filter");
  stateMachine.addFilter.listener("new filter 2");
  stateMachine.changeFilter.listener(["changed filter", 1]);
  stateMachine.loadLocalSettings.onNext(new LocalSettings());
  stateMachine.changeQueueMax.listener(200);
  stateMachine.changeQueueMax.listener(151);

  setTimeout(() => stateMachine.complete(), 1000);
});

QUnit.test(`
  1. addFilter adds a new filter item
  2. changeFilter changes the text of the filter at the given index.
  3. changeFilter removes the filter at the given index when it is blank
  4. changeQueueMax changes the queue max of the settings.
  5. loadLocalSettings loads those setting in as is.
`, (assert) => {
  var stateMachine = new FrontendAppStateMachine(newInteractions());

  getTransformations(stateMachine.allAppState$).toArray().doOnNext(states => {
    assert.deepEqual(JSON.parse(JSON.stringify(states)),
      ["^^[object Object]",
        {"localSettings": {"studyFilters": []}},
        {"localSettings": {"studyFilters": [[0, "^^new filter"]]}},
        {"localSettings": {"studyFilters": [[1, "^^new filter 2"]]}},
        {"localSettings": {"maxQueueSize": 151}},
        {"localSettings": {"studyFilters": [[1, "changed filter"]]}},
        {"localSettings": {"studyFilters": [[0, "changed filter"], [1, "$$changed filter"]]}}])
  }).finally(assert.async()).subscribeOnError((e) => {
    assert.ok(false, e + "");
  });

  stateMachine.loadLocalSettings.onNext(new LocalSettings());
  stateMachine.addFilter.listener("new filter");
  stateMachine.addFilter.listener("new filter 2");
  stateMachine.changeQueueMax.listener(151);
  stateMachine.changeFilter.listener(["changed filter", 1]);
  stateMachine.changeFilter.listener(["", 0]);
  stateMachine.complete();
});

QUnit.test("visitSummary", (assert) => {
  var stateMachine = new FrontendAppStateMachine(newInteractions());

  var done = assert.async(2);
  getTransformations(stateMachine.allAppState$).toArray().doOnNext(states => {
    assert.deepEqual(JSON.parse(JSON.stringify(states)),
      ["^^[object Object]",
        {
          "clientSession": {
            "loggedInUserId": 10
          }
        },
        {"currentPage": CurrentPage.SUMMARY}])
  }).finally(done).subscribeOnError((e) => {
    assert.ok(false, e + "");
  });

  stateMachine.requestSync.subject.toArray().doOnNext((requests) => {
    assert.equal(requests.length, 2, "expected a request for sync");
  }).finally(done).subscribeOnError((e) => {
    assert.ok(false, e + "");
  });

  stateMachine.visitSummary.listener(null);
  stateMachine.loadClientSession.onNext(tap(new ClientSession())(s => s.loggedInUserId = 10));
  stateMachine.visitSummary.listener(null);
  stateMachine.complete();
});

QUnit.test("beginStudy", (assert) => {
  var stateMachine = new FrontendAppStateMachine(newInteractions());

  getTransformations(stateMachine.allAppState$).toArray().doOnNext(states => {
    assert.deepEqual(JSON.parse(JSON.stringify(states)),
      ["^^[object Object]",
        {
          "clientSession": {
            "loggedInUserId": 10
          }
        },
        {"currentPage": CurrentPage.SUMMARY},
        {
          "scheduledStudy": {
            "notes": {},
            "scheduledClozes": [
              [
                0,
                null
              ]
            ]
          }
        },
        {"currentPage": CurrentPage.STUDYING}])
  }).finally(assert.async()).subscribeOnError((e) => {
    assert.ok(false, e + "");
  });

  stateMachine.beginStudy.listener(null);
  stateMachine.loadClientSession.onNext(tap(new ClientSession())(s => s.loggedInUserId = 10));
  stateMachine.beginStudy.listener(null);
  stateMachine.loadStudy.onNext(tap(new ScheduledStudy())(study => {
    study.scheduledClozes.push(null);
  }));
  stateMachine.beginStudy.listener(null);
  stateMachine.complete();
});

QUnit.test(`
  1. loadImages maps each observable into images, and ignores errors
  2. requestImages clears the images.
`, (assert) => {
  var stateMachine = new FrontendAppStateMachine(newInteractions());

  Rx.Observable.merge<any>([
    getTransformations(stateMachine.allAppState$).toArray().doOnNext(states => {
      assert.deepEqual(JSON.parse(JSON.stringify(states)), [
        "^^[object Object]",
        {
          "images": [
            [
              0,
              "^^[object Object]"
            ]
          ]
        },
        {
          "images": [
            [
              1,
              "^^[object Object]"
            ]
          ]
        },
        {
          "images": [
            [
              2,
              "^^[object Object]"
            ]
          ]
        },
        {
          "images": [
            [
              0,
              "$$[object Object]"
            ],
            [
              1,
              "$$[object Object]"
            ],
            [
              2,
              "$$[object Object]"
            ]
          ]
        }
      ])
    }),
    stateMachine.allAppState$.takeLast(2).toArray().doOnNext(lastTwoStates => {
      assert.deepEqual(lastTwoStates[0].images, [resource1, resource2, resource3]);
      assert.deepEqual(lastTwoStates[1].images, []);
    })
  ]).catch((e) => {
    assert.ok(false, e + "");
    return Rx.Observable.just(null);
  }).finally(assert.async()).subscribe();

  var resource1 = new Resource();
  resource1.id = "id1";
  var resource2 = new Resource();
  resource2.id = "id2";
  var resource3 = new Resource();
  resource3.id = "id3";
  var resource$ = [
    Rx.Observable.just(resource1),
    Rx.Observable.just(resource2),
    Rx.Observable.throw<Resource>(new Error("oh no!")),
    Rx.Observable.just(resource3)
  ];
  stateMachine.loadImages.onNext(resource$);

  Rx.Observable.empty().delay(1).doOnCompleted(() => {
    stateMachine.requestImages.listener(["a", "b", "c"]);
    stateMachine.complete();
  }).subscribe();
});

QUnit.test("loadSummaryStats and requestSummaryStats", (assert) => {
  var stateMachine = new FrontendAppStateMachine(newInteractions());

  getTransformations(stateMachine.allAppState$).toArray().doOnNext(states => {
    assert.deepEqual(JSON.parse(JSON.stringify(states)),
      [
        "^^[object Object]",
        {
          "summaryStats": {},
          "summaryStatsLoaded": true
        },
        {
          "summaryStatsLoaded": false
        },
        {
          "summaryStats": {},
          "summaryStatsLoaded": true
        }
      ])
  }).finally(assert.async()).subscribeOnError((e) => {
    assert.ok(false, e + "");
  });

  stateMachine.loadSummaryStats.onNext(Rx.Observable.just(null).delay(100));
  stateMachine.loadSummaryStats.onNext(Rx.Observable.just(new SummaryStatsResponse()).delay(200));
  Rx.Observable.just(null).delay(300).subscribe(() => {
    stateMachine.requestSummaryStats.onNext(null);
    stateMachine.loadSummaryStats.onNext(Rx.Observable.throw<any>(new Error("Oh no!")));
  });

  Rx.Observable.just(null).delay(400).subscribe(() => {
    stateMachine.loadSummaryStats.onNext(Rx.Observable.just(new SummaryStatsResponse()));
    stateMachine.complete();
  })
});

QUnit.test(`
  loadClientSession with a logged in session implicitly moves to the summary page if logged out
  but it will not change the page if the session was already logged in.
`, (assert) => {
  var stateMachine = new FrontendAppStateMachine(newInteractions());

  var done = assert.async();
  getTransformations(stateMachine.allAppState$).toArray().doOnNext(states => {
    assert.deepEqual(JSON.parse(JSON.stringify(states)),
      [
        "^^[object Object]",
        {
          "clientSession": {
            "loggedInUserId": 10
          }
        },
        {
          "currentPage": 1
        },
        {
          "scheduledStudy": {
            "notes": {},
            "scheduledClozes": [
              [
                0,
                null
              ]
            ]
          }
        },
        {
          "currentPage": 2
        },
        {
          "clientSession": {}
        }
      ])
  }).finally(done).subscribeOnError((e) => {
    assert.ok(false, e + "");
  });

  stateMachine.loadClientSession.onNext(tap(new ClientSession())(s => s.loggedInUserId = 10));
  stateMachine.loadStudy.onNext(tap(new ScheduledStudy())(study => {
    study.scheduledClozes.push(null);
  }));
  stateMachine.beginStudy.listener(null);
  stateMachine.loadClientSession.onNext(tap(new ClientSession())(s => s.loggedInUserId = 10));
  stateMachine.complete();
});
