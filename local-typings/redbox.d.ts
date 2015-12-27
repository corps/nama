declare module "redbox-react" {
  import * as React from "react";
  class RedBox extends React.Component<{ error: Error }, any> {
  }
  export = RedBox;
}