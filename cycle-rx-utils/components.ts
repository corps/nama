import * as React from "react";
import * as Cycle from "cycle-react";
import * as Rx from "rx-lite";
import { Interactions } from "./interactions";

export interface ComponentVTreeFunction<P> {
  (interactions:Interactions,
   properties:Cycle.Properties<P>,
   self:React.Component<P, {}>,
   lifecycles:Cycle.Lifecycles<P>,
   renderScheduler?:Rx.IScheduler):Rx.Observable<React.ReactElement<P>> | Cycle.CycleReactViewObj<P>
}

export function component<P>(componentName:string,
                             vtree:ComponentVTreeFunction<P>,
                             options?:Cycle.ComponentOptions):React.ComponentClass<P> {
  options = options || {} as Cycle.ComponentOptions;
  options.renderScheduler = true;

  return Cycle.component<P>(componentName,
    (interactions, properties, self, lifecycles, scheduler) => {
      var beefedInteractions = new Interactions(interactions);
      var definition = vtree(beefedInteractions, properties, self, lifecycles, scheduler);

      if (!(Rx.Observable.isObservable(definition))) {
        var definitionObj = definition as Cycle.CycleReactViewObj<P>;
        var newDisposable = new Rx.CompositeDisposable();
        if (definitionObj.dispose) {
          var disposable = definitionObj.dispose as any as Rx.Disposable;
          if (disposable instanceof Function) {
            disposable = Rx.Disposable.create(disposable as any as ()=>void);
          }
          newDisposable.add(disposable);
        }

        newDisposable.add(beefedInteractions);
      }

      return definition;
    }, options)
}
