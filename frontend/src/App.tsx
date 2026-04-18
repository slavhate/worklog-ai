import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./contexts/ThemeContext";
import Dashboard from "./pages/Dashboard";
import Search from "./pages/Search";
import Settings from "./pages/Settings";
import DayView from "./pages/DayView";

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/search" element={<Search />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/day/:date" element={<DayView />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
