import React from 'react';
import './styles/App.css'; 

// NOTA BENE: Assicurati che il percorso sia corretto.
// Se il file è dentro src/pages/errors-page.tsx:
import ErrorPage from './pages/errors-page';

function App() {
  return (
    <div className="App">
      <ErrorPage />
    </div>
  );
}

export default App;
