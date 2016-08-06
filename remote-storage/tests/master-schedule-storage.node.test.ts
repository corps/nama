import * as QUnit from "qunitjs";
import * as Rx from "rx";
import {User, OauthLogin} from "../../user-model/user-model";
import {tap} from "../../utils/obj";
import {ClozeIdentifier} from "../../study-model/note-model";
import {Schedule} from "../../study-model/schedule-model";
import {MasterScheduleStorage, ScheduleRow} from "../master-schedule-storage";
import {
  testObjects,
  integrationModule
} from "../../integration-test-helpers/integration-test-helpers";
import {UserStorage} from "../user-storage";

integrationModule(__filename);

function withoutIds<T>(v:T[]) {
  v.forEach((ve:any) => {
    delete ve["id"]
  });
  return v;
}

QUnit.test("recordNoteContents & getNoteContents", (assert) => {
  var storage = new MasterScheduleStorage(testObjects.db);

  storage.getNoteContents("doesnotexistyet").flatMap((v) => {
    assert.equal(v, null);

    return storage.recordNoteContents(testObjects.user.id, "noteId", 4, "Some contents");
  }).flatMap(() => {
    return storage.getNoteContents("noteId").doOnNext((v) => {
      assert.deepEqual(v, {
        id: 1,
        noteId: "noteId",
        noteVersion: 4,
        contents: "Some contents",
        userId: testObjects.user.id,
      });
    })
  }).flatMap(() => {
    return storage.recordNoteContents(testObjects.user.id, "noteId", 6, "More contents");
  }).flatMap(() => {
    return storage.getNoteContents("noteId").doOnNext((v) => {
      assert.deepEqual(v, {
        id: 1,
        noteId: "noteId",
        noteVersion: 6,
        userId: testObjects.user.id,
        contents: "More contents"
      });
    })
  }).flatMap(() => {
    return storage.recordNoteContents(testObjects.user.id, "noteId", 6, "Will not become this");
  }).flatMap(() => {
    return storage.getNoteContents("noteId").doOnNext((v) => {
      assert.deepEqual(v, {
        id: 1,
        noteId: "noteId",
        noteVersion: 6,
        userId: testObjects.user.id,
        contents: "More contents"
      });
    })
  }).doOnError((e) => {
    assert.ok(false, e + "");
  }).finally(assert.async())
    .subscribe();
});

QUnit.test("getRecentContents with no provided exclude ids works", (assert) => {
  var storage = new MasterScheduleStorage(testObjects.db);
  var userStorage = new UserStorage(testObjects.db);

  var login = new OauthLogin();
  var userId1:number;
  var userId2:number;

  login.provider = "test-provider";
  login.externalId = "abcdefg";

  userStorage.createOrUpdateUserForLogin(login).flatMap((user) => {
    userId1 = user;
    login.externalId = "abcdefghijkl";
    return userStorage.createOrUpdateUserForLogin(login);
  }).flatMap((user) => {
    userId2 = user;

    return Rx.Observable.merge(
      storage.recordNoteContents(userId2, "2-a", 1, "2-a-contents"),
      storage.recordNoteContents(userId1, "1-a", 1, "1-a-contents"),
      storage.recordNoteContents(userId2, "2-b", 1, "2-b-contents"),
      storage.recordNoteContents(userId1, "1-b", 1, "1-b-contents"),
      storage.recordNoteContents(userId1, "1-c", 1, "1-c-contents"),
      storage.recordNoteContents(userId1, "1-d", 1, "1-d-contents")
    ).toArray();
  }).flatMap(() => {
    return storage.getRecentContents(userId1, 3, []).toArray();
  }).doOnNext((contentRows) => {
    assert.deepEqual(withoutIds(contentRows),
      [{"noteId": "1-d", "noteVersion": 1, "contents": "1-d-contents", "userId": 2},
        {"noteId": "1-c", "noteVersion": 1, "contents": "1-c-contents", "userId": 2},
        {"noteId": "1-b", "noteVersion": 1, "contents": "1-b-contents", "userId": 2}]);
  }).catch((e) => {
    assert.ok(false, e + "");
    return Rx.Observable.just(null);
  }).doOnCompleted(assert.async())
    .subscribe();
});

