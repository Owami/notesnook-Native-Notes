import React, { PropsWithChildren, useContext } from "react";
import {
  createPortal,
  unstable_renderSubtreeIntoContainer,
  unmountComponentAtNode
} from "react-dom";
import { EventDispatcher } from "./event-dispatcher";

export type BasePortalProviderProps = PropsWithChildren<{}>;

export type Portals = Map<HTMLElement, React.ReactChild>;

export type PortalRendererState = {
  portals: Portals;
};

type MountedPortal = {
  children: () => React.ReactChild | null;
};

export class PortalProviderAPI extends EventDispatcher {
  portals: Map<HTMLElement, MountedPortal> = new Map();
  context: any;

  constructor() {
    super();
  }

  setContext = (context: any) => {
    this.context = context;
  };

  render(
    children: () => React.ReactChild | JSX.Element | null,
    container: HTMLElement
  ) {
    this.portals.set(container, {
      children
    });
    let wrappedChildren = children() as JSX.Element;

    unstable_renderSubtreeIntoContainer(
      this.context,
      wrappedChildren,
      container
    );
  }

  // TODO: until https://product-fabric.atlassian.net/browse/ED-5013
  // we (unfortunately) need to re-render to pass down any updated context.
  // selectively do this for nodeviews that opt-in via `hasAnalyticsContext`
  forceUpdate() {}

  remove(container: HTMLElement) {
    this.portals.delete(container);

    // There is a race condition that can happen caused by Prosemirror vs React,
    // where Prosemirror removes the container from the DOM before React gets
    // around to removing the child from the container
    // This will throw a NotFoundError: The node to be removed is not a child of this node
    // Both Prosemirror and React remove the elements asynchronously, and in edge
    // cases Prosemirror beats React
    try {
      unmountComponentAtNode(container);
    } catch (error) {
      // IGNORE console.error(error);
    }
  }
}
const PortalProviderContext = React.createContext<
  PortalProviderAPI | undefined
>(undefined);
export function usePortalProvider() {
  return useContext(PortalProviderContext);
}

export class PortalProvider extends React.Component<BasePortalProviderProps> {
  static displayName = "PortalProvider";

  portalProviderAPI: PortalProviderAPI;

  constructor(props: BasePortalProviderProps) {
    super(props);
    this.portalProviderAPI = new PortalProviderAPI();
  }

  render() {
    return (
      <PortalProviderContext.Provider value={this.portalProviderAPI}>
        {this.props.children}
        <PortalRenderer portalProviderAPI={this.portalProviderAPI} />
      </PortalProviderContext.Provider>
    );
  }

  componentDidUpdate() {
    this.portalProviderAPI.forceUpdate();
  }
}

export class PortalRenderer extends React.Component<
  { portalProviderAPI: PortalProviderAPI },
  PortalRendererState
> {
  constructor(props: { portalProviderAPI: PortalProviderAPI }) {
    super(props);
    props.portalProviderAPI.setContext(this);
    props.portalProviderAPI.on("update", this.handleUpdate);
    this.state = { portals: new Map() };
  }

  handleUpdate = (portals: Portals) => this.setState({ portals });

  render() {
    const { portals } = this.state;
    return (
      <>
        {Array.from(portals.entries()).map(([container, children]) =>
          createPortal(children, container)
        )}
      </>
    );
  }
}
