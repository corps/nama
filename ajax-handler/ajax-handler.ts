import {Endpoint} from "../api/endpoints";
import * as Rx from "rx-lite";
import { assignFromJson } from "../model-helpers/model-helpers";
import {ClientSession} from "../sessions/session-model";
import { Headers } from "../web-server/header-and-cookie-names";

export class AjaxHandler<Request, Response> {
  constructor(private endpoint:Endpoint<Request, Response>,
              private logoutHandler:()=>void,
              private requestProvider:()=>XMLHttpRequest = () => new XMLHttpRequest()) {
  }

  request(request:Request, clientSession:ClientSession):Rx.Observable<Response> {
    return Rx.Observable.create<Response>(observer => {
      var ajaxreq = this.requestProvider();

      ajaxreq.onreadystatechange = () => {
        if (ajaxreq.readyState == XMLHttpRequest.DONE) {
          if (ajaxreq.status === 200) {
            var json = JSON.parse(ajaxreq.responseText);
            try {
              var response = new this.endpoint.Response();
              if (assignFromJson(response, json)) {
                observer.onNext(response);
                observer.onCompleted();
                return;
              } else {
                throw new Error("Invalid response payload found!");
              }
            } catch (e) {
              observer.onError(e)
            }
            return;
          }
          if (ajaxreq.status === 401) {
            this.logoutHandler();
            observer.onCompleted();
            return;
          }

          observer.onError(ajaxreq);
        }
      };

      ajaxreq.open('POST', this.endpoint.path, true);

      ajaxreq.ontimeout = () => {
        observer.onError(ajaxreq);
      };

      ajaxreq.setRequestHeader('Content-Type', 'application/json');
      ajaxreq.setRequestHeader('Accept', 'application/json');
      ajaxreq.setRequestHeader(Headers.XSRF_TOKEN, clientSession.sessionXsrfToken);
      ajaxreq.send(JSON.stringify(request || {}));

      return () => {
        ajaxreq.abort();
      }
    });
  }
}