QUnit.test("getRecentContents with some provided excluded ids works", (assert) => {
  var storage = new MasterScheduleStorage(testObjects.db);
  var userStorage = new UserStorage(testObjects.db);

  var login = new OauthLogin();
  var userId1:number;
  var userId2:number;

  login.provider = "test-provider";
  login.externalId = "abcdefg";

  userStorage.createOrUpdateUserForLogin(login).flatMap((user) => {
    userId1 = user;
    login.externalId = "abcdefghijkl";
    return userStorage.createOrUpdateUserForLogin(login);
  }).flatMap((user) => {
    userId2 = user;

    return Rx.Observable.merge(
      storage.recordNoteContents(userId2, "2-a", 1, "2-a-contents"),
      storage.recordNoteContents(userId1, "1-a", 1, "1-a-contents"),
      storage.recordNoteContents(userId2, "2-b", 1, "2-b-contents"),
      storage.recordNoteContents(userId1, "1-b", 1, "1-b-contents"),
      storage.recordNoteContents(userId1, "1-c", 1, "1-c-contents"),
      storage.recordNoteContents(userId1, "1-d", 1, "1-d-contents")
    ).toArray();
  }).flatMap(() => {
    return storage.getRecentContents(userId1, 3, ["1-c", "1-b"]).toArray();
  }).doOnNext((contentRows) => {
    assert.deepEqual(withoutIds(contentRows),
      [{"noteId": "1-d", "noteVersion": 1, "contents": "1-d-contents", "userId": 2},
        {"noteId": "1-a", "noteVersion": 1, "contents": "1-a-contents", "userId": 2}]);
  }).catch((e) => {
    assert.ok(false, e + "");
    return Rx.Observable.just(null);
  }).doOnCompleted(assert.async())
    .subscribe();
});

QUnit.test("recordSchedule first writes, then updates existing values", (assert) => {
  var storage = new MasterScheduleStorage(testObjects.db);
  var userStorage = new UserStorage(testObjects.db);

  var clozeIdentifier = tap(new ClozeIdentifier())(i => {
    i.termMarker = "some-marker";
    i.clozeIdx = 4;
    i.noteId = "some-note";
  });

  var foundId = 0;
  storage.recordSchedule(testObjects.user, 50, clozeIdentifier, ["a", "b"],
    tap(new Schedule())(s => {
      s.dueAtMinutes = 100;
    })).flatMap(() => {
    return testObjects.db.all("SELECT * FROM schedule", []);
  }).flatMap((rows:ScheduleRow[]) => {
    if (rows.length > 0) {
      foundId = rows[0].id;
    }
    assert.deepEqual(rows, [{
      id: foundId,
      clozeIdentifier: clozeIdentifier.toString(),
      studyBookId: testObjects.user.studyBook.id,
      noteId: "some-note",
      marker: clozeIdentifier.termMarker,
      clozeIdx: clozeIdentifier.clozeIdx,
      dueAtMinutes: 100,
      noteVersion: 50,
      leaseExpiresAtUnix: -1,
      tags: " a b "
    }]);
    return userStorage.addNewStudyBook(testObjects.user.id, "newbookidthing", 0)
  }).flatMap((newBookId) => {
    testObjects.user.studyBook.id = newBookId;

    return storage.recordSchedule(testObjects.user, 51, clozeIdentifier, ["v"],
      tap(new Schedule())(s => {
        s.dueAtMinutes = 105;
      }))
  }).flatMap(() => {
    return testObjects.db.all("SELECT * FROM schedule", []);
  }).map((rows:ScheduleRow[]) => {
    assert.deepEqual(rows, [{
      id: foundId,
      clozeIdentifier: clozeIdentifier.toString(),
      studyBookId: testObjects.user.studyBook.id,
      noteId: "some-note",
      marker: clozeIdentifier.termMarker,
      clozeIdx: clozeIdentifier.clozeIdx,
      dueAtMinutes: 105,
      noteVersion: 51,
      leaseExpiresAtUnix: -1,
      tags: " v "
    }])
  }).catch((e) => {
    assert.ok(false, e + "");
    return Rx.Observable.just(null);
  }).subscribeOnCompleted(assert.async());
});

