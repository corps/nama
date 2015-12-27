import * as Rx from "rx";
import {EvernoteSyncService} from "../evernote-sync-service";
import {User} from "../../user-model/user-model";
import {tap} from "../../utils/obj";

export class MockedSyncService extends EvernoteSyncService {
  innerSyncs = [] as Rx.Subject<any>[];
  runningProcesses:{[k:number]:Rx.Observable<any>} = {};

  innerSync(user:User):Rx.Observable<any> {
    return tap(new Rx.Subject<any>())(s => this.innerSyncs.push(s));
  }
}
