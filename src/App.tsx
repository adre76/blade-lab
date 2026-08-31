import { T } from "./theme.ts";

export default function App() {
  return (
    <div style={{ minHeight: "100dvh", background: T.bgPage, color: T.textPrimary }}>
      <h1 style={{ padding: 24, margin: 0 }}>Blade X Lab</h1>
    </div>
  );
}
