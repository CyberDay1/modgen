import './App.css';

const App = (): JSX.Element => {
  const electronVersion = window.modgen?.version?.() ?? 'unknown';
  const platform = window.modgen?.platform?.() ?? 'unknown';
  const theme = window.modgen?.theme?.() ?? 'dark';

  return (
    <div className="app">
      <header className="app__header">
        <div className="app__brand">
          <span className="app__logo" aria-hidden="true">
            ⧉
          </span>
          <div>
            <h1 className="app__title">modgen</h1>
            <p className="app__subtitle">Modular generation toolkit</p>
          </div>
        </div>
        <div className="app__status">
          <span className="status-indicator" />
          <span className="status-text">Dark mode active</span>
        </div>
      </header>

      <main className="app__body">
        <section className="panel">
          <h2 className="panel__title">Workspace Overview</h2>
          <p className="panel__copy">
            Welcome to the modgen shell. The application is running in <strong>{theme}</strong> mode on{' '}
            <strong>{platform}</strong> using Electron <strong>{electronVersion}</strong>.
          </p>
          <div className="panel__grid">
            <div className="panel__card">
              <h3>Project Templates</h3>
              <p>Quickly scaffold new experiences with modular blueprints.</p>
            </div>
            <div className="panel__card">
              <h3>Recent Activity</h3>
              <p>Track pipeline runs and collaborative edits at a glance.</p>
            </div>
            <div className="panel__card">
              <h3>Runtime Targets</h3>
              <p>Configure deploy destinations and sync assets effortlessly.</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="app__footer">
        <span>© {new Date().getFullYear()} modgen</span>
        <span>Phase 1 MVP Shell</span>
      </footer>
    </div>
  );
};

export default App;
