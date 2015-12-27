import { integrationModule, testObjects } from "../../integration-test-helpers/integration-test-helpers";
import * as QUnit from "qunitjs";
import * as Rx from "rx";
import {Api} from "../../api/endpoints";
import {ServiceHandler} from "../service-handler";
import {User} from "../../user-model/user-model";

integrationModule(__filename);

QUnit.test("Requests, responses, and errors are logged", (assert) => {
  var testActions = new Rx.Subject<string>();

  testObjects.testServer.testRouter.get("/mytest", (req, res, next) => {
    testActions.onNext("on action");
    next(new Error("Oh shit!"));
  });

  testObjects.testServer.timeProvider = () => () => {
    testActions.onNext("fetched time");
    return new Date(1800000);
  };

  testObjects.testServer.start();

  testObjects.testClient.request("/mytest")
    .doOnError((e) => {
      assert.equal(e.statusCode, 500);
    })
    .finally(() => {
      testActions.onCompleted();
      testObjects.testServer.close();
    })
    .subscribe();

  testObjects.testServer.request$.map(r => r.url)
    .merge(testObjects.testServer.error$.map(re => re.request.url + "!" + re.error.toString()))
    .merge(testObjects.testServer.response$.map(r => r[0] + ":" + r[1].statusCode))
    .merge(testActions)
    .toArray()
    .doOnNext(messages => {
      assert.deepEqual(messages,
        ["fetched time", "/mytest", "on action", "/mytest!Error: Oh shit!",
          "Wed Dec 31 1969 16:30:00 GMT-0800 (PST):500"]);
    })
    .doOnError((e) => {
      assert.ok(false, e + "");
    })
    .finally(assert.async())
    .subscribe();
});
