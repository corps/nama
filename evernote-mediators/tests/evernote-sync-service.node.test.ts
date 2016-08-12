import * as QUnit from "qunitjs";
import { integrationModule, testObjects } from "../../integration-test-helpers/integration-test-helpers";
import {EvernoteSyncService} from "../evernote-sync-service";
import {UserStorage} from "../../remote-storage/user-storage";
import {EvernoteClientRx} from "../../evernote-client-rx/evernote-client-rx";
import {MasterScheduleStorage} from "../../remote-storage/master-schedule-storage";
import * as Rx from "rx";
import {User} from "../../user-model/user-model";
import {tap} from "../../utils/obj";
import {Evernote} from "evernote";
import {Cloze, formatCloze} from "../../study-model/note-model";
import {MockedSyncService} from "./mocked-sync-service";

integrationModule("evernote-sync-service");

function encloseInEnml(body:string) {
  return `<?xml version='1.0' encoding='utf-8'?>
<!DOCTYPE en-note SYSTEM "http://xml.evernote.com/pub/enml2.dtd">
<en-note style="margin:20px">${body}</en-note>`
}


QUnit.test("findOrCreateStudyBook", (assert) => {
  var userStorage = new UserStorage(testObjects.db);
  var scheduleStorage = new MasterScheduleStorage(testObjects.db);
  var evernoteClient = new EvernoteClientRx(testObjects.testServer.config.evernoteConfig, undefined, true);
  var userClient = evernoteClient.forUser(testObjects.user);
  var service = new EvernoteSyncService(userStorage, evernoteClient, scheduleStorage, 100, "some-study-notebook" + Math.random());

  var createdNotebookGuid:string;
  userClient.listNotebooks()
    .map(notebooks => notebooks.map(notebook => notebook.guid))
    .flatMap((guids:string[]) => {
      return service.findOrCreateStudyBook(testObjects.user)
        .flatMap(([guid, syncState]) => {
          createdNotebookGuid = guid;
          testObjects.user.studyBook.guid = guid;
          testObjects.user.studyBook.syncVersion = 15;
          assert.ok(syncState > 0, "got sync state " + syncState);
          assert.equal(guids.indexOf(guid), -1);
          return service.findOrCreateStudyBook(testObjects.user)
            .doOnNext(([nextGuid, syncState]) => {
              assert.ok(syncState > 0, "got sync state " + syncState);
              assert.equal(syncState, 15);
              assert.equal(nextGuid, guid);
            });
        });
    })
    .finally(assert.async())
    .catch((e) => {
      assert.ok(false, e + "");
      return Rx.Observable.just(null);
    })
    .flatMap(() => {
      return Rx.Observable.merge(tap([] as Rx.Observable<any>[])(cleanup => {
        if (createdNotebookGuid) cleanup.push(userClient.deleteNotebook(createdNotebookGuid));
      })).toArray()
    }).subscribe();
});

