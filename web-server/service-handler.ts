import { Endpoint } from "../api/endpoints";
import * as Rx from "rx";

export interface ServiceHandler<Req, Res, Agent> {
  endpoint: Endpoint<Req, Res>
  handle(req:Req, res:Res, user:Rx.Observable<Agent>):Rx.Observable<any>
}

