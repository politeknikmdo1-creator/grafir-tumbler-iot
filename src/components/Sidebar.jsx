import { Link, useLocation } from "react-router-dom";
import { MdDashboard } from "react-icons/md";
import { FaFileAlt } from "react-icons/fa";
import tumblerIcon from "../assets/tumbler.png";

// isOpen & onClose dikontrol dari App.jsx (state showSidebar),
// supaya hanya ADA SATU sumber kontrol (tombol hamburger di Topbar).
export default function Sidebar({ isOpen = true, onClose = () => {} }) {
  const location = useLocation();

  // otomatis tutup sidebar tiap pindah halaman (khusus HP)
  const handleLinkClick = () => {
    if (window.innerWidth < 768) onClose();
  };

  const menuItems = [
    { to: "/dashboard", label: "Dashboard", icon: MdDashboard, iconSize: 22 },
    { to: "/template", label: "Template", icon: FaFileAlt, iconSize: 18 },
  ];

  return (
    <>
      {/* ===== OVERLAY (khusus HP, saat sidebar terbuka) ===== */}
      {isOpen && (
        <div
          onClick={onClose}
          className="md:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
        />
      )}

      {/* ===== SIDEBAR ===== */}
      <div
        className={`
          w-64 h-screen bg-gradient-to-b from-blue-700 via-blue-600 to-indigo-700 text-white
          flex flex-col shadow-2xl flex-shrink-0
          fixed top-0 left-0 z-50
          transition-transform duration-300 ease-in-out
          md:static md:transition-all
          ${isOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0
          ${isOpen ? "md:w-64" : "md:w-0 md:overflow-hidden"}
        `}
      >

        {/* Header */}
        <div className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center flex-shrink-0">
              <img
                src={tumblerIcon}
                alt="tumbler"
                className="w-8 h-8 object-contain"
              />
            </div>

            <div>
              <h1 className="text-2xl font-bold whitespace-nowrap">
                Tumbler
              </h1>

              <p className="text-blue-200 text-sm whitespace-nowrap">
                Grafir System
              </p>
            </div>
          </div>

          <div className="mt-6 border-t border-white/20"></div>
        </div>

        {/* Menu */}
        <div className="px-3">

          <ul className="space-y-3">

            {menuItems.map(({ to, label, icon: Icon, iconSize }) => (
              <li key={to} className="pr-5">
                <Link
                  to={to}
                  onClick={handleLinkClick}
                  className={`flex items-center gap-4 px-4 py-3 rounded-2xl transition-all duration-300 ${
                    location.pathname === to
                      ? "bg-white text-blue-600 shadow-lg"
                      : "text-white hover:bg-white/10"
                  }`}
                >
                  <div
                    className={`p-2 rounded-xl ${
                      location.pathname === to
                        ? "bg-blue-100"
                        : "bg-white/10"
                    }`}
                  >
                    <Icon size={iconSize} />
                  </div>

                  <span className="font-medium">
                    {label}
                  </span>
                </Link>
              </li>
            ))}

          </ul>
        </div>

        {/* Footer */}
        <div className="mt-auto p-6 border-t border-white/10">

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
              ©
            </div>

            <div>
              <p className="font-medium">
                Grafir System
              </p>

              <p className="text-xs text-blue-200">
                Monitoring & Produksi
              </p>
            </div>
          </div>

        </div>

      </div>
    </>
  );
}
