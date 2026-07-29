import { Link, useLocation } from "react-router-dom";
import { MdDashboard } from "react-icons/md";
import { FaFileAlt } from "react-icons/fa";
import tumblerIcon from "../assets/tumbler.png";

export default function Sidebar() {
  const location = useLocation();

  return (
    <div className="w-64 h-screen bg-gradient-to-b from-blue-700 via-blue-600 to-indigo-700 text-white flex flex-col shadow-2xl">

      {/* Header */}
      <div className="p-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center">
            <img
              src={tumblerIcon}
              alt="tumbler"
              className="w-8 h-8 object-contain"
            />
          </div>

          <div>
            <h1 className="text-2xl font-bold">
              Tumbler
            </h1>

            <p className="text-blue-200 text-sm">
              Grafir System
            </p>
          </div>
        </div>

        <div className="mt-6 border-t border-white/20"></div>
      </div>

      {/* Menu */}
      <div className="px-3">

        <ul className="space-y-3">

          <li className="pr-5">
            <Link
              to="/dashboard"
              className={`flex items-center gap-4 px-4 py-3 rounded-2xl transition-all duration-300 ${
                location.pathname === "/dashboard"
                  ? "bg-white text-blue-600 shadow-lg"
                  : "text-white hover:bg-white/10"
              }`}
            >
              <div
                className={`p-2 rounded-xl ${
                  location.pathname === "/dashboard"
                    ? "bg-blue-100"
                    : "bg-white/10"
                }`}
              >
                <MdDashboard size={22} />
              </div>

              <span className="font-medium">
                Dashboard
              </span>
            </Link>
          </li>

          <li className="pr-5">
            <Link
              to="/template"
              className={`flex items-center gap-4 px-4 py-3 rounded-2xl transition-all duration-300 ${
                location.pathname === "/template"
                  ? "bg-white text-blue-600 shadow-lg"
                  : "text-white hover:bg-white/10"
              }`}
            >
              <div
                className={`p-2 rounded-xl ${
                  location.pathname === "/template"
                    ? "bg-blue-100"
                    : "bg-white/10"
                }`}
              >
                <FaFileAlt size={18} />
              </div>

              <span className="font-medium">
                Template
              </span>
            </Link>
          </li>

        </ul>
      </div>

      {/* Footer */}
      <div className="mt-auto p-6 border-t border-white/10">

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
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
  );
}