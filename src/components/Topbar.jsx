import { useNavigate, useLocation } from "react-router-dom";
import { FaBars } from "react-icons/fa";

export default function Topbar({ setShowSidebar, showSidebar }) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    navigate("/");
  };

  // fungsi menentukan judul
  const getTitle = () => {
    if (location.pathname === "/dashboard") return "Dashboard";
    if (location.pathname === "/template") return "Template";
    return "";
  };

  return (
    <div className="w-full bg-white shadow px-6 py-4 flex justify-between items-center">
      
      {/* Kiri */}
      <div className="flex items-center gap-4">
        <FaBars
          className="text-xl cursor-pointer"
          onClick={() => setShowSidebar(!showSidebar)}
        />
        <h1 className="text-xl font-bold">{getTitle()}</h1>
      </div>

      {/* Kanan */}
      <div className="flex items-center gap-4">
        <span className="text-gray-700">Admin</span>

        <button
          onClick={handleLogout}
          className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
        >
          Logout
        </button>
      </div>
    </div>
  );
}