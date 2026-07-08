import { useState } from "react";

function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="app">
      <header className="app-header">
        <h1>织梦机 Zhimengji</h1>
        <p>AI-native content creation platform</p>
        <div className="card">
          <button onClick={() => setCount((c) => c + 1)}>
            count is {count}
          </button>
        </div>
      </header>
    </div>
  );
}

export default App;