QUnit.test("recordSchedule fails correctly on bad value writes", (assert) => {
  var storage = new MasterScheduleStorage(testObjects.db);

  var clozeIdentifier = tap(new ClozeIdentifier())(i => {
    i.termMarker = "some-marker";
    i.clozeIdx = 4;
    i.noteId = "some-note";
  });

  storage.recordSchedule(testObjects.user, null, clozeIdentifier, [], tap(new Schedule())(s => {
    s.dueAtMinutes = 100;
  })).doOnCompleted(() => {
    assert.ok(false, "Did not expect to succeed!");
  }).catch((e) => {
    assert.equal(e + "",
      "Error: SQLITE_CONSTRAINT: NOT NULL constraint failed: schedule.noteVersion");
    return Rx.Observable.just(null);
  }).subscribeOnCompleted(assert.async());
});

QUnit.test("recordSchedule query plans", (assert) => {
  var storage = new MasterScheduleStorage(testObjects.db);

  var clozeIdentifier = tap(new ClozeIdentifier())(i => {
    i.termMarker = "some-marker";
    i.clozeIdx = 4;
    i.noteId = "some-note";
  });

  testObjects.db.queryExplanationsEnabled = true;
  storage.recordSchedule(testObjects.user, 50, clozeIdentifier, [], new Schedule()).flatMap(() => {
    return storage.recordSchedule(testObjects.user, 51, clozeIdentifier, [], new Schedule());
  }).doOnCompleted(() => {
    assert.deepEqual(testObjects.db.queryExplanations, [[
      "SEARCH TABLE schedule USING INDEX idxScheduleIdentifier (clozeIdentifier=?)"
    ]]);
  }).catch((e) => {
    assert.ok(false, e + "");
    return Rx.Observable.just(null);
  }).subscribeOnCompleted(assert.async());
});

QUnit.test("recordSchedule won't write schedules for versions less than the one recorded",
  (assert) => {
    var storage = new MasterScheduleStorage(testObjects.db);

    var clozeIdentifier = tap(new ClozeIdentifier())(i => {
      i.termMarker = "some-marker";
      i.clozeIdx = 4;
      i.noteId = "some-note";
    });

    storage.recordSchedule(testObjects.user, 50, clozeIdentifier, [], tap(new Schedule())(s => {
      s.dueAtMinutes = 100;
    })).flatMap(() => {
      return storage.recordSchedule(testObjects.user, 49, clozeIdentifier, [],
        tap(new Schedule())(s => {
          s.dueAtMinutes = 35;
        }));
    }).flatMap(() => {
      return testObjects.db.all("SELECT * FROM schedule", []);
    }).doOnNext((rows:ScheduleRow[]) => {
      assert.equal(rows.length, 1);
      assert.equal(rows[0].noteVersion, 50);
      assert.equal(rows[0].dueAtMinutes, 100);
    }).catch((e) => {
      assert.ok(false, e + "");
      return Rx.Observable.just(null);
    }).subscribeOnCompleted(assert.async());
  });

function createSchedule(storage:MasterScheduleStorage,
                        ...schedules:([string, number]|[string, number, string[]])[]) {
  var result = Rx.Observable.just<void>(null);
  schedules.forEach((args) => {
    var id = args[0] as string;
    var due = args[1] as number;
    var tags = args[2] as string[] || [] as string[];

    var clozeIdentifier = new ClozeIdentifier();
    var schedule = new Schedule();
    clozeIdentifier.termMarker = "marker";
    clozeIdentifier.clozeIdx = 1;
    clozeIdentifier.noteId = id;
    schedule.dueAtMinutes = due;
    result = result.flatMap(() => {
      return storage.recordSchedule(testObjects.user, 2, clozeIdentifier, tags, schedule);
    })
  });
  return result;
}

QUnit.test("querying by tags limits to only entries that atleast contain those tags", (assert) => {
  var storage = new MasterScheduleStorage(testObjects.db);
  createSchedule(storage, ["a", 0, ["a", "v"]], ["b", 1, ["b", "va"]], ["c", 2],
    ["d", 3, ["d", "v"]])
    .flatMap(() => {
      return storage.findSchedule(testObjects.user, 0, 5, ["v"]).toArray();
    })
    .doOnNext((scheduleRows) => {
      assert.deepEqual(scheduleRows.map(r => r.clozeIdentifier), [
        "a;marker;1", "d;marker;1"
      ]);
    })
    .catch((e) => {
      assert.ok(false, e + "");
      return Rx.Observable.just(null);
    }).subscribeOnCompleted(assert.async());
});

