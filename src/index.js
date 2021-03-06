import React, {
  Component,
  isValidElement,
  Children,
  createElement
} from "react";

const unsupportedUserAgentsPattern = /Windows.*Chrome/;

const config = {
  poll: unsupportedUserAgentsPattern.test(navigator.userAgent),
  url: "https://ipv4.icanhazip.com/",
  timeout: 5000,
  interval: 5000
};

const ping = config => {
  return new Promise((resolve, reject) => {
    const isOnline = () => resolve(true);
    const isOffline = () => resolve(false);

    const xhr = new XMLHttpRequest();

    xhr.onerror = isOffline;
    xhr.ontimeout = isOffline;
    xhr.onload = () => {
      const response = xhr.responseText.trim();
      if (!response) {
        isOffline();
      } else {
        isOnline();
      }
    };

    xhr.open("GET", config.url);
    xhr.timeout = config.url;
    xhr.send();
  });
};

// base class that detects offline/online changes
class Base extends Component {
  constructor() {
    super();
    this.state = {
      online: typeof navigator.onLine === "boolean" ? navigator.onLine : true
    };
    // bind event handlers
    this.goOnline = this.goOnline.bind(this);
    this.goOffline = this.goOffline.bind(this);
  }
  renderChildren() {
    const { children } = this.props;
    let { wrapperType } = this.props;

    // usual case: one child that is a react Element
    if (React.isValidElement(children)) {
      return children;
    }

    // no children
    if (!children) {
      return null;
    }

    // string children, multiple children, or something else
    const childrenArray = Children.toArray(children);
    const firstChild = childrenArray[0];
    // use wrapperType if specified
    if (!wrapperType) {
      if (typeof firstChild === "string" || firstChild.type === "span") {
        // use span for string or span children
        wrapperType = "span";
      } else {
        // fallback on div
        wrapperType = "div";
      }
    }
    return createElement(wrapperType, {}, ...childrenArray);
  }

  goOnline() {
    if (!this.state.online) {
      this.callOnChangeHandler(true);
      this.setState({ online: true });
    }
  }

  goOffline() {
    if (this.state.online) {
      this.callOnChangeHandler(false);
      this.setState({ online: false });
    }
  }

  callOnChangeHandler(online) {
    if (this.props.onChange) {
      this.props.onChange(online);
    }
  }

  startPolling() {
    this.pollingId = setInterval(() => {
      ping(config).then(online => {
        online ? this.goOnline() : this.goOffline();
      });
    }, config.interval);
  }

  stopPolling() {
    clearInterval(this.pollingId);
  }

  componentDidMount() {
    window.addEventListener("online", this.goOnline);
    window.addEventListener("offline", this.goOffline);

    if (config.poll) {
      this.startPolling();
    }
  }

  componentWillUnmount() {
    window.removeEventListener("online", this.goOnline);
    window.removeEventListener("offline", this.goOffline);

    if (config.poll) {
      this.stopPolling();
    }
  }
}

export class Online extends Base {
  render() {
    return this.state.online ? this.renderChildren() : null;
  }
}

export class Offline extends Base {
  render() {
    return !this.state.online ? this.renderChildren() : null;
  }
}

export class Detector extends Base {
  render() {
    return this.props.render({ online: this.state.online });
  }
}
