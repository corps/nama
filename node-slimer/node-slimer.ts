import * as Rx from "rx";
import * as gm from "gm";
import * as fs from "fs";
import * as path from "path";
var driver = require('node-phantom-simple');

interface IPage {
  open(url:string, cb:(err:any, status:boolean) =>void):void
  evaluate(work:Function, cb:(err:any, result:any)=>void):void
  evaluateJavaScript(work:string, cb:(err:any, result:any)=>void):void
  set(k:string, v:any, cb:(err:any, result:any)=>void):void
  get(k:string, cb:(err:any, result:any)=>void):void
  render(path:string, cb:(err:any, result:any)=>void):void;
  renderBase64(format:string, cb:(err:any, result:any)=>void):void;
  onCallback(data:any):any
  onError(msg:string, trace:{ file: string, line: string, function: string }[]):any
}

interface IBrowser {
  createPage(cb:(err:any, page:IPage)=>void):void
  exit(cb:(err:any, result:any)=>void):void
}

export interface Cookie {
  domain: string
  expires: string
  expiry: number
  httponly: boolean
  name: string
  path: string
  secure: boolean
  value: string
}

export class Page {
  constructor(private page:IPage) {
  }

  private _get = Rx.Observable.fromNodeCallback<any, string>(this.page.get, this.page);
  private _set = Rx.Observable.fromNodeCallback<any, string, any>(this.page.set, this.page);

  open = Rx.Observable.fromNodeCallback<boolean, string>(this.page.open, this.page);
  evaluate = Rx.Observable.fromNodeCallback<any, Function>(this.page.evaluate, this.page);
  evaluateJavascript = Rx.Observable.fromNodeCallback<any, string>(this.page.evaluateJavaScript,
    this.page);
  render = Rx.Observable.fromNodeCallback<any, string>(this.page.render, this.page);

  get onCallback() {
    return this.page.onCallback;
  }

  set onCallback(v:(data:any)=>any) {
    this.page.onCallback = v;
  }

  get onError() {
    return this.page.onError;
  }

  set onError(v:(msg:string, trace:{ file: string, line:string, function: string }[])=>any) {
    this.page.onError = v;
  }

  setViewport(width:number, height:number) {
    return this._set("viewportSize", {width, height});
  }

  setClip(rect:{top:number, height:number, left:number, width:number}) {
    return this._set("clipRect", rect);
  }

  getCookies() {
    return this._get("cookies") as Rx.Observable<Cookie[]>
  }

  testScreenshot(name:string) {
    var extname = path.extname(name);
    var bibleImage = name.replace(/\.[^/.]+$/, "") + ".bible" + extname;
    return this.render(name).flatMap(() => compareImages(name, bibleImage));
  }
}

export class Browser {
  constructor(private browser:IBrowser) {
  }

  private _createPage = Rx.Observable.fromNodeCallback<IPage>(this.browser.createPage,
    this.browser);

  createPage() {
    return this._createPage().map(p => new Page(p));
  }

  exit = Rx.Observable.fromNodeCallback<any>(this.browser.exit, this.browser);
}

var createF = Rx.Observable.fromNodeCallback<IBrowser, { path: string }>(driver.create, driver);
export function create():Rx.Observable<Browser> {
  return createF({path: require('slimerjs').path}).map(b => new Browser(b));
}

function compareImages(one:string, two:string):Rx.Observable<boolean> {
  if (!fs.existsSync(two)) {
    return Rx.Observable.create<boolean>(observer => {
      var read = fs.createReadStream(one);
      read.on("error", observer.onError.bind(observer))
      var write = fs.createWriteStream(two);
      write.on("error", observer.onError.bind(observer))
      write.on("close", () => {
        observer.onNext(true);
        observer.onCompleted();
      });
      read.pipe(write);
    })
  }

  return Rx.Observable.create<boolean>(observer => {
    gm.compare(one, two, {tolerance: 0.01}, (err, isEqual, difference, raw) => {
      if (err) return observer.onError(err);
      console.log(isEqual, difference, raw);
      observer.onNext(isEqual);
      observer.onCompleted();
    });
  });
}

export function runPage(cb:(page:Page)=>Rx.Observable<any>):Rx.Observable<any> {
  return create().flatMap((b:Browser) => {
    return b.createPage()
      .flatMap(cb)
      .map(() => null)
      .catch((e) => {
        return Rx.Observable.just(e);
      }).flatMap((lastError) => {
        return b.exit().map(() => {
          if (lastError) throw lastError;
          return null;
        })
      });
  });
}
