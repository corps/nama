import { AjaxHandler } from "../ajax-handler";
import * as QUnit from "qunitjs";
import FakeXHR = require("fake-xml-http-request");
import { tap } from "../../utils/obj";
import {ClientSession} from "../../sessions/session-model";
import * as Rx from "rx-lite";

var requests = [] as FakeXHR[];
var loggedOut = false;
QUnit.module("ajax-handler", {
  beforeEach: () => {
    requests = [];
    loggedOut = false;
  }
});

class Request {
  a = 1;
}

class Response {
  a = "";
}

function logoutHandler() {
  loggedOut = true;
}

var path = "/the/request/path";
var subPath = path;
var handler = new AjaxHandler<Request, Response>({
  Request,
  Response,
  path,
  subPath
}, logoutHandler, () => {
  return tap(new FakeXHR())(req => requests.push(req));
});

var clientSession = tap(new ClientSession())(s => {
  s.sessionXsrfToken = "tokenhere";
});

QUnit.test("happy path", (assert) => {
  handler.request(new Request(), clientSession)
    .doOnError((e) => {
      assert.ok(false, e + "");
    })
    .doOnNext((response) => {
      assert.deepEqual(response, new Response());
      assert.ok(!loggedOut, "expected not to be logged out");
    }).finally(assert.async()).subscribe();

  assert.equal(requests[0].requestBody, "{\"a\":1}");
  assert.deepEqual(requests[0].requestHeaders, {
    "Content-Type": "application/json",
    "Accept": "application/json",
    "X-Xsrf-Token": "tokenhere"
  });
  requests[0].respond(200, {}, JSON.stringify(new Response()));
});

QUnit.test("invalid payload", (assert) => {
  handler.request(new Request(), clientSession)
    .doOnNext((response) => {
      assert.ok(false, "Expected error");
    })
    .catch((e) => {
      assert.ok(e.toString().indexOf("Invalid response payload") != -1);
      return Rx.Observable.just(null);
    })
    .finally(assert.async()).subscribe();

  requests[0].respond(200, {}, JSON.stringify({a: []}));
});

QUnit.test("return 500", (assert) => {
  handler.request(new Request(), clientSession)
    .doOnNext((response) => {
      assert.ok(false, "Expected error");
    })
    .catch((e) => {
      assert.equal(e, requests[0]);
      assert.ok(!loggedOut, "expected not to be logged out");
      return Rx.Observable.just(null)
    })
    .finally(assert.async()).subscribe();

  requests[0].respond(500, {}, JSON.stringify(new Response()));
});

QUnit.test("return 401", (assert) => {
  handler.request(new Request(), clientSession)
    .doOnError((e) => {
      assert.ok(false, e + "");
    })
    .doOnNext((response) => {
      assert.ok(false, "Expected error");
    })
    .doOnCompleted(() => {
      assert.ok(loggedOut, "expected to be logged out");
    }).finally(assert.async()).subscribe();

  requests[0].respond(401, {}, JSON.stringify(new Response()));
});

QUnit.test("timeout path", (assert) => {
  handler.request(new Request(), clientSession)
    .doOnNext((response) => {
      assert.ok(false, "Expected error");
    })
    .catch((e) => {
      assert.equal(e, requests[0]);
      assert.ok(!loggedOut);
      return Rx.Observable.just(null);
    })
    .finally(assert.async()).subscribe();

  requests[0].ontimeout(null);
});

QUnit.test("aborts the request when the observable is disposed", (assert) => {
  var disposable = handler.request(new Request(), clientSession).subscribe();
  assert.ok(!requests[0].aborted);
  disposable.dispose();
  assert.equal(requests[0].aborted, true);
});
