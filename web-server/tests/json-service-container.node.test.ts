import { runPage, Page } from "../../node-slimer/node-slimer";
import * as QUnit from "qunitjs";
import { integrationModule, testObjects, tryEnvSetting } from "../../integration-test-helpers/integration-test-helpers";
import { Cookies, Headers } from "../header-and-cookie-names";
import * as Rx from "rx";
import {ClientSession} from "../../sessions/session-model";
import { Api } from "../../api/endpoints";
import {User} from "../../user-model/user-model";
import * as request from "request"
import {EvernoteClientRx} from "../../evernote-client-rx/evernote-client-rx";
import {ServerSession} from "../../sessions/session-model";
import {AuthorizationError} from "../json-service-container";

integrationModule(__filename);

class Request {
  constructor(public number = 1) {
  }
}

class Response {
  constructor(public thing = "") {
  }
}

QUnit.test(
  `JsonServiceContainer creates handlers that properly serialize in and deserialize out`
  , (assert) => {

    assert.expect(2);
    var endpoint = new Api.Endpoint<Request, Response>("myendpoint", Request, Response);

    var handlers = [{
      endpoint: endpoint,
      handle: (req:Request, res:Response, user$:Rx.Observable<User>) => {
        assert.deepEqual(req, new Request(99));
        return Rx.Observable.just(null).delay(50).doOnNext(() => {
          res.thing = "my response";
        })
      }
    }];

    testObjects.testServer.jsonServiceHandlers = () => handlers;
    testObjects.testServer.security().xsrfProtection = (_, __, next) => next();
    testObjects.testServer.start();
    testObjects.testServer.lifecycle$.map(() => null).merge(
      testObjects.testClient.jsonRequest(endpoint.path, {number: 99})
        .map(([res, body]) => {
          assert.deepEqual(body, {thing: "my response"});
        }).finally(() => testObjects.testServer.close()))
      .doOnError((e) => assert.ok(false, e + ""))
      .finally(assert.async())
      .subscribe();
  });

QUnit.test(
  `JsonServiceContainer returns 400 for requests whose bodies don't match the request shape`
  , (assert) => {

    assert.expect(2);
    var endpoint = new Api.Endpoint<Request, Response>("myendpoint", Request, Response);

    var handlers = [{
      endpoint: endpoint,
      handle: () => {
        return Rx.Observable.just(null);
      }
    }];

    testObjects.testServer.jsonServiceHandlers = () => handlers;
    testObjects.testServer.security().xsrfProtection = (_, __, next) => next();
    testObjects.testServer.start();
    testObjects.testServer.lifecycle$.map(() => null).merge(
      testObjects.testClient.jsonRequest(endpoint.path, {number: "999"})
        .map(([res, body]) => {
          assert.equal(res.statusCode, 400);
          assert.deepEqual(body, {error: true, requestInvalid: true});
        }).finally(() => testObjects.testServer.close()))
      .doOnError((e) => assert.ok(false, e + ""))
      .finally(assert.async())
      .subscribe();
  });

QUnit.test(
  `JsonServiceContainer returns a 401 for an invalid evernote auth`
  , (assert) => {

    assert.expect(2);
    var endpoint = new Api.Endpoint<Request, Response>("myendpoint", Request, Response);

    var evernoteLogin = testObjects.user.getEvernoteLogin();
    evernoteLogin.token =
      "S=s1:U=705c5:E=158bd7a15ac:C=15165c8e760:P=1cd:A=en-devtoken:V=2:H=535babcc9db4c3f6d45e772db79796d3";
    var evernoteClient = new EvernoteClientRx(
      testObjects.testServer.config.evernoteConfig, evernoteLogin);

    var handlers = [{
      endpoint: endpoint,
      handle: () => {
        return evernoteClient.getUserData();
      }
    }];

    testObjects.testServer.jsonServiceHandlers = () => handlers;
    testObjects.testServer.security().xsrfProtection = (_, __, next) => next();
    testObjects.testServer.start();
    testObjects.testServer.lifecycle$.map(() => null).merge(
      testObjects.testClient.jsonRequest(endpoint.path, {})
        .map(([res, body]) => {
          assert.equal(res.statusCode, 401);
          assert.deepEqual(body, {error: true, notAuthorized: true});
        }).finally(() => testObjects.testServer.close()))
      .doOnError((e) => assert.ok(false, e + ""))
      .finally(assert.async())
      .subscribe();
  });

QUnit.test(
  `JsonServiceContainer returns a 401 when the given user$ is requested without a logged in session`
  , (assert) => {

    assert.expect(2);
    var endpoint = new Api.Endpoint<Request, Response>("myendpoint", Request, Response);
    var handlers = [{
      endpoint: endpoint,
      handle: (_:Request, __:Response, user$:Rx.Observable<User>) => {
        return user$
      }
    }];

    testObjects.testServer.jsonServiceHandlers = () => handlers;
    testObjects.testServer.security().xsrfProtection = (_, __, next) => next();
    testObjects.testServer.start();
    testObjects.testServer.lifecycle$.map(() => null).merge(
      testObjects.testClient.jsonRequest(endpoint.path, {})
        .map(([res, body]) => {
          assert.equal(res.statusCode, 401);
          assert.deepEqual(body, {error: true, notAuthorized: true});
        }).finally(() => testObjects.testServer.close()))
      .doOnError((e) => assert.ok(false, e + ""))
      .finally(assert.async())
      .subscribe();
  });

