import {ServiceHandler} from "../web-server/service-handler";
import {GetResourceRequest} from "../api/api-models";
import {GetResourceResponse} from "../api/api-models";
import {User} from "../user-model/user-model";
import {GetResource} from "../api/endpoints";
import * as Rx from "rx";
import {EvernoteClientRx} from "../evernote-client-rx/evernote-client-rx";
import {Evernote} from "evernote";
import {SUPPORTED_IMAGE_TYPES} from "../evernote-mediators/note-contents-mapper";
import sharp = require("sharp");
import * as fs from "fs";

export class GetResourceService implements ServiceHandler<GetResourceRequest, GetResourceResponse, User> {
  constructor(private evernoteClient:EvernoteClientRx,
              private maxDataSize = 1024 * 550,
              private maxDimension = 300) {
  }

  endpoint = GetResource;

  handle(req:GetResourceRequest, res:GetResourceResponse, user$:Rx.Observable<User>) {
    var userClient:EvernoteClientRx;
    return user$.flatMap((user:User) => {
      userClient = this.evernoteClient.forUser(user);
      res.compressedResource.contentType = "image/jpeg";
      res.compressedResource.id = req.resourceId;
      return userClient.getResource(req.resourceId, false);
    }).flatMap((resource:Evernote.Resource) => {
      res.compressedResource.noteId = resource.noteGuid;

      if (SUPPORTED_IMAGE_TYPES.indexOf(resource.mime) === -1) return Rx.Observable.empty();
      if (resource.data.size > this.maxDataSize) return Rx.Observable.empty();

      return userClient.getResource(req.resourceId, true);
    }).flatMap((resource:Evernote.Resource) => {
      fs.writeFileSync(__dirname + "/tests/gotback.jpg",
        new Buffer(resource.data.body as any as Uint8Array));
      var image = sharp(new Buffer(resource.data.body))
        .resize(this.maxDimension, this.maxDimension).max().quality(80).jpeg();

      return Rx.Observable.fromPromise(image.toBuffer());
    }).doOnNext((compressed:Buffer) => {
      res.compressedResource.b64Data = compressed.toString("base64");
    }).flatMap(compressed => {
      return Rx.Observable.fromPromise(sharp(compressed).metadata());
    }).doOnNext(metadata => {
      res.compressedResource.width = metadata.width;
      res.compressedResource.height = metadata.height;
    })
  }
}