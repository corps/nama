import { runPage, Page } from "../../node-slimer/node-slimer";
import * as QUnit from "qunitjs";
import { integrationModule, testObjects, tryEnvSetting } from "../../integration-test-helpers/integration-test-helpers";
import { Cookies, Headers } from "../header-and-cookie-names";
import * as Rx from "rx";
import {ClientSession} from "../../sessions/session-model";
import { Api } from "../../api/endpoints";
import {User} from "../../user-model/user-model";
import * as request from "request"

integrationModule(__filename);

var loginUser = tryEnvSetting("EVERNOTE_USERNAME");
var loginPassword = tryEnvSetting("EVERNOTE_PASSWORD");

QUnit.test("login flow on happy path", (assert) => {
  var endpoint = new Api.Endpoint("myendpoint", Object, Object);
  var handlers = [{
    endpoint: endpoint,
    handle: (req:Object, res:Object, user$:Rx.Observable<User>) => {
      return Rx.Observable.just(res);
    }
  }];

  testObjects.testServer.jsonServiceHandlers = () => handlers;

  assert.expect(6);
  testObjects.testServer.start();
  testObjects.testServer.lifecycle$.merge(
    runPage((page:Page) => {
      var setter = "(" + (function () {
          var username = document.getElementById("username") as HTMLInputElement;
          username.value = "USERNAME";
          var password = document.getElementById("password") as HTMLInputElement;
          password.value = "PASSWORD";
        }).toString().replace("USERNAME", loginUser).replace("PASSWORD", loginPassword) + ")();";

      return page.open(testObjects.testServer.getBaseUrl() + "/login")
        .flatMap(() => page.setViewport(500, 600))
        .delay(5000)
        .flatMap(() => page.evaluateJavascript(setter))
        .delay(1000)
        .flatMap(() => page.evaluate(function () {
          var login = document.getElementById("login");
          var click = new MouseEvent('click', {
            'view': window,
            'bubbles': true,
            'cancelable': true
          });

          login.dispatchEvent(click);
        }))
        .delay(5000)
        .flatMap(() => page.evaluate(function () {
          var authorize = document.getElementsByName("authorize")[0];
          authorize = authorize || document.getElementsByName("reauthorize")[0];

          var click = new MouseEvent('click', {
            'view': window,
            'bubbles': true,
            'cancelable': true
          });

          authorize.dispatchEvent(click);
        }))
        .delay(5000)
        .flatMap(() => page.setClip({top: 0, left: 0, width: 500, height: 600}))
        .flatMap(() => page.testScreenshot(__dirname + "/loggedin.jpg"))
        .map((isEqual) => assert.ok(isEqual))
        .flatMap(() => page.getCookies())
        .flatMap((cookies) => {
          var clientSessionCookie = cookies.filter(c => c.name == Cookies.CLIENT_SESSION)[0];
          var sessionIdCookie = cookies.filter(c => c.name == Cookies.SESSION_ID)[0];
          var clientSession = JSON.parse(
            decodeURIComponent(clientSessionCookie.value)) as ClientSession;
          assert.ok(typeof clientSession.loggedInUserId === "number");
          assert.ok(typeof clientSession.sessionXsrfToken === "string");
          assert.equal(clientSession.userName, loginUser);

          var cookie = request.cookie(Cookies.SESSION_ID + "=" + sessionIdCookie.value);
          testObjects.testClient.jar.setCookie(cookie, testObjects.testServer.getBaseUrl());
          return testObjects.testClient.jsonRequest(endpoint.path, {},
            {[Headers.XSRF_TOKEN]: clientSession.sessionXsrfToken})
        })
        .map(([response, body]) => {
          assert.equal(response.statusCode, 200);
          assert.deepEqual(body, {});
          return null;
        })
    }).finally(() => testObjects.testServer.close()))
    .doOnError((e) => {
      assert.ok(false, e + "");
    })
    .finally(assert.async()).subscribe();
});
