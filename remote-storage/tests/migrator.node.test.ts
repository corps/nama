import * as QUnit from "qunitjs";
import * as path from "path";
import { Migrator } from "../migrator";
import { DatabaseRx } from "../../database-rx/database-rx";
import * as Rx from "rx";
import * as fs from "fs";

var db:DatabaseRx;

QUnit.module(__filename, {
  beforeEach: (assert) => {
    DatabaseRx.open(':memory:')
      .doOnNext(_db => {
        db = _db;
      })
      .catch((err) => {
        assert.ok(false, err + "")
        return null;
      })
      .subscribeOnCompleted(assert.async());
  },
  afterEach: (assert) => {
    db.close()
      .catch((err) => {
        assert.ok(false, err + "")
        return null;
      })
      .subscribeOnCompleted(assert.async());
  }
});

QUnit.test("findMigrations ignores sub directories and returns files in alpha order", (assert) => {
  var migrator = new Migrator(db);
  migrator.findMigrations(path.join(__dirname, "migrations")).toArray().doOnNext((migrations) => {
    var names = ["000-test.sql", "001-test.sql", "002-test.sql", "003-test.sql"];
    var fileNames = names.map(n => path.join(__dirname, "migrations", n));
    var fileContents = fileNames.map(n => fs.readFileSync(n, "utf8"));
    assert.deepEqual(migrations.map(m => m.name), names);
    assert.deepEqual(migrations.map(m => m.contents), fileContents);
  }).doOnError((err) => {
    assert.ok(false, err + "");
  }).catch(Rx.Observable.just(null))
    .subscribeOnCompleted(assert.async());
});

QUnit.test("run inserts the migration name after executting a successful migration", (assert) => {
  var migrator = new Migrator(db);

  migrator.run({
    name: "thename",
    contents: fs.readFileSync(path.join(__dirname, "migrations", "000-test.sql"), "utf8")
  }).flatMap(() => {
    return db.all("SELECT name FROM migrations", []);
  }).flatMap((migrations) => {
    assert.deepEqual(migrations, [{name: "thename"}])
    return db.all("SELECT sql FROM sqlite_master", []);
  }).doOnNext((sql) => {
    assert.deepEqual(sql, [
      {"sql": "CREATE TABLE migrations ( name VARCHAR NOT NULL )"},
      {"sql": "CREATE TABLE test ( id INTEGER NOT NULL PRIMARY KEY )"},
      {"sql": "CREATE TABLE test2 ( id INTEGER NOT NULL PRIMARY KEY )"},
      {"sql": "CREATE TABLE test3 ( id INTEGER NOT NULL PRIMARY KEY )"},
      {"sql": "CREATE TABLE test4 ( id INTEGER NOT NULL PRIMARY KEY )"},
      {"sql": "CREATE TABLE test5 ( id INTEGER NOT NULL PRIMARY KEY )"}]);
  }).doOnError((err) => {
    assert.ok(false, err + "");
  }).catch(Rx.Observable.just(null))
    .subscribeOnCompleted(assert.async());
});

QUnit.test("runAll applies each migration one at a time", (assert) => {
  var migrator = new Migrator(db);

  var migration$ = migrator.findMigrations(path.join(__dirname, "migrations"));
  migrator.runAll(migration$).toArray().flatMap(() => {
    return db.all("SELECT name FROM migrations", []);
  }).flatMap((migrations) => {
    assert.deepEqual(migrations,
      [{"name": "000-test.sql"}, {"name": "001-test.sql"}, {"name": "002-test.sql"},
        {"name": "003-test.sql"}])
    return db.all("SELECT sql FROM sqlite_master", []);
  }).doOnNext((sql) => {
    assert.deepEqual(sql, [
      {"sql": "CREATE TABLE migrations ( name VARCHAR NOT NULL )"},
      {"sql": "CREATE TABLE test ( id INTEGER NOT NULL PRIMARY KEY )"},
      {"sql": "CREATE TABLE test2 ( id INTEGER NOT NULL PRIMARY KEY )"},
      {"sql": "CREATE TABLE test3 ( id INTEGER NOT NULL PRIMARY KEY )"},
      {"sql": "CREATE TABLE test4 ( id INTEGER NOT NULL PRIMARY KEY )"},
      {"sql": "CREATE TABLE test5 ( id INTEGER NOT NULL PRIMARY KEY )"},
      {"sql": "CREATE INDEX idx_test2_idx ON test2 (id)"},
    ]);
  }).doOnError((err) => {
    assert.ok(false, err + "");
  }).catch(Rx.Observable.just(null))
    .subscribeOnCompleted(assert.async());
});

QUnit.test("runAll will skip to migrations after the latest entry in the migrations table",
  (assert) => {
    var migrator = new Migrator(db);

    migrator.run({
      name: "002-test.sql",
      contents: ""
    }).flatMap(() => {
      return migrator.run({
        name: "001-test.sql",
        contents: ""
      });
    }).flatMap(() => {
      var migration$ = migrator.findMigrations(path.join(__dirname, "migrations"));
      return migrator.runAll(migration$).toArray()
    }).doOnNext(() => {
      assert.ok(false, "expected failure!");
    }).catch(
      (e) => {
        assert.equal(e + "",
          "Error: 003-test.sql failed: Error: SQLITE_ERROR: no such index: idx_test3_idx");
        return Rx.Observable.just(null);
      })
      .subscribeOnCompleted(assert.async());
  });

QUnit.test("runAll would process the production migrations sqls", (assert) => {
  var migrator = new Migrator(db);

  var migration$ = migrator.findMigrations();
  return migrator.runAll(migration$).toArray()
    .doOnNext(() => {
      assert.ok(true);
    })
    .doOnError((e) => {
      assert.ok(false, e + "")
    })
    .catch(Rx.Observable.just(null))
    .subscribeOnCompleted(assert.async());
});
