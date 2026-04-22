import { Navigate, NavLink, Route, Routes } from "react-router-dom";
import MalettesPage from "./pages/MalettesPage";
import StructuresPage from "./pages/StructuresPage";
import StructurePlayPage from "./pages/StructurePlayPage";

function NavBar() {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    "nav-link" + (isActive ? " nav-link--active" : "");

  return (
    <header className="app-header">
      <div className="app-header__inner">
        <h1 className="app-title">Poker Admin</h1>
        <nav className="app-nav" aria-label="Navigation principale">
          <NavLink to="/malettes" className={linkClass}>
            Malettes
          </NavLink>
          <NavLink to="/structures" className={linkClass}>
            Structures
          </NavLink>
        </nav>
      </div>
    </header>
  );
}

export default function App() {
  return (
    <div className="app">
      <NavBar />
      <main className="app-main">
        <Routes>
          <Route path="/" element={<Navigate to="/malettes" replace />} />
          <Route path="/malettes" element={<MalettesPage />} />
          <Route path="/structures" element={<StructuresPage />} />
          <Route
            path="/structures/:id/play"
            element={<StructurePlayPage />}
          />
          <Route path="*" element={<Navigate to="/malettes" replace />} />
        </Routes>
      </main>
    </div>
  );
}
