import { Component, type ReactNode } from "react";

export default class PageLoadBoundary extends Component<
  { children: ReactNode; resetKey: string },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidUpdate(
    previous: Readonly<{ children: ReactNode; resetKey: string }>,
  ) {
    if (this.state.failed && previous.resetKey !== this.props.resetKey)
      this.setState({ failed: false });
  }
  render() {
    if (this.state.failed)
      return (
        <div className="container section" role="alert">
          <p>页面暂时无法载入，请检查网络连接后重新载入。</p>
          <button
            type="button"
            className="button"
            onClick={() => window.location.reload()}
          >
            重新载入
          </button>
        </div>
      );
    return this.props.children;
  }
}