QUnit.test(
  `JsonServiceContainer returns a 401 when the given user$ errors during load`
  , (assert) => {

    assert.expect(3);
    var endpoint = new Api.Endpoint<Request, Response>("myendpoint", Request, Response);
    var handlers = [{
      endpoint: endpoint,
      handle: (_:Request, __:Response, user$:Rx.Observable<User>) => {
        return user$
      }
    }];

    testObjects.testServer.testRouter.get("/fakelogin", (req, res) => {
      var session = req.session as ServerSession;
      session.loggedInUserId = testObjects.user.id;
      res.send("Hi");
    });

    testObjects.testServer.jsonServiceHandlers = () => handlers;
    testObjects.testServer.security().xsrfProtection = (_, __, next) => next();
    testObjects.testServer.userStorage().lookupUserById =
      () => Rx.Observable.throw<User>(new Error());
    testObjects.testServer.start();
    testObjects.testServer.lifecycle$.map(() => null).merge(
      testObjects.testClient.request("/fakelogin")
        .doOnNext(([res, body]) => {
          assert.equal(res.statusCode, 200);
        })
        .flatMap(() => testObjects.testClient.jsonRequest(endpoint.path, {}))
        .map(([res, body]) => {
          assert.equal(res.statusCode, 401);
          assert.deepEqual(body, {error: true, notAuthorized: true});
        }).finally(() => testObjects.testServer.close()))
      .doOnError((e) => assert.ok(false, e + ""))
      .finally(assert.async())
      .subscribe();
  });

QUnit.test(
  `JsonServiceContainer session loads the session's user under user$`
  , (assert) => {

    assert.expect(3);
    var endpoint = new Api.Endpoint<Request, Response>("myendpoint", Request, Response);
    var handlers = [{
      endpoint: endpoint,
      handle: (_:Request, __:Response, user$:Rx.Observable<User>) => {
        return user$.map((user) => assert.deepEqual(user, testObjects.user));
      }
    }];

    testObjects.testServer.testRouter.get("/fakelogin", (req, res) => {
      var session = req.session as ServerSession;
      session.loggedInUserId = testObjects.user.id;
      res.send("Hi");
    });

    testObjects.testServer.jsonServiceHandlers = () => handlers;
    testObjects.testServer.security().xsrfProtection = (_, __, next) => next();
    testObjects.testServer.start();
    testObjects.testServer.lifecycle$.map(() => null).merge(
      testObjects.testClient.request("/fakelogin")
        .doOnNext(([res, body]) => {
          assert.equal(res.statusCode, 200);
        })
        .flatMap(() => testObjects.testClient.jsonRequest(endpoint.path, {}))
        .map(([res, body]) => {
          assert.equal(res.statusCode, 200);
        }).finally(() => testObjects.testServer.close()))
      .doOnError((e) => assert.ok(false, e + ""))
      .finally(assert.async())
      .subscribe();
  });

QUnit.test(
  `JsonServiceContainer converts an AuthorizationError to a 401`
  , (assert) => {

    assert.expect(3);
    var endpoint = new Api.Endpoint<Request, Response>("myendpoint", Request, Response);
    var handlers = [{
      endpoint: endpoint,
      handle: (_:Request, __:Response, user$:Rx.Observable<User>) => {
        return Rx.Observable.throw(new AuthorizationError());
      }
    }];

    testObjects.testServer.testRouter.get("/fakelogin", (req, res) => {
      var session = req.session as ServerSession;
      session.loggedInUserId = testObjects.user.id;
      res.send("Hi");
    });

    testObjects.testServer.jsonServiceHandlers = () => handlers;
    testObjects.testServer.security().xsrfProtection = (_, __, next) => next();
    testObjects.testServer.start();
    testObjects.testServer.lifecycle$.map(() => null).merge(
      testObjects.testClient.request("/fakelogin")
        .doOnNext(([res, body]) => {
          assert.equal(res.statusCode, 200);
        })
        .flatMap(() => testObjects.testClient.jsonRequest(endpoint.path, {}))
        .map(([res, body]) => {
          assert.equal(res.statusCode, 401);
          assert.deepEqual(body, {error: true, notAuthorized: true});
        }).finally(() => testObjects.testServer.close()))
      .doOnError((e) => assert.ok(false, e + ""))
      .finally(assert.async())
      .subscribe();
  });

QUnit.test(
  `JsonServiceContainer still lets other errors pass throw`
  , (assert) => {

    assert.expect(2);
    var endpoint = new Api.Endpoint<Request, Response>("myendpoint", Request, Response);
    var handlers = [{
      endpoint: endpoint,
      handle: (_:Request, __:Response, user$:Rx.Observable<User>) => {
        return Rx.Observable.throw(new Error());
      }
    }];

    testObjects.testServer.testRouter.get("/fakelogin", (req, res) => {
      var session = req.session as ServerSession;
      session.loggedInUserId = testObjects.user.id;
      res.send("Hi");
    });

    testObjects.testServer.jsonServiceHandlers = () => handlers;
    testObjects.testServer.security().xsrfProtection = (_, __, next) => next();
    testObjects.testServer.start();
    testObjects.testServer.lifecycle$.map(() => null).merge(
      testObjects.testClient.request("/fakelogin")
        .doOnNext(([res, body]) => {
          assert.equal(res.statusCode, 200);
        })
        .flatMap(() => testObjects.testClient.jsonRequest(endpoint.path, {}))
        .map(([res, body]) => {
          assert.equal(res.statusCode, 500);
        }).finally(() => testObjects.testServer.close()))
      .doOnError((e) => assert.ok(false, e + ""))
      .finally(assert.async())
      .subscribe();
  });
