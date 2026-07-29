import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useState } from "react";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Template from "./pages/Template";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";

function Layout() {
  const location = useLocation();
  const [showSidebar, setShowSidebar] = useState(true);

  // Halaman login
  if (location.pathname === "/") {
    return <Login />;
  }

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
          setShowSidebar={setShowSidebar} 
          showSidebar={showSidebar} 
        />

        {/* ini penting banget */}
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
      <Layout />
    </BrowserRouter>
  );
}