QUnit.test("findNumDue returns the num of schedules due in the time frame with the given tags",
  (assert) => {
    var storage = new MasterScheduleStorage(testObjects.db);
    createSchedule(storage, ["a", 0, ["v"]], ["b", 1, ["v", "c"]], ["c", 2], ["d", 3, ["v"]])
      .flatMap(() => {
        return storage.findNumDue(testObjects.user, 120, []);
      })
      .flatMap((num) => {
        assert.equal(num, 3);
        return storage.findNumDue(testObjects.user, 120, ["v", "c"]);
      })
      .doOnNext((num) => {
        assert.equal(num, 1)
      })
      .catch((e) => {
        assert.ok(false, e + "");
        return Rx.Observable.just(null);
      }).subscribeOnCompleted(assert.async());
  });

QUnit.test("deleteAllInNote removes all schedules for a given noteId", (assert) => {
  var lastClozeIdx = 0;
  var lastVersion = 0;
  var storage = new MasterScheduleStorage(testObjects.db);
  Rx.Observable.from(["a", "b", "a", "a", "c"]).flatMap((noteId) => {
    var clozeIdentifier = new ClozeIdentifier();
    var schedule = new Schedule();
    clozeIdentifier.termMarker = "marker";
    clozeIdentifier.clozeIdx = lastClozeIdx++;
    clozeIdentifier.noteId = noteId;
    schedule.dueAtMinutes = 0;
    return storage.recordSchedule(testObjects.user, lastVersion++, clozeIdentifier, [], schedule);
  }).toArray().flatMap(() => {
    return storage.deleteAllInNote("a", 3);
  }).flatMap(() => {
    return storage.findSchedule(testObjects.user, 0, 10, []).toArray();
  }).doOnNext((schedules) => {
    assert.deepEqual(schedules.map(s => s.clozeIdentifier).sort(),
      ["a;marker;3", "b;marker;1", "c;marker;4"]);
  }).catch((e) => {
    assert.ok(false, e + "");
    return Rx.Observable.just(null);
  }).finally(assert.async()).subscribe();
})

QUnit.test("deleteAllOtherTerms removes all other scheduled terms for the given note", (assert) => {
  var lastClozeIdx = 0;
  var lastNoteVersion = 0;
  var storage = new MasterScheduleStorage(testObjects.db);
  Rx.Observable.from(["a-1", "b-1", "a-2", "a-2", "a-3", "c-5", "c-3"]).flatMap((template) => {
    var [noteId, marker] = template.split("-");
    var clozeIdentifier = new ClozeIdentifier();
    var schedule = new Schedule();
    clozeIdentifier.termMarker = marker;
    clozeIdentifier.clozeIdx = lastClozeIdx++;
    clozeIdentifier.noteId = noteId;
    schedule.dueAtMinutes = 0;
    return storage.recordSchedule(testObjects.user, lastNoteVersion++, clozeIdentifier, [],
      schedule);
  }).toArray()
    .flatMap(() => {
      return storage.deleteAllOtherTerms("a", ["1"], 3);
    })
    .flatMap(() => {
      return storage.deleteAllOtherTerms("c", [], 100);
    })
    .flatMap(() => {
      return storage.findSchedule(testObjects.user, 0, 10, []).toArray();
    }).doOnNext((schedules) => {
    assert.deepEqual(schedules.map(s => s.clozeIdentifier).sort(),
      ["a;1;0", "a;2;3", "a;3;4", "b;1;1"]);
  }).catch((e) => {
    assert.ok(false, e + "");
    return Rx.Observable.just(null);
  }).finally(assert.async()).subscribe();
});

