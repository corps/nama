import * as React from "react";
import * as Cycle from "cycle-react";
import * as Rx from "rx-lite";
import { tap } from "../utils/obj";
import SyntheticEvent = __React.SyntheticEvent;

var uniqCount = 0;
export class Interaction<T> {
  name = "" + ++uniqCount;
  subject = this.interactions.get<T>(this.name);
  listener = this.interactions.listener<T>(this.name);

  constructor(private interactions:Cycle.Interactions) {
  }
}

export class PreventDefaultInteraction<T extends SyntheticEvent> {
  name = "" + ++uniqCount;
  subject = this.interactions.get<T>(this.name);
  targetListener = this.interactions.listener<React.SyntheticEvent>(this.name);

  listener = (evt:React.SyntheticEvent) => {
    evt.preventDefault();
    this.targetListener(evt);
  }

  constructor(private interactions:Cycle.Interactions) {
  }
}

export class InputInteraction<T> {
  name = "" + ++uniqCount;
  subject = this.interactions.get<T>(this.name);

  listener = (evt:React.FormEvent) => {
    if (evt.target instanceof HTMLInputElement) {
      let value = (evt.target as HTMLInputElement).value;
      if (this.handleValueChange(value, (v:T) => {
          this.targetListener(v);
          return false;
        })) {
        evt.preventDefault();
      }
    } else {
      throw new Error("evt.target was not an html input element!");
    }
  };

  private targetListener = this.interactions.listener<T>(this.name);

  constructor(private interactions:Cycle.Interactions,
              private handleValueChange:(v:string, sendValue:(v:T)=>void)=>void) {
  }
}

export class ScrollInteraction {
  name = "" + ++uniqCount;
  subject = this.interactions.get<number>(this.name);

  listener = (evt:React.UIEvent) => {
    if (evt.target instanceof HTMLElement) {
      var element = evt.target as HTMLElement;
      this.targetListener(element.scrollTop);
    } else {
      throw new Error("Unexpected event target!");
    }
  };

  private targetListener = this.interactions.listener<number>(this.name);

  constructor(private interactions:Cycle.Interactions) {
  }
}

export class RowInputInteraction<T> {
  name = "" + ++uniqCount;
  subject = this.interactions.get<[T, number]>(this.name);

  private targetListener = this.interactions.listener<[T, number]>(this.name);

  constructor(private interactions:Cycle.Interactions,
              private handleValueChange:(v:string, sendValue:(v:T)=>void)=>void) {
  }

  listenerForIdx(idx:number) {
    return (evt:React.FormEvent) => {
      if (evt.target instanceof HTMLInputElement) {
        let value = (evt.target as HTMLInputElement).value;
        if (this.handleValueChange(value, (v:T) => {
            this.targetListener([v, idx]);
            return false;
          })) {
          evt.preventDefault();
        }
      } else {
        throw new Error("evt.target was not an html input element!");
      }
    };
  }
}

export function passThrough(v:string, sendValue:(v:string)=>void) {
  sendValue(v);
  return true;
}

export function filterPositiveIntegers(v:string, sendValue:(v:number)=>void) {
  if (v.length == 0) {
    sendValue(0);
    return true;
  }

  if (v.match(/[0-9]*/)) {
    sendValue(parseInt(v, 10));
    return true;
  }

  return true;
}

export class Interactions implements Rx.IDisposable {
  private subjects = [] as Rx.Subject<any>[];

  constructor(private interactions:Cycle.Interactions) {
  }

  interaction<T>() {
    return this.cleanup(new Interaction<T>(this.interactions));
  }

  preventDefaultInteraction<T extends React.SyntheticEvent>() {
    return this.cleanup(new PreventDefaultInteraction<T>(this.interactions));
  }

  inputInteraction<T>(handleValueChange:(v:string, sendValue:(v:T)=>void)=>void) {
    return this.cleanup(new InputInteraction<T>(this.interactions, handleValueChange));
  }

  rowInputInteraction<T>(handleValueChange:(v:string, sendValue:(v:T)=>void)=>void) {
    return this.cleanup(new RowInputInteraction<T>(this.interactions, handleValueChange));
  }

  simpleInputInteraction() {
    return this.cleanup(new InputInteraction<string>(this.interactions, passThrough));
  }

  scrollInteraction() {
    return this.cleanup(new ScrollInteraction(this.interactions));
  }

  dispose() {
    var subjects = this.subjects;
    this.subjects = [];
    subjects.forEach(d => {
      d.onCompleted();
    });
  }

  private cleanup<T extends { subject: Rx.Subject<any> }>(v:T):T {
    return tap(v)(i => this.subjects.push(v.subject))
  }
}