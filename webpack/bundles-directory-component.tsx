import * as React from "react";

export class BundleEntryComponent extends React.Component<{ bundleName: string, key: string }, any> {
  render() {
    return <li style={{ lineHeight: '1.2' }}>
      <a href={"/bundle/" + this.props.bundleName}>{this.props.bundleName}</a>
    </li>
  }
}

export class BundlesDirectoryComponent extends React.Component<{ bundleNames: string[] }, any> {
  render() {
    return <div style={{ maxWidth: 800, marginLeft: 'auto', marginRight: 'auto' }}>
      <p>Bundles Found</p>
      <ul>
        { this.props.bundleNames.map(name => <BundleEntryComponent bundleName={name} key={name}/> )}
      </ul>
    </div>;
  }
}
