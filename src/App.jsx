import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState } from "react";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Template from "./pages/Template";

import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";

function DashboardLayout() {
  // ===== FIX: jangan selalu mulai dari true =====
  // Sebelumnya showSidebar selalu diinisialisasi `true`, jadi di HP
  // sidebar (+ overlay gelap) selalu tampil dulu sesaat sebelum
  // otomatis ditutup oleh Sidebar.jsx -> terlihat "muncul lalu hilang".
  // Sekarang nilai awalnya dicek dari lebar layar: di HP (< 768px)
  // langsung mulai tertutup, di desktop tetap terbuka seperti biasa.
  const [showSidebar, setShowSidebar] = useState(
    () => window.innerWidth >= 768
  );

  return (
    <div className="flex h-dvh bg-gray-100 overflow-hidden">
      {/* Sidebar — satu-satunya kontrol buka/tutup ada di Topbar */}
      <Sidebar
        isOpen={showSidebar}
        onClose={() => setShowSidebar(false)}
      />

      {/* Content */}
      <div className="flex-1 flex flex-col h-dvh min-w-0 overflow-hidden">
        <Topbar
          showSidebar={showSidebar}
          setShowSidebar={setShowSidebar}
        />

        {/* flex-1 + overflow-y-auto = satu-satunya area yang boleh scroll,
            sehingga halaman di dalamnya (Dashboard/Template) bisa pakai
            h-full untuk mengisi sisa ruang secara akurat */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
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
