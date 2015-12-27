declare module "lru-cache" {
  module LRUFactory {
    export interface LRU {
      set(k:string, v:any):void;

      get(k:string):any;

      peek(k:string):any;

      del(k:string):void;

      reset():void;

      has(k:string):boolean;

      keys():string[];

      length():number;
    }

    interface LRUOptions {
      max?: number
      maxAge?: number
      length?: (v:any)=>number
      dispose?: (v:any)=>void
      stale?: boolean
    }
  }

  function LRUFactory(options?:LRUFactory.LRUOptions):LRUFactory.LRU;

  export = LRUFactory;
}