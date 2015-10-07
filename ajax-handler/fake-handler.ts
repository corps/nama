import * as Rx from "rx-lite";
import {AjaxHandler} from "./ajax-handler";
import {Endpoint} from "../api/endpoints";

export class FakeHandler<Req, Res> extends AjaxHandler<Req, Res> {
  requestSubject = new Rx.Subject<[Req, Rx.Observer<Res>]>();

  constructor() {
    super(null, null, null);
  }

  request(req:Req) {
    return Rx.Observable.create<Res>(observer => {
      var nextResponse = new Rx.AsyncSubject<Res>();
      var disposable = nextResponse.delay(1).subscribe(observer);
      this.requestSubject.onNext([req, nextResponse]);
      return disposable;
    });
  }

  complete() {
    this.requestSubject.onCompleted();
  }
}
