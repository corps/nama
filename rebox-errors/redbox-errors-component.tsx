import * as React from "react";
import { component } from "../cycle-rx-utils/components";
import * as Rx from "rx-lite";
import RedBox = require("redbox-react");
import { Interaction, Interactions } from "../cycle-rx-utils/interactions";

interface Props {
  errors: Error[]
}

export var RedboxErrors = component<Props>("RedboxErrors", (interactions, prop$) => {
  var onSwitch = interactions.interaction<number>();

  var showIdx$ = onSwitch.subject.startWith(0);

  const selectorRowStyle = {
    'textAlign': 'center', 'zIndex': 10000, 'position': 'fixed',
    'bottom': '20px', 'fontSize': '40px', 'fontWeight': 'bold',
    'width': '100%'
  };
  return prop$.combineLatest<number, [Props, number]>(showIdx$, (a, b) => [a, b])
    .map(([{errors}, errorShowIdx]) =>
      <div>
        { errors != null && errorShowIdx != null && errors[errorShowIdx] != null ?
        <div>
          <div style={selectorRowStyle}>
            { errors.map((_, i) => <a href='#' style={{ color: 'white', marginRight: '15px' }}
                                      onClick={() => onSwitch.listener(i)}>{i}</a>) }
          </div>
          <RedBox error={errors[errorShowIdx]}/>
        </div>
          : null }
      </div>
    )
});

export function runner(errors:Error[]) {
  return <RedboxErrors errors={errors}/>;
}
