declare module "fake-xml-http-request" {
  class FakeXHR extends XMLHttpRequest {
    respond(status:number, headers?:{[k:string]:string}, body?:string):void
    requestBody:string;
    requestHeaders:{[k:string]:string};
    aborted:boolean
  }

  export = FakeXHR;
}