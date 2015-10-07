import * as React from "react";
import { component } from "../cycle-rx-utils/components";
import * as Rx from "rx-lite";
import {CSSProperties} from "../css-properties/css-properties";
import * as css from "../css-properties/css-properties";
import {tap} from "../utils/obj";
import {Resource} from "../study-model/note-model";
import {assign} from "../utils/obj";

interface LocalState {
  animationFrame: number
}

export interface ImageBoxProps {
  resource: Resource
  style?: CSSProperties
}

const FINAL_ANIMATION_FRAME = 500; // half a second

export var ImageBox = component<ImageBoxProps>("ImageBox",
  (interactions, prop$, component, lifecycles) => {
    var animationsSubject = interactions.interaction<Rx.Observable<number>>().subject;
    var animation$ = animationsSubject.switch();
    var expandInteraction = interactions.interaction<any>();

    var isExpanded$ = expandInteraction.subject.scan<boolean>(expanded => !expanded, false);

    var state$ = animation$.map<LocalState>(animationFrame => {
      return {animationFrame};
    });

    return prop$.combineLatest<LocalState, [ImageBoxProps, LocalState]>(state$,
      (props, state) => [props, state]).map(([props, state]:[ImageBoxProps, LocalState]) => {
      var src = `data:${props.resource.contentType};base64,${props.resource.b64Data}`;
      var containerDivStyles = tap({} as CSSProperties)((s:CSSProperties) => {
        s.overflowX = "hidden";
        s.overflowY = "hidden";
        s.marginTop = css.Pixels.of(10);
        s.marginBottom = css.Pixels.of(10);
        s.position = css.Position.RELATIVE;
        assign(s, props.style);
      });
      var imageStyles = tap({} as CSSProperties)((s:CSSProperties) => {
        s.position = css.Position.ABSOLUTE;
        s.left = css.Percentage.of(50);
      });

      return <div style={containerDivStyles}>
        <img style={imageStyles} src={src}></img>
      </div>;
    });
  });
