import * as QUnit from "qunitjs";
import * as Rx from "rx";
import { User, OauthLogin, StudyBook } from "../../user-model/user-model";
import { tap } from "../../utils/obj";
import { testObjects, integrationModule } from "../../integration-test-helpers/integration-test-helpers";
import { UserStorage } from "../user-storage";

integrationModule(__filename);

QUnit.test("lookupUserById fails for a missing user id", (assert) => {
  assert.expect(1);

  var storage = new UserStorage(testObjects.db);
  storage.lookupUserById(192384)
    .finally(assert.async())
    .doOnNext((v) => {
      assert.equal(false, "Expected a failure");
    })
    .subscribeOnError((e) => {
      assert.equal(e.toString(), "Error: No user found by id 192384");
    });
});

QUnit.test("lookupUserById leaves the study book empty when does not exist", (assert) => {
  assert.expect(1);

  var storage = new UserStorage(testObjects.db);
  var login = new OauthLogin();
  login.externalId = "abcdef";
  login.provider = "evernote";
  login.secret = "abcdef";
  login.token = "abcdef";
  storage.createOrUpdateUserForLogin(login).flatMap((userId) => {
    return storage.lookupUserById(userId)
  }).doOnNext((user:User) => {
    assert.equal(user.studyBook.guid, "");
  }).catch((e) => {
    assert.ok(false, e + "");
    return Rx.Observable.empty();
  }).finally(assert.async()).subscribe();
});

QUnit.test("createOrUpdateUserForLogin will update and return the existing user id", (assert) => {
  var storage = new UserStorage(testObjects.db);
  assert.expect(2);

  testObjects.user.logins[0].secret = "newsecret";
  testObjects.user.logins[0].token = "newtoken";

  storage.createOrUpdateUserForLogin(testObjects.user.logins[0]).flatMap(userId => {
    assert.equal(userId, testObjects.user.id);
    return storage.lookupUserById(userId);
  }).map((updatedUser) => {
    assert.deepEqual(JSON.parse(JSON.stringify(testObjects.user)),
      JSON.parse(JSON.stringify(updatedUser)));
  }).finally(assert.async()).subscribeOnError((e) => {
    assert.ok(false, e + "");
  })
});

QUnit.test("updatedStudyBook updates the given study book's version", (assert) => {
  var storage = new UserStorage(testObjects.db);
  assert.expect(1);

  storage.updateStudyBook(testObjects.user.studyBook.id, 999).flatMap(() => {
    return storage.lookupUserById(testObjects.user.id);
  }).map((updatedUser) => {
    assert.equal(updatedUser.studyBook.syncVersion, 999);
  }).finally(assert.async()).subscribeOnError((e) => {
    assert.ok(false, e + "");
  })
});

QUnit.test("addOrUpdateAccountForUser updates the given account if for its user", (assert) => {
  var storage = new UserStorage(testObjects.db);
  assert.expect(2);

  testObjects.user.logins[0].token = "newtoken";
  testObjects.user.logins[0].secret = "newsecret";

  storage.addOrUpdateAccountForUser(testObjects.user.id, testObjects.user.logins[0]).flatMap((noConflicts) => {
    assert.ok(noConflicts);
    return storage.lookupUserById(testObjects.user.id);
  }).map((updatedUser) => {
    assert.deepEqual(JSON.parse(JSON.stringify(testObjects.user)), JSON.parse(JSON.stringify(updatedUser)));
  }).finally(assert.async()).subscribeOnError((e) => {
    assert.ok(false, e + "");
  })
});

QUnit.test("addOrUpdateAccountForUser does not update the given account if for a different user",
  (assert) => {
    var storage = new UserStorage(testObjects.db);
    assert.expect(3);

    testObjects.user.logins[0].token = "newtoken";
    testObjects.user.logins[0].secret = "newsecret";

    storage.addOrUpdateAccountForUser(-100, testObjects.user.logins[0]).flatMap((noConflicts) => {
      assert.ok(!noConflicts);
      return storage.lookupUserById(testObjects.user.id);
    }).map((updatedUser) => {
      assert.notEqual(updatedUser.logins[0].token, testObjects.user.logins[0].token);
      assert.notEqual(updatedUser.logins[0].secret, testObjects.user.logins[0].secret);
    }).finally(assert.async()).subscribeOnError((e) => {
      assert.ok(false, e + "");
    })
  });

QUnit.test(`
  1. createOrUpdateUserForLogin creates a new user and associated login when one does not exist
  2. addOrUpdateAccountForUser creates a new associated login when one does not exist
  3. createNewStudyBook creates new studybooks and returns the new id
  4. lookupUserById returns all the associated related data.
  5. query strategies are valid.
`, (assert) => {
  assert.expect(8);

  testObjects.db.queryExplanationsEnabled = true;
  var storage = new UserStorage(testObjects.db);

  var login1 = tap(new OauthLogin())(l => {
    l.provider = "provider";
    l.secret = "secret";
    l.token = "token";
    l.externalId = "externalId";
  });

  var login2 = tap(new OauthLogin())(l => {
    l.provider = "provider2";
    l.secret = "secret2";
    l.token = "token2";
    l.externalId = "externalId2";
  });

  storage.createOrUpdateUserForLogin(login1).flatMap((userId) => {
    assert.notEqual(userId, testObjects.user.id); // new user
    return storage.addOrUpdateAccountForUser(userId, login2)
      .flatMap((noConflict) =>
        storage.addNewStudyBook(userId, "some-new-guid", 3))
      .flatMap(() => storage.addNewStudyBook(userId, "another-guid", 5))
      .flatMap((returnedStudyBookId) =>
        storage.lookupUserById(userId).flatMap((u) => {
          testObjects.db.queryExplanationsEnabled = false;
          return testObjects.db.get("SELECT id FROM studyBooks ORDER BY id DESC LIMIT 1", [])
            .map(row => {
              assert.equal(returnedStudyBookId, row.id);
              return {
                user: u,
                studyBookId: row.id
              }
            })
        })
      )
      .doOnNext(({user, studyBookId}:{user:User, studyBookId:number}) => {
        assert.equal(user.id, userId);
        assert.equal(user.studyBook.guid, "another-guid");
        assert.equal(user.studyBook.syncVersion, 5);
        assert.equal(user.studyBook.id, studyBookId);
        user.logins.sort((a, b) => a.provider < b.provider ? -1 : 1)

        assert.deepEqual(JSON.parse(JSON.stringify(user.logins)), [
          {
            "provider": "provider",
            "token": "token",
            "secret": "secret",
            "externalId": "externalId"
          }, {
            "provider": "provider2",
            "token": "token2",
            "secret": "secret2",
            "externalId": "externalId2"
          }
        ]);

        assert.deepEqual(testObjects.db.queryExplanations,
          [["SEARCH TABLE oauthLogins USING INDEX idxUniqOauthLogins (provider=? AND externalId=?)"],
            ["SEARCH TABLE oauthLogins USING INDEX idxUniqOauthLogins (provider=? AND externalId=?)"],
            ["SEARCH TABLE users USING INTEGER PRIMARY KEY (rowid=?)"],
            ["SEARCH TABLE oauthLogins USING INDEX idxOauthByUserId (userId=?)"],
            ["SEARCH TABLE studyBooks USING INDEX idxStudyBookUserId (userId=?)"]]);
      })
  }).finally(assert.async()).subscribeOnError((e) => {
    assert.ok(false, e + "");
  });
});
