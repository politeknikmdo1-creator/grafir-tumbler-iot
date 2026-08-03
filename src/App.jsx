import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState } from "react";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Template from "./pages/Template";

import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";

function DashboardLayout() {
  const [showSidebar, setShowSidebar] = useState(true);

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar — satu-satunya kontrol buka/tutup ada di Topbar */}
      <Sidebar
        isOpen={showSidebar}
        onClose={() => setShowSidebar(false)}
      />

      {/* Content */}
      <div className="flex-1 flex flex-col min-h-screen w-full min-w-0">
        <Topbar
          showSidebar={showSidebar}
          setShowSidebar={setShowSidebar}
        />

        <div className="flex-1 p-4 md:p-6">
          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/template" element={<Template />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Login */}
        <Route path="/" element={<Login />} />

        {/* Dashboard + Template */}
        <Route path="/*" element={<DashboardLayout />} />
      </Routes>
    </BrowserRouter>
  );
}
