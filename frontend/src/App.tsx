import { useState } from 'react';
import Dashboard from './pages/Dashboard';
import Start from './pages/Start';

function App() {
  const [booted, setBooted] = useState(false);

  if (!booted) {
    return <Start onBoot={() => setBooted(true)} />;
  }

  return <Dashboard />;
}

export default App;
