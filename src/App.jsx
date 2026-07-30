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
      {/* Sidebar */}
      <div
        className={`transition-all duration-300 ${
          showSidebar ? "w-64" : "w-0"
        } overflow-hidden`}
      >
        <Sidebar />
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        <Topbar
          showSidebar={showSidebar}
          setShowSidebar={setShowSidebar}
        />

        <div className="flex-1 p-6">
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