QUnit.test("deleteAllOtherClozes removes all other scheduled clozes for the given term",
  (assert) => {
    var lastNoteVersion = 0;
    var storage = new MasterScheduleStorage(testObjects.db);
    Rx.Observable.from([
      "a-1-0", "a-1-1", "a-1-2", "a-2-0", "a-2-1", "a-2-2", "b-1-0", "b-1-1", "b-1-2"
    ]).flatMap((template) => {
      var [noteId, marker, index] = template.split("-");
      var clozeIdentifier = new ClozeIdentifier();
      var schedule = new Schedule();
      clozeIdentifier.termMarker = marker;
      clozeIdentifier.clozeIdx = parseInt(index, 10);
      clozeIdentifier.noteId = noteId;
      schedule.dueAtMinutes = 0;
      return storage.recordSchedule(testObjects.user, lastNoteVersion++, clozeIdentifier, [],
        schedule);
    }).toArray()
      .flatMap(() => {
        return storage.deleteAllOtherClozes("a", "1", 2, 100);
      })
      .flatMap(() => {
        return storage.findSchedule(testObjects.user, 0, 10, []).toArray().doOnNext((schedules) => {
          assert.deepEqual(schedules.map(s => s.clozeIdentifier).sort(),
            ["a;1;0", "a;1;1", "a;2;0", "a;2;1", "a;2;2", "b;1;0", "b;1;1", "b;1;2"]);
        });
      })
      .flatMap(() => {
        return storage.deleteAllOtherClozes("b", "1", 0, 4);
      })
      .flatMap(() => {
        return storage.findSchedule(testObjects.user, 0, 10, []).toArray();
      }).doOnNext((schedules) => {
      assert.deepEqual(schedules.map(s => s.clozeIdentifier).sort(),
        ["a;1;0", "a;1;1", "a;2;0", "a;2;1", "a;2;2", "b;1;0", "b;1;1", "b;1;2"]);
    }).catch((e) => {
      assert.ok(false, e + "");
      return Rx.Observable.just(null);
    }).finally(assert.async()).subscribe();
  });

QUnit.test("lease takes scheduled items off the availability until its expiration", (assert) => {
  var storage = new MasterScheduleStorage(testObjects.db);
  createSchedule(storage, ["a", 0], ["b", 1], ["c", 2], ["d", 3]).flatMap(() => {
    return storage.findSchedule(testObjects.user, 0, 5, []).toArray();
  }).flatMap((scheduleRows) => {
    assert.equal(scheduleRows.length, 4);
    return storage.lease(scheduleRows.slice(1, 3), 500);
  }).flatMap(() => {
    return storage.findSchedule(testObjects.user, 0, 5, []).toArray();
  }).flatMap((scheduleRows) => {
    assert.deepEqual(scheduleRows, [{
      "id": 1,
      "clozeIdentifier": "a;marker;1",
      "studyBookId": 1,
      "noteId": "a",
      "marker": "marker",
      "clozeIdx": 1,
      "dueAtMinutes": 0,
      "noteVersion": 2,
      "leaseExpiresAtUnix": -1,
      "tags": "  "
    }, {
      "id": 4,
      "clozeIdentifier": "d;marker;1",
      "studyBookId": 1,
      "noteId": "d",
      "marker": "marker",
      "clozeIdx": 1,
      "dueAtMinutes": 3,
      "noteVersion": 2,
      "leaseExpiresAtUnix": -1,
      "tags": "  "
    }]);
    return storage.findSchedule(testObjects.user, 501, 5, []).toArray();
  }).map((scheduleRows) => {
    assert.equal(scheduleRows.length, 4);
  }).catch((e) => {
    assert.ok(false, e + "");
    return Rx.Observable.just(null);
  }).subscribeOnCompleted(assert.async());
});

QUnit.test("recordSchedule with clearLease = true clears the lease", (assert) => {
  var storage = new MasterScheduleStorage(testObjects.db);
  var aLeasedCloze:ClozeIdentifier;
  createSchedule(storage, ["a", 0], ["b", 1], ["c", 2], ["d", 3]).flatMap(() => {
    return storage.findSchedule(testObjects.user, 0, 5, []).toArray();
  }).flatMap((scheduleRows) => {
    assert.equal(scheduleRows.length, 4);
    aLeasedCloze = ClozeIdentifier.fromString(scheduleRows[1].clozeIdentifier);
    return storage.lease(scheduleRows.slice(1, 3), 500);
  }).flatMap(() => {
    return storage.findSchedule(testObjects.user, 0, 5, []).toArray();
  }).flatMap((scheduleRows) => {
    assert.equal(scheduleRows.length, 2);
    return storage.recordSchedule(testObjects.user, 10, aLeasedCloze, [], new Schedule(), false);
  }).flatMap(() => {
    return storage.findSchedule(testObjects.user, 0, 5, []).toArray();
  }).flatMap((scheduleRows) => {
    assert.equal(scheduleRows.length, 2);
    return storage.recordSchedule(testObjects.user, 11, aLeasedCloze, [], new Schedule(), true);
  }).flatMap(() => {
    return storage.findSchedule(testObjects.user, 0, 5, []).toArray();
  }).map((scheduleRows) => {
    assert.equal(scheduleRows.length, 3);
  }).catch((e) => {
    assert.ok(false, e + "");
    return Rx.Observable.just(null);
  }).subscribeOnCompleted(assert.async());
});

