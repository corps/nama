import * as model from "./api-models";

export interface Endpoint<Req, Res> {
  Request:{ new():Req },
  Response:{ new():Res },
  path: string,
  subPath: string
}

export class Path {
  constructor(public path:string, public parentPath?:Path) {
    this.path = (this.path + "/").replace(/\/\//g, "/");
  }

  get subPath() {
    if (this.parentPath == null) return this.path;
    return this.path.slice(this.parentPath.path.length - 1);
  }

  Subpath = (() => {
    var parent = this;
    return class Subpath extends Path {
      constructor(path:string) {
        super(parent.path + path, parent);
      }
    }
  })();

  Endpoint = class MountedEndpoint<Req, Res> extends this.Subpath implements Endpoint<Req, Res> {
    constructor(path:string,
                public Request:{ new():Req },
                public Response:{ new(): Res }) {
      super(path);
    }
  }
}

export var Home = new Path("/");
export var Login = new Home.Subpath("login");
export var Logout = new Home.Subpath("logout");
export var Api = new Home.Subpath("api");
export var Assets = new Home.Subpath("assets");

export var UpdateSchedule = new Api.Endpoint(
  "/update_schedule", model.UpdateScheduleRequest, model.UpdateScheduleResponse);

export var GetLatestNote = new Api.Endpoint(
  "/get_latest", model.GetLatestNoteRequest, model.GetLatestNoteResponse);

export var GetResource = new Api.Endpoint(
  "/get_resource", model.GetResourceRequest, model.GetResourceResponse);

export var FetchSchedule = new Api.Endpoint(
  "/fetch_schedule", model.FetchScheduleRequest, model.FetchScheduleResponse);

export var SummaryStats = new Api.Endpoint(
  "/summary", model.SummaryStatsRequest, model.SummaryStatsResponse);
