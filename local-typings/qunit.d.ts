declare module "nodeunit" {
  import assert = require("assert");

}

declare module "qunitjs" {
  export interface Configuration {
    altertitle?: boolean
    autostart?: boolean
    collapse?: boolean
    current?: { testName: string }
    hidepassed?: boolean
    moduleFilter?: string
    reorder?: boolean
    requireExpects?: boolean
    testId?: string[]
    testTimeout?: number
    scrolltop?: boolean
    pageLoaded?: boolean
  }

  export var config:Configuration;

  export function start():void;

  export function load(config?:Configuration):void;

  export function test(name:string, cb:Callback):void;

  export function skip(name:string, cb:Callback):void;

  export function only(name:string, cb:Callback):void;

  export function module(name:string, hooks?:ModuleHooks):void;

  export function begin(callback:(details:BeginDetails)=>void):void;

  export function done(callback:(details:DoneDetails)=>void):void;

  export function log(callback:(details:LogDetails)=>void):void;

  export function moduleDone(callback:(details:ModuleDoneDetails)=>void):void;

  export function moduleStart(callback:(details:ModuleBeginDetails)=>void):void;

  export function testDone(callback:(details:TestDoneDetails)=>void):void;

  export function testStart(callback:(details:TestBeginDetails)=>void):void;

  export interface ModuleHooks {
    beforeEach?: (assert?:Assert)=>void
    afterEach?: (assert?:Assert)=>void
  }

  export interface TestBeginDetails {
    name: string
    module: string
  }

  export interface ModuleBeginDetails extends BeginDetails {
    name:string
  }

  export interface TestDoneDetails extends DoneDetails {
    name: string
    module: string
  }

  export interface ModuleDoneDetails extends DoneDetails {
    name: string
  }

  export interface DoneDetails {
    failed: number
    passed: number
    total: number
    runtime: number
  }

  export interface LogDetails {
    result: boolean
    actual: any
    expected: any
    message: string
    source: string
    module: string
    name: string
    runtime: number
  }

  export interface BeginDetails {
    totalNumbers:number
  }

  export interface Callback {
    (assert:Assert):void
  }

  export interface Assert {
    async(expectedCallCount?:number):()=>void
    deepEqual(actual:any, expect:any, message?:string):void
    notDeepEqual(actual:any, expect:any, message?:string):void
    equal(actual:any, expect:any, message?:string):void
    notEqual(actual:any, expect:any, message?:string):void
    notOk(predicate:boolean, message?:string):void
    ok(predicate:boolean, message?:string):void
    notPropEqual(actual:any, expect:any, message?:string):void
    propEqual(actual:any, expect:any, message?:string):void
    notStrictEqual(actual:any, expect:any, message?:string):void
    strictEqual(actual:any, expect:any, message?:string):void
    push(result:any, actual:any, expect:any, message:string):void
    throws(block:Function, expected?:any, message?:string):void
    expect(expectedAssertions:number):void
  }
}