import * as QUnit from "qunitjs";
import { integrationModule, testObjects } from "../../integration-test-helpers/integration-test-helpers";
import { assignFromJson } from "../../model-helpers/model-helpers"
import { tap } from "../../utils/obj";
import {WebServerConfig} from "../web-server-config";
import { Api } from "../../api/endpoints";
import {User} from "../../user-model/user-model";
import * as Rx from "rx";
import {ServerSession} from "../../sessions/session-model";
import { Headers } from "../header-and-cookie-names";

integrationModule(__filename);

QUnit.test("json requests are rejected until the xsrf matches the session", (assert) => {
  var endpoint = new Api.Endpoint("myendpoint", Object, Object);
  var handlers = [{
    endpoint: endpoint,
    handle: (req:Object, res:Object, user$:Rx.Observable<User>) => {
      return Rx.Observable.just(res);
    }
  }];
  testObjects.testServer.jsonServiceHandlers = () => handlers;

  testObjects.testServer.testRouter.get("/setsession", (req, res) => {
    var session = req.session as ServerSession;
    session.sessionXsrfToken = "session-token";
    res.send("Set");
  });

  testObjects.testServer.start();

  testObjects.testClient.jsonRequest(endpoint.path, {})
    .flatMap(([res, body]) => {
      assert.deepEqual(body, {error: true, xsrfFailure: true});
      assert.equal(res.statusCode, 401);
      return testObjects.testClient.request("/setsession");
    })
    .flatMap(([res, body]) => {
      assert.deepEqual(body, "Set");
      assert.equal(res.statusCode, 200);
      return testObjects.testClient.jsonRequest(endpoint.path, {},
        {[Headers.XSRF_TOKEN]: "session-token"});
    })
    .flatMap(([res, body]) => {
      assert.deepEqual(body, {});
      assert.equal(res.statusCode, 200);
      return testObjects.testClient.jsonRequest(endpoint.path, {},
        {[Headers.XSRF_TOKEN]: "wrong-token"});
    })
    .map(([res, body]) => {
      assert.deepEqual(body, {error: true, xsrfFailure: true});
      assert.equal(res.statusCode, 401);
      return null;
    }).finally(() => testObjects.testServer.close())
    .merge(testObjects.testServer.lifecycle$.map(() => null))
    .doOnError((e) => {
      assert.ok(false, e + "");
    })
    .finally(assert.async())
    .subscribe();
})
