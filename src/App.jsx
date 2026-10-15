import { useState } from "react";

export default function App() {
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  async function checkBackend() {
    setLoading(true);
    setResult("");

    try {
      const response = await fetch("/api/");

      if (!response.ok) {
        throw new Error(`Backend returned ${response.status}`);
      }

      setResult(await response.text());
    } catch (error) {
      setResult(`Connection failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <h1>CampusPoint</h1>
      <p>RIT campus information and points sharing.</p>

      <button onClick={checkBackend} disabled={loading}>
        {loading ? "Connecting..." : "Check backend connection"}
      </button>

      <pre>{result}</pre>
    </main>
  );
}