QUnit.test("findSchedule query strategies", (assert) => {
  var storage = new MasterScheduleStorage(testObjects.db);

  testObjects.db.queryExplanationsEnabled = true;
  createSchedule(storage, ["a", 0], ["b", 1, ["a", "b"]], ["c", 2], ["d", 3], ["e", 4])
    .flatMap(() => {
      return storage.findSchedule(testObjects.user, 60, 3, ["c", "d", "e"]);
    }).toArray().map(() => {
    assert.deepEqual(testObjects.db.queryExplanations, [
      ["SEARCH TABLE schedule USING INDEX idxScheduleByDue (studyBookId=? AND dueAtMinutes<?)"],
      ["SEARCH TABLE schedule USING INDEX idxScheduleByDue (studyBookId=? AND dueAtMinutes>?)"]
    ]);
  }).catch((e) => {
    assert.ok(false, e + "");
    return Rx.Observable.just(null);
  }).subscribeOnCompleted(assert.async());
});

QUnit.test("findSchedule when the past has enough to fulfill the request", (assert) => {
  var storage = new MasterScheduleStorage(testObjects.db);

  createSchedule(storage, ["a", 0], ["b", 1], ["c", 2], ["d", 3], ["e", 4]).flatMap(() => {
    return storage.findSchedule(testObjects.user, 120, 2, []);
  }).toArray().map((schedules) => {
    assert.deepEqual(schedules, [
      {
        "id": 3,
        "clozeIdentifier": "c;marker;1",
        "studyBookId": 1,
        "noteId": "c",
        "marker": "marker",
        "clozeIdx": 1,
        "dueAtMinutes": 2,
        "noteVersion": 2,
        "leaseExpiresAtUnix": -1,
        "tags": "  "
      }, {
        "id": 2,
        "clozeIdentifier": "b;marker;1",
        "studyBookId": 1,
        "noteId": "b",
        "marker": "marker",
        "clozeIdx": 1,
        "dueAtMinutes": 1,
        "noteVersion": 2,
        "leaseExpiresAtUnix": -1,
        "tags": "  "
      }
    ]);
  }).catch((e) => {
    assert.ok(false, e + "");
    return Rx.Observable.just(null);
  }).subscribeOnCompleted(assert.async());
});

QUnit.test("findSchedule when the past and future are consulted to fulfill the request",
  (assert) => {
    var storage = new MasterScheduleStorage(testObjects.db);

    createSchedule(storage, ["a", 0], ["b", 1], ["c", 2], ["d", 3], ["e", 4]).flatMap(() => {
      return storage.findSchedule(testObjects.user, 60, 3, []);
    }).toArray().map((schedules) => {
      assert.deepEqual(schedules, [{
        "id": 2,
        "clozeIdentifier": "b;marker;1",
        "studyBookId": 1,
        "noteId": "b",
        "marker": "marker",
        "clozeIdx": 1,
        "dueAtMinutes": 1,
        "noteVersion": 2,
        "leaseExpiresAtUnix": -1,
        "tags": "  "
      }, {
        "id": 1,
        "clozeIdentifier": "a;marker;1",
        "studyBookId": 1,
        "noteId": "a",
        "marker": "marker",
        "clozeIdx": 1,
        "dueAtMinutes": 0,
        "noteVersion": 2,
        "leaseExpiresAtUnix": -1,
        "tags": "  "
      }, {
        "id": 3,
        "clozeIdentifier": "c;marker;1",
        "studyBookId": 1,
        "noteId": "c",
        "marker": "marker",
        "clozeIdx": 1,
        "dueAtMinutes": 2,
        "noteVersion": 2,
        "leaseExpiresAtUnix": -1,
        "tags": "  "
      }]);
    }).catch((e) => {
      assert.ok(false, e + "");
      return Rx.Observable.just(null);
    }).subscribeOnCompleted(assert.async());
  });

