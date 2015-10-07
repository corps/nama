declare module "cycle-react" {
  import * as RxLite from "rx-lite";
  import * as React from "react";

  interface Callback<T> {
    (p:T):void
  }
  export type InteractionEvent<T> = RxLite.Observable<T> | Callback<T>

  export interface EventSubject<T> extends RxLite.Subject<T> {
    onEvent(v:T):void
  }

  export interface CycleReactViewObj<P> {
    view: RxLite.Observable<React.ReactElement<P>>
    onMount?: ()=>void
    dispose?: (()=>void) | RxLite.Disposable
    events?: any
  }
  export interface Interactions {
    get: <T>(subjectName:string) => EventSubject<T>
    listener: <T>(subjectName:string) => (e:T) => void
  }
  export interface Properties<P> extends RxLite.Observable<P> {
    get: <T>(subjectName:string, isEqual?:(a:T, b:T)=>boolean) => RxLite.Observable<T>
  }

  export interface Lifecycles<P> {
    componentWillMount: RxLite.Subject<void>
    componentDidMount: RxLite.Subject<void>
    componentWillReceiveProps: RxLite.Subject<P>
    componentWillUpdate: RxLite.Subject<P>
    componentDidUpdate: RxLite.Subject<P>
    componentWillUnmount: RxLite.Subject<void>
  }

  export interface ComponentVTreeFunction<P> {
    (interactions:Interactions,
     properties:Properties<P>,
     self:React.Component<P, {}>,
     lifecycles:Lifecycles<P>,
     scheduler?:RxLite.IScheduler):RxLite.Observable<React.ReactElement<P>> | CycleReactViewObj<P>
  }

  export interface ComponentOptions {
    rootTagName?: string
    mixins?: any[]
    disableHotLoader?: boolean
    renderScheduler?: boolean
  }

  export function component<P>(componentName:string,
                               vtree:ComponentVTreeFunction<P>,
                               options?:ComponentOptions):React.ComponentClass<P>
}

declare module "cycle-react/src/rx/event-subject" {
  import CycleReact = require("cycle-react");
  function createEventSubject<T>():CycleReact.EventSubject<T>;

  export = createEventSubject;
}

declare module "cycle-react/src/interactions" {
  import CycleReact = require("cycle-react");
  function makeInteractions(createEventSubject:()=>CycleReact.EventSubject<any>):CycleReact.Interactions

  export = makeInteractions
}
