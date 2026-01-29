import { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', color: '#fff', background: '#333', minHeight: '100vh', fontFamily: 'monospace' }}>
          <h1 style={{ color: '#ff5555' }}>⚠️ Application Crashed</h1>
          <p>Please send a screenshot of this error:</p>
          <pre style={{ background: '#000', padding: '10px', borderRadius: '5px', overflow: 'auto' }}>
            {this.state.error?.toString()}
          </pre>
          <details style={{ marginTop: '10px' }}>
            <summary>Stack Trace</summary>
            <pre style={{ fontSize: '12px', marginTop: '5px' }}>
              {this.state.errorInfo?.componentStack}
            </pre>
          </details>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
