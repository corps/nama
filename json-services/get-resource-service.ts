import {ServiceHandler} from "../web-server/service-handler";
import {GetResourceRequest} from "../api/api-models";
import {GetResourceResponse} from "../api/api-models";
import {User} from "../user-model/user-model";
import {GetResource} from "../api/endpoints";
import * as Rx from "rx";
import {EvernoteClientRx} from "../evernote-client-rx/evernote-client-rx";

export class GetResourceService implements ServiceHandler<GetResourceRequest, GetResourceResponse, User> {
  constructor(private evernoteClient:EvernoteClientRx,
              private maxDataSize = 1024 * 550,
              private maxDimension = 300) {
  }

  endpoint = GetResource;

  handle(req:GetResourceRequest, res:GetResourceResponse, user$:Rx.Observable<User>) {
    return Rx.Observable.just(undefined);
  }
}