QUnit.test(`
  Sync adds new entries to the schedule from synced notes
  Sync removes notes moved out of the study book
  Sync removes terms and clozes that go missing
  Sync removes deleted notes
`, (assert) => {
  var userStorage = new UserStorage(testObjects.db);
  var scheduleStorage = new MasterScheduleStorage(testObjects.db);
  var evernoteClient = new EvernoteClientRx(testObjects.testServer.config.evernoteConfig, undefined, true);
  var userClient = evernoteClient.forUser(testObjects.user);
  var service = new EvernoteSyncService(userStorage, evernoteClient, scheduleStorage);

  var createdTagGuid:string;
  var createdNote:Evernote.Note;
  var secondNotebookGuid:string;
  service.sync(testObjects.user).toArray().flatMap(() => {
    return testObjects.db.all("SELECT * FROM schedule", []).doOnNext((rows) => {
      assert.equal(rows.length, 0, "initial sync should be empty, but some entries were found!");
    })
  }).flatMap(() => {
    return userClient.createTag(tap(new Evernote.Tag)(tag => {
      tag.name = Math.random() + "";
    })).doOnNext((tag) => {
      createdTagGuid = tag.guid;
    })
  }).flatMap(() => {
    return userClient.createNote(tap(new Evernote.Note())(n => {
      var cloze1 = tap(new Cloze())(c => {
        c.segment = "a";
        c.schedule.dueAtMinutes = 10;
      });
      var cloze2 = tap(new Cloze())(c => {
        c.segment = "a";
        c.schedule.dueAtMinutes = 20;
      });
      var cloze3 = tap(new Cloze())(c => {
        c.segment = "a";
        c.schedule.dueAtMinutes = 30;
      });
      var cloze4 = tap(new Cloze())(c => {
        c.segment = "a";
        c.schedule.dueAtMinutes = 40;
      });

      n.notebookGuid = testObjects.user.studyBook.guid;
      n.tagGuids = [createdTagGuid]
      n.title = "Test Note";
      n.content = encloseInEnml(`
      <div>
        Hello<br/><br/>
        [term1] Thing<br/>
        ${formatCloze(cloze1)}<br/>
        ${formatCloze(cloze2)}
        <br/><br/>
        [term2] Thing<br/>
        ${formatCloze(cloze3)}<br/>
        ${formatCloze(cloze4)}
      </div>
      `);
    }));
  }).flatMap((note) => {
    createdNote = note;
    return service.sync(testObjects.user);
  }).flatMap(() => {
    return testObjects.db.all("SELECT * FROM schedule", []).doOnNext(rows => {

      var sorted = rows.sort(
        (a:any, b:any) => (a.marker + a.clozeIdx < b.marker + b.clozeIdx) ? -1 : 1);
      sorted.forEach((r:any) => delete r["id"]);
      assert.deepEqual(sorted, [{
        "clozeIdentifier": `${createdNote.guid};term1;0`,
        "studyBookId": 2,
        "noteId": createdNote.guid,
        "marker": "term1",
        "clozeIdx": 0,
        "dueAtMinutes": 10,
        "noteVersion": createdNote.updateSequenceNum,
        "tags": ` ${createdTagGuid} `,
        "leaseExpiresAtUnix": -1
      }, {
        "clozeIdentifier": `${createdNote.guid};term1;1`,
        "studyBookId": 2,
        "noteId": createdNote.guid,
        "marker": "term1",
        "clozeIdx": 1,
        "dueAtMinutes": 20,
        "noteVersion": createdNote.updateSequenceNum,
        "tags": ` ${createdTagGuid} `,
        "leaseExpiresAtUnix": -1
      }, {
        "clozeIdentifier": `${createdNote.guid};term2;0`,
        "studyBookId": 2,
        "noteId": createdNote.guid,
        "marker": "term2",
        "clozeIdx": 0,
        "dueAtMinutes": 30,
        "noteVersion": createdNote.updateSequenceNum,
        "tags": ` ${createdTagGuid} `,
        "leaseExpiresAtUnix": -1
      }, {
        "clozeIdentifier": `${createdNote.guid};term2;1`,
        "studyBookId": 2,
        "noteId": createdNote.guid,
        "marker": "term2",
        "clozeIdx": 1,
        "dueAtMinutes": 40,
        "noteVersion": createdNote.updateSequenceNum,
        "tags": ` ${createdTagGuid} `,
        "leaseExpiresAtUnix": -1
      }]);
    });
  }).flatMap(() => {
    return userClient.createNotebook(tap(new Evernote.Notebook())(nb => {
      nb.name = Math.random() + "";
    })).flatMap(nb => {
      secondNotebookGuid = nb.guid;
      createdNote.notebookGuid = secondNotebookGuid;
      return userClient.updateNote(createdNote);
    })
  }).flatMap((updatedNote:Evernote.Note) => {
    createdNote = updatedNote;
    return service.sync(testObjects.user);
  }).flatMap(() => {
    return testObjects.db.all("SELECT * FROM schedule", []).doOnNext(rows => {
      assert.equal(rows.length, 0);
    })
  }).flatMap(() => {
    createdNote.notebookGuid = testObjects.user.studyBook.guid;

    return userClient.updateNote(createdNote).doOnNext((updatedNote) => {
      createdNote = updatedNote;
    });
  }).flatMap(() => {
    return service.sync(testObjects.user);
  }).flatMap(() => {
    return testObjects.db.all("SELECT * FROM schedule", []).doOnNext(rows => {
      var sorted = rows.sort(
        (a:any, b:any) => (a.marker + a.clozeIdx < b.marker + b.clozeIdx) ? -1 : 1);
      sorted.forEach((r:any) => delete r["id"]);
      assert.deepEqual(sorted.map((r:any) => r.clozeIdentifier),
        [`${createdNote.guid};term1;0`,
          `${createdNote.guid};term1;1`,
          `${createdNote.guid};term2;0`,
          `${createdNote.guid};term2;1`]);
    });
  }).flatMap(() => {
    var cloze1 = tap(new Cloze())(c => {
      c.segment = "a";
      c.schedule.dueAtMinutes = 50;
    });
    createdNote.content = encloseInEnml(`
    <div>
      Hello<br/><br/>
      [term1] Thing<br/>
      ${formatCloze(cloze1)}<br/>
    </div>
    `);
    createdNote.tagGuids = [];
    return userClient.updateNote(createdNote).doOnNext((updatedNote) => {
      createdNote = updatedNote;
    })
  }).flatMap(() => {
    return service.sync(testObjects.user);
  }).flatMap(() => {
    return testObjects.db.all("SELECT * FROM schedule", []).doOnNext(rows => {
      var sorted = rows.sort(
        (a:any, b:any) => (a.marker + a.clozeIdx < b.marker + b.clozeIdx) ? -1 : 1);
      sorted.forEach((r:any) => delete r["id"]);

      assert.deepEqual(rows, [
        {
          "clozeIdentifier": `${createdNote.guid};term1;0`,
          "studyBookId": 2,
          "noteId": createdNote.guid,
          "marker": "term1",
          "clozeIdx": 0,
          "dueAtMinutes": 50,
          "noteVersion": createdNote.updateSequenceNum,
          "tags": "  ",
          "leaseExpiresAtUnix": -1
        }
      ]);
    })
  }).flatMap(() => {
    return userClient.deleteNote(createdNote.guid);
  }).flatMap(() => {
    return service.sync(testObjects.user);
  }).flatMap(() => {
    return testObjects.db.all("SELECT * FROM schedule", []).doOnNext(rows => {
      assert.equal(rows.length, 0);
    });
  }).catch(e => {
    assert.ok(false, e + "");
    return Rx.Observable.just(null);
  }).flatMap(() => {
    return Rx.Observable.merge(tap([] as Rx.Observable<any>[])(cleanup => {
      cleanup.push(userClient.deleteNotebook(testObjects.user.studyBook.guid));
      if (createdTagGuid) cleanup.push(userClient.deleteTag(createdTagGuid));
    })).toArray();
  }).finally(assert.async()).subscribe();
});

