import { LocalSettingsStorage } from "../local-settings-storage";
import * as QUnit from "qunitjs";
import {MemoryStorage} from "../local-storage";
import {LocalStorage} from "../local-storage";
import * as session from "../../sessions/fronted-session";
import {LocalSettings} from "../local-settings-model";
import * as Rx from "rx-lite";
import {ClientSession} from "../../sessions/session-model";
import { tap, transform } from "../../utils/obj";

var loggedOut = false;
QUnit.module("local-settings-storage", {
  beforeEach: () => {
    loggedOut = false;
    storage.clear();
    session.logout();
  }
});

var storage = new LocalStorage(new MemoryStorage());
var settingsStorage = new LocalSettingsStorage(storage, () => loggedOut = true)

QUnit.test("session and settings are both logged out", (assert) => {
  var setting$ = new Rx.Subject<LocalSettings>();
  var loadSettings = new Rx.Subject<LocalSettings>();

  loadSettings.toArray().doOnNext((settings) => {
    assert.deepEqual(settings, [new LocalSettings()]);
    assert.deepEqual(settingsStorage.loadSettings(), new LocalSettings());
    assert.equal(loggedOut, true);
  }).finally(assert.async()).subscribe();

  settingsStorage.connect(setting$, loadSettings);
  assert.equal(loggedOut, false);
  assert.deepEqual(settingsStorage.loadSettings(), new LocalSettings());

  setting$.onNext(tap(new LocalSettings())(s => s.maxQueueSize = 100));

  loadSettings.onCompleted();
  setting$.onCompleted();
});

QUnit.test("session is logged in, settings are not", (assert) => {
  var setting$ = new Rx.Subject<LocalSettings>();
  var loadSettings = new Rx.Subject<LocalSettings>();

  session.login(tap(new ClientSession())(s => s.loggedInUserId = 0));

  var idUpdatedSettings = tap(new LocalSettings())(s => s.userId = 0);
  loadSettings.toArray().doOnNext((settings) => {
    assert.deepEqual(settings, [idUpdatedSettings]);
    assert.equal(loggedOut, false);
    assert.deepEqual(settingsStorage.loadSettings(), newSettings);
  }).finally(assert.async()).subscribe();

  settingsStorage.connect(setting$, loadSettings);
  assert.equal(loggedOut, false);
  assert.deepEqual(settingsStorage.loadSettings(), idUpdatedSettings);

  var newSettings = transform(idUpdatedSettings)(s => s.maxQueueSize = 100);
  setting$.onNext(newSettings);

  loadSettings.onCompleted();
  setting$.onCompleted();
});

QUnit.test("settings is logged in, session is not", (assert) => {
  var setting$ = new Rx.Subject<LocalSettings>();
  var loadSettings = new Rx.Subject<LocalSettings>();

  var expectedSettings = tap(new LocalSettings())(s => s.userId = 0);
  settingsStorage.writeSettings(expectedSettings);

  loadSettings.toArray().doOnNext((settings) => {
    assert.deepEqual(settings, [expectedSettings]);
    assert.equal(loggedOut, true);
    assert.deepEqual(settingsStorage.loadSettings(), expectedSettings);
  }).finally(assert.async()).subscribe();

  settingsStorage.connect(setting$, loadSettings);
  assert.equal(loggedOut, false);
  assert.deepEqual(settingsStorage.loadSettings(), expectedSettings);

  var newSettings = transform(expectedSettings)(s => s.maxQueueSize = 100);
  setting$.onNext(newSettings);

  loadSettings.onCompleted();
  setting$.onCompleted();
});

QUnit.test("settings and session logged in, but disagree", (assert) => {
  var setting$ = new Rx.Subject<LocalSettings>();
  var loadSettings = new Rx.Subject<LocalSettings>();

  var savedSession = tap(new LocalSettings())(s => s.userId = 0);
  settingsStorage.writeSettings(savedSession);
  session.login(tap(new ClientSession())(s => s.loggedInUserId = 1));

  loadSettings.toArray().doOnNext((settings) => {
    assert.deepEqual(settings, []);
  }).finally(assert.async()).subscribe();

  settingsStorage.connect(setting$, loadSettings);
  assert.equal(loggedOut, true);
  assert.deepEqual(settingsStorage.loadSettings(), savedSession);

  setting$.onCompleted();
  loadSettings.onCompleted();
});

QUnit.test("settings and session logged in, but agree", (assert) => {
  var setting$ = new Rx.Subject<LocalSettings>();
  var loadSettings = new Rx.Subject<LocalSettings>();

  var savedSession = tap(new LocalSettings())(s => s.userId = 1);
  settingsStorage.writeSettings(savedSession);
  session.login(tap(new ClientSession())(s => s.loggedInUserId = 1));

  loadSettings.toArray().doOnNext((settings) => {
    assert.deepEqual(settings, [savedSession]);
    assert.equal(loggedOut, true);
    assert.deepEqual(settingsStorage.loadSettings(), savedSession);
  }).finally(assert.async()).subscribe();

  settingsStorage.connect(setting$, loadSettings);
  assert.equal(loggedOut, false);
  assert.deepEqual(settingsStorage.loadSettings(), savedSession);

  setting$.onNext(transform(savedSession)(s => s.userId = 2));

  setting$.onCompleted();
  loadSettings.onCompleted();
});
