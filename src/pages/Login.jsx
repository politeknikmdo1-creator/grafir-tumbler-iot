import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaEye,
  FaEyeSlash,
  FaCheckCircle,
  FaTimesCircle,
} from "react-icons/fa";

import elektro from "../assets/elektro.png";

export default function Login() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [toast, setToast] = useState("");
  const [toastType, setToastType] = useState("");
  const [showToastState, setShowToastState] = useState(false);

  const showToast = (message, type) => {
    setToast(message);
    setToastType(type);
    setShowToastState(true);

    setTimeout(() => {
      setShowToastState(false);
    }, 2500);
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const res = await fetch(
        "https://grafir-tumbler-backend.onrender.com/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username,
            password,
          }),
        }
      );

      const data = await res.json();

      if (data.success) {
        showToast("Login berhasil", "success");

        setTimeout(() => {
          navigate("/dashboard");
        }, 1500);
      } else {
        showToast("Username atau Password Salah", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Server Error", "error");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-blue-600 p-4 sm:p-8">

      {/* Toast */}

      <div
        className={`fixed top-4 sm:top-8 left-1/2 -translate-x-1/2 z-50 w-[92%] sm:w-auto max-w-md transition-all duration-500 ${
          showToastState
            ? "opacity-100 translate-y-0"
            : "opacity-0 -translate-y-10 pointer-events-none"
        }`}
      >
        <div
          className={`flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-3 sm:py-4 rounded-xl sm:rounded-2xl shadow-xl text-white ${
            toastType === "success"
              ? "bg-green-500"
              : "bg-red-500"
          }`}
        >
          <div className="text-lg sm:text-2xl flex-shrink-0">
            {toastType === "success" ? (
              <FaCheckCircle />
            ) : (
              <FaTimesCircle />
            )}
          </div>

          <span className="font-semibold text-sm sm:text-base">{toast}</span>
        </div>
      </div>

      {/* Card */}

      <div className="w-full max-w-6xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-2">

        {/* Left */}

        <div className="hidden sm:flex bg-white items-center justify-center p-6 sm:p-10">
          <img
            src={elektro}
            alt="Elektro"
            className="w-full max-w-xl object-contain"
          />
        </div>

        {/* Right */}

        <div className="flex items-center justify-center p-6 sm:p-10 lg:p-12">

          <div className="w-full max-w-md">

            <div className="flex justify-center mb-6 sm:hidden">
              <img
                src={elektro}
                alt="Elektro"
                className="w-32 object-contain"
              />
            </div>

            <div className="text-center mb-6 sm:mb-10">

              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-800">
                Login
              </h2>

              <p className="text-sm sm:text-base text-gray-500 mt-2 sm:mt-3">
                Silakan login untuk melanjutkan.
              </p>

            </div>

            <form onSubmit={handleLogin}>

              {/* Username */}

              <div className="mb-5 sm:mb-6">

                <label className="block mb-2 font-semibold text-sm sm:text-base text-gray-700">
                  Username
                </label>

                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan Username"
                  className="w-full border border-gray-300 rounded-xl px-4 sm:px-5 py-3 sm:py-4 text-sm sm:text-base bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  required
                />

              </div>

              {/* Password */}

              <div className="mb-6 sm:mb-8 relative">

                <label className="block mb-2 font-semibold text-sm sm:text-base text-gray-700">
                  Password
                </label>

                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan Password"
                  className="w-full border border-gray-300 rounded-xl px-4 sm:px-5 py-3 sm:py-4 pr-11 sm:pr-12 text-sm sm:text-base bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  required
                />

                <span
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 sm:right-5 top-[46px] sm:top-[53px] cursor-pointer text-gray-500 hover:text-blue-600 text-lg sm:text-xl"
                >
                  {showPassword ? <FaEye /> : <FaEyeSlash />}
                </span>

              </div>

              {/* Button */}

              <button
                type="submit"
                className="w-full py-3 sm:py-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-base sm:text-lg shadow-lg hover:shadow-xl transition duration-300"
              >
                Login
              </button>

            </form>

          </div>

        </div>

      </div>

    </div>
  );
}