QUnit.test(`
  innerSync is only called once per batch of subscriptions,
  and removed from runningProcesses aftewards
`, (assert) => {
  var userStorage = new UserStorage(testObjects.db);
  var scheduleStorage = new MasterScheduleStorage(testObjects.db);
  var evernoteClient = new EvernoteClientRx(testObjects.testServer.config.evernoteConfig, undefined, true);
  var service = new MockedSyncService(userStorage, evernoteClient, scheduleStorage);

  var otherUser = tap(new User())(u => u.id = 10050);
  var sync1 = service.sync(testObjects.user).toArray().map(() => "sync1");
  var sync2 = service.sync(testObjects.user).toArray().map(() => "sync2");
  var sync3 = service.sync(otherUser).toArray().map(() => "sync3");
  var sync4 = service.sync(otherUser).toArray().map(() => "sync4");
  var firstSyncs = Rx.Observable.merge([sync1, sync2, sync3, sync4]);

  assert.deepEqual(Object.keys(service.runningProcesses).sort(),
    [testObjects.user.id + "", otherUser.id + ""].sort());

  Rx.Observable.merge([
    firstSyncs,
    Rx.Observable.create(observer => {
      assert.equal(service.innerSyncs.length, 2);
      observer.onNext("inner1");
      service.innerSyncs[0].onCompleted();
      observer.onNext("inner2");
      service.innerSyncs[1].onCompleted();
      observer.onCompleted();
    }),
    sync2.ignoreElements().doOnCompleted(() => {
      assert.deepEqual(Object.keys(service.runningProcesses), []);
    }),
    firstSyncs.ignoreElements().toArray().flatMap(() => {
      return service.sync(testObjects.user).catch((e) => {
          return Rx.Observable.just("sync5failed")
        })
        .flatMap((message) => {
          return Rx.Observable.create(observer => {
            Rx.Observable.merge([
              Rx.Observable.just(message),
              service.sync(testObjects.user).toArray().map(() => "sync6"),
              Rx.Observable.create(observer => {
                assert.equal(service.innerSyncs.length, 4);
                observer.onNext("inner4");
                service.innerSyncs[3].onCompleted();
                observer.onCompleted();
              }).delaySubscription(1)
            ]).subscribe(observer);
          }).delaySubscription(1);
        })
    }),
    firstSyncs.ignoreElements().toArray().flatMap(() => {
      return Rx.Observable.create(observer => {
        assert.equal(service.innerSyncs.length, 3);
        observer.onNext("inner3");
        service.innerSyncs[2].onError("womp womp");
        observer.onCompleted();
      }).delaySubscription(1);
    })
  ]).toArray().catch((e) => {
    assert.ok(false, e + "");
    return Rx.Observable.just(null);
  }).doOnNext((messages) => {
    assert.deepEqual(messages,
      ["inner1", "sync1", "sync2", "inner2", "sync3", "sync4", "inner3", "sync5failed", "inner4",
        "sync6"]);
  }).finally(assert.async()).subscribe();
});