QUnit.test("findSchedule the future is all there is to fulfill a request",
  (assert) => {
    var storage = new MasterScheduleStorage(testObjects.db);

    createSchedule(storage, ["a", 1], ["b", 2], ["c", 3], ["d", 4], ["e", 5]).flatMap(() => {
      return storage.findSchedule(testObjects.user, 0, 100, []);
    }).toArray().map((schedules) => {
      assert.deepEqual(schedules, [{
        "id": 1,
        "clozeIdentifier": "a;marker;1",
        "studyBookId": 1,
        "noteId": "a",
        "marker": "marker",
        "clozeIdx": 1,
        "dueAtMinutes": 1,
        "noteVersion": 2,
        "leaseExpiresAtUnix": -1,
        "tags": "  "
      }, {
        "id": 2,
        "clozeIdentifier": "b;marker;1",
        "studyBookId": 1,
        "noteId": "b",
        "marker": "marker",
        "clozeIdx": 1,
        "dueAtMinutes": 2,
        "noteVersion": 2,
        "leaseExpiresAtUnix": -1,
        "tags": "  "
      }, {
        "id": 3,
        "clozeIdentifier": "c;marker;1",
        "studyBookId": 1,
        "noteId": "c",
        "marker": "marker",
        "clozeIdx": 1,
        "dueAtMinutes": 3,
        "noteVersion": 2,
        "leaseExpiresAtUnix": -1,
        "tags": "  "
      }, {
        "id": 4,
        "clozeIdentifier": "d;marker;1",
        "studyBookId": 1,
        "noteId": "d",
        "marker": "marker",
        "clozeIdx": 1,
        "dueAtMinutes": 4,
        "noteVersion": 2,
        "leaseExpiresAtUnix": -1,
        "tags": "  "
      }, {
        "id": 5,
        "clozeIdentifier": "e;marker;1",
        "studyBookId": 1,
        "noteId": "e",
        "marker": "marker",
        "clozeIdx": 1,
        "dueAtMinutes": 5,
        "noteVersion": 2,
        "leaseExpiresAtUnix": -1,
        "tags": "  "
      }]);
    }).catch((e) => {
      assert.ok(false, e + "");
      return Rx.Observable.just(null);
    }).subscribeOnCompleted(assert.async());
  });

QUnit.test("findSchedule when there is no future to continue fulfilling a request",
  (assert) => {
    var storage = new MasterScheduleStorage(testObjects.db);

    createSchedule(storage, ["a", 0], ["b", 1], ["c", 2], ["d", 3], ["e", 4]).flatMap(() => {
      return storage.findSchedule(testObjects.user, 1000, 100, []);
    }).toArray().map((schedules) => {
      assert.deepEqual(schedules, [{
        "id": 5,
        "clozeIdentifier": "e;marker;1",
        "studyBookId": 1,
        "noteId": "e",
        "marker": "marker",
        "clozeIdx": 1,
        "dueAtMinutes": 4,
        "noteVersion": 2,
        "leaseExpiresAtUnix": -1,
        "tags": "  "
      }, {
        "id": 4,
        "clozeIdentifier": "d;marker;1",
        "studyBookId": 1,
        "noteId": "d",
        "marker": "marker",
        "clozeIdx": 1,
        "dueAtMinutes": 3,
        "noteVersion": 2,
        "leaseExpiresAtUnix": -1,
        "tags": "  "
      }, {
        "id": 3,
        "clozeIdentifier": "c;marker;1",
        "studyBookId": 1,
        "noteId": "c",
        "marker": "marker",
        "clozeIdx": 1,
        "dueAtMinutes": 2,
        "noteVersion": 2,
        "leaseExpiresAtUnix": -1,
        "tags": "  "
      }, {
        "id": 2,
        "clozeIdentifier": "b;marker;1",
        "studyBookId": 1,
        "noteId": "b",
        "marker": "marker",
        "clozeIdx": 1,
        "dueAtMinutes": 1,
        "noteVersion": 2,
        "leaseExpiresAtUnix": -1,
        "tags": "  "
      }, {
        "id": 1,
        "clozeIdentifier": "a;marker;1",
        "studyBookId": 1,
        "noteId": "a",
        "marker": "marker",
        "clozeIdx": 1,
        "dueAtMinutes": 0,
        "noteVersion": 2,
        "leaseExpiresAtUnix": -1,
        "tags": "  "
      }]);
    }).catch((e) => {
      assert.ok(false, e + "");
      return Rx.Observable.just(null);
    }).subscribeOnCompleted(assert.async());
  });
