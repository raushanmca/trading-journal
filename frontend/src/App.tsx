import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

import JournalForm from "./components/JournalForm";
import Dashboard from "./components/Dashboard";

function App() {
  return (
    <DndProvider backend={HTML5Backend}>
      <BrowserRouter>
        <div style={{ padding: 10, textAlign: "center" }}>
          <Link to="/">Journal</Link> | <Link to="/dashboard">Dashboard</Link>
        </div>

        <Routes>
          <Route path="/" element={<JournalForm />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </BrowserRouter>
    </DndProvider>
  );
}

export default App;
