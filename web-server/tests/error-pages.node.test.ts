import { runPage, Page } from "../../node-slimer/node-slimer";
import * as QUnit from "qunitjs";
import { integrationModule, testObjects } from "../../integration-test-helpers/integration-test-helpers";
import { assignFromJson } from "../../model-helpers/model-helpers"
import { tap } from "../../utils/obj";
import {WebServerConfig} from "../web-server-config";

integrationModule(__filename);

QUnit.test("404 page returned visually looks correct", (assert) => {
  testObjects.testServer.start();

  testObjects.testServer.lifecycle$.merge(
    runPage((page:Page) => {
      return page.open(testObjects.testServer.getBaseUrl() + "/something-blah")
        .flatMap(() => page.setViewport(500, 600))
        .flatMap(() => page.setClip({top: 0, left: 0, width: 500, height: 600}))
        .flatMap(() => page.testScreenshot(__dirname + "/404.jpg"))
        .map((isEqual) => assert.ok(isEqual))
    }).finally(() => testObjects.testServer.close()))
    .doOnError((e) => {
      assert.ok(false, e + "");
    })
    .finally(assert.async()).subscribe();
});

QUnit.test("404 returns json in json case", (assert) => {
  testObjects.testServer.start();

  testObjects.testServer.lifecycle$.merge(
    testObjects.testClient.jsonRequest("/nonexistant")
      .map(([response, body]) => {
        assert.equal(response.statusCode, 404);
        assert.deepEqual(body, {error: true, missingResource: true});
        return null;
      })
      .finally(() => testObjects.testServer.close()))
    .doOnError((e) => {
      assert.ok(false, e + "");
    })
    .finally(assert.async()).subscribe();
});

QUnit.test("500 page returned visually looks correct", (assert) => {
  testObjects.testServer.testRouter.get("/mytest", (req, res, next) => {
    next(new Error("Crap!"));
  });

  testObjects.testServer.start();

  testObjects.testServer.lifecycle$.merge(
    runPage((page:Page) => {
      return page.open(testObjects.testServer.getBaseUrl() + "/mytest")
        .flatMap(() => page.setViewport(500, 600))
        .flatMap(() => page.setClip({top: 0, left: 0, width: 500, height: 600}))
        .flatMap(() => page.testScreenshot(__dirname + "/500.jpg"))
        .map((isEqual) => assert.ok(isEqual))
    }).finally(() => testObjects.testServer.close()))
    .doOnError((e) => {
      assert.ok(false, e + "");
    })
    .finally(assert.async()).subscribe();
});

QUnit.test("500 page returned in production visually looks correct", (assert) => {
  testObjects.testServer.testRouter.get("/mytest", (req, res, next) => {
    next(new Error("Crap!"));
  });

  var errorPages = testObjects.testServer.errorPages();
  errorPages.config = tap(new WebServerConfig())(c => assignFromJson(c, errorPages.config))
  errorPages.config.isProduction = true;
  testObjects.testServer.start();

  testObjects.testServer.lifecycle$.merge(
    runPage((page:Page) => {
      return page.open(testObjects.testServer.getBaseUrl() + "/mytest")
        .flatMap(() => page.setViewport(500, 600))
        .flatMap(() => page.setClip({top: 0, left: 0, width: 500, height: 600}))
        .flatMap(() => page.testScreenshot(__dirname + "/500-prod.jpg"))
        .map((isEqual) => assert.ok(isEqual))
    }).finally(() => testObjects.testServer.close()))
    .doOnError((e) => {
      assert.ok(false, e + "");
    })
    .finally(assert.async()).subscribe();
});

QUnit.test("500 page returns json without stack in production", (assert) => {
  testObjects.testServer.testRouter.post("/mytest", (req, res, next) => {
    next(new Error("Crap!"));
  });

  var errorPages = testObjects.testServer.errorPages();
  errorPages.config = tap(new WebServerConfig())(c => assignFromJson(c, errorPages.config))
  errorPages.config.isProduction = true;

  testObjects.testServer.start();

  testObjects.testServer.lifecycle$.merge(
    testObjects.testClient.jsonRequest("/mytest")
      .map(([response, body]) => {
        assert.equal(response.statusCode, 500);
        assert.deepEqual(body, {error: true});
        return null;
      })
      .finally(() => testObjects.testServer.close()))
    .doOnError((e) => {
      assert.ok(false, e + "");
    })
    .finally(assert.async()).subscribe();
});

QUnit.test("500 page returns json with stack outside production", (assert) => {
  testObjects.testServer.testRouter.post("/mytest", (req, res, next) => {
    next(new Error("Crap!"));
  });

  testObjects.testServer.start();

  testObjects.testServer.lifecycle$.merge(
    testObjects.testClient.jsonRequest("/mytest")
      .map(([response, body]) => {
        assert.equal(response.statusCode, 500);
        assert.ok(body.stack);
        return null;
      })
      .finally(() => testObjects.testServer.close()))
    .doOnError((e) => {
      assert.ok(false, e + "");
    })
    .finally(assert.async()).subscribe();
});
