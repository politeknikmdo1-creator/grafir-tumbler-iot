import { useEffect, useState } from "react";
import { fabric } from "fabric";

const API_URL = "https://grafir-tumbler-backend-production.up.railway.app";

export default function Dashboard() {
  const [status, setStatus] = useState({});
  const [antrian, setAntrian] = useState([]);

  // modal = dipakai untuk alert (onConfirm null) & confirm (onConfirm ada)
  const [modal, setModal] = useState({
    open: false,
    title: "",
    message: "",
    confirmText: "OK",
    danger: false,
    onConfirm: null,
  });

  // ================= Helper untuk modal =================
  const showAlert = (title, message) => {
    setModal({
      open: true,
      title,
      message,
      confirmText: "OK",
      danger: false,
      onConfirm: null,
    });
  };

  const showConfirm = (title, message, onConfirm, confirmText = "Ya, Lanjutkan") => {
    setModal({
      open: true,
      title,
      message,
      confirmText,
      danger: true,
      onConfirm,
    });
  };

  const closeModal = () => {
    setModal({
      open: false,
      title: "",
      message: "",
      confirmText: "OK",
      danger: false,
      onConfirm: null,
    });
  };
  // ========================================================

  /* ================= AMBIL STATUS MESIN ================= */
  const getStatus = async () => {
    try {
      const res = await fetch(`${API_URL}/status_mesin`);
      const data = await res.json();
      setStatus(data || {});
    } catch (error) {
      console.log("GET status mesin error:", error);
      setStatus({});
    }
  };

  /* ================= AMBIL ANTRIAN ================= */
  const getAntrian = async () => {
    try {
      const res = await fetch(`${API_URL}/antrian`);
      const data = await res.json();

      if (Array.isArray(data)) {
        setAntrian(data);
      } else {
        setAntrian([]);
      }
    } catch (error) {
      console.log("GET antrian error:", error);
      setAntrian([]);
    }
  };

  /* ================= ON / OFF MESIN ================= */
  const handlePower = async (kontrol_mesin) => {
    try {
      const res = await fetch(`${API_URL}/status_mesin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ kontrol_mesin }),
      });

      const data = await res.json();

      if (data.success) {
        getStatus();
      } else {
        showAlert("Gagal", data.message || "Gagal mengubah kontrol mesin");
      }
    } catch (error) {
      console.log("POST status mesin error:", error);
      showAlert("Gagal", "Gagal mengubah kontrol mesin");
    }
  };

  /* ================= STATUS ANTRIAN SELESAI ================= */
  const updateAntrianSelesai = async (id) => {
    try {
      await fetch(`${API_URL}/antrian/${id}/selesai`, {
        method: "PUT",
      });

      getAntrian();
    } catch (error) {
      console.log("Update antrian selesai error:", error);
    }
  };

  /* ================= HAPUS ANTRIAN ================= */
  const handleDelete = (id) => {
    showConfirm(
      "Hapus Antrian?",
      "Yakin ingin menghapus antrian ini? Tindakan ini tidak bisa dibatalkan.",
      async () => {
        closeModal();

        try {
          const res = await fetch(`${API_URL}/antrian/${id}`, {
            method: "DELETE",
          });

          const data = await res.json();

          if (data.success) {
            showAlert("Berhasil", "Antrian berhasil dihapus.");
            getAntrian();
          } else {
            showAlert("Gagal", "Antrian gagal dihapus.");
          }
        } catch (error) {
          console.log("DELETE antrian error:", error);
          showAlert("Server Error", "Server error saat menghapus antrian.");
        }
      },
      "Ya, Hapus"
    );
  };

  /* ================= DOWNLOAD PNG UNTUK LASER ================= */
  const handleDownloadPNG = (item) => {
    try {
      if (!item.design_json) {
        showAlert(
          "Design Tidak Tersedia",
          "Pastikan data design_json ada di antrian."
        );
        return;
      }

      const tempCanvasEl = document.createElement("canvas");
      tempCanvasEl.width = 150;
      tempCanvasEl.height = 320;

      const tempCanvas = new fabric.StaticCanvas(tempCanvasEl, {
        width: 150,
        height: 320,
        backgroundColor: "#ffffff",
      });

      tempCanvas.loadFromJSON(item.design_json, async () => {
        tempCanvas.renderAll();

        const dataURL = tempCanvas.toDataURL({
          format: "png",
          quality: 1,
          multiplier: 4,
        });

        const link = document.createElement("a");
        link.href = dataURL;
        link.download = `${item.name || "hasil-design"}_${item.id}.png`;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        tempCanvas.dispose();

        // setelah download, status antrian menjadi selesai
        await updateAntrianSelesai(item.id);
      });
    } catch (error) {
      console.log("Download PNG error:", error);
      showAlert("Gagal", "Gagal download PNG.");
    }
  };

  /* ================= DOWNLOAD JSON CADANGAN ================= */
  const handleDownloadJSON = async (item) => {
    try {
      if (!item.design_json) {
        showAlert("Design Tidak Tersedia", "Design tidak tersedia.");
        return;
      }

      const designData = JSON.parse(item.design_json);
      const fileContent = JSON.stringify(designData, null, 2);

      const blob = new Blob([fileContent], {
        type: "application/json",
      });

      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `${item.name || "design"}_${item.id}.json`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);

      // setelah download, status antrian menjadi selesai
      await updateAntrianSelesai(item.id);
    } catch (error) {
      console.log("Download JSON error:", error);
      showAlert("Gagal", "Gagal download JSON.");
    }
  };

  /* ================= WARNA STATUS ANTRIAN ================= */
  const getStatusBadge = (itemStatus) => {
    if (itemStatus === "selesai") {
      return "bg-green-100 text-green-700";
    }

    if (itemStatus === "proses") {
      return "bg-blue-100 text-blue-700";
    }

    return "bg-yellow-100 text-yellow-700";
  };

  /* ================= USE EFFECT ================= */
  useEffect(() => {
    getStatus();
    getAntrian();

    const interval = setInterval(() => {
      getStatus();
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-white rounded-3xl shadow-lg border border-slate-200 overflow-hidden">
      <div className="h-2 bg-gradient-to-r from-blue-500 via-cyan-500 to-indigo-500"></div>

      <div className="p-8">
        <h2 className="text-2xl font-bold text-slate-800 mb-8">
          Status Mesin
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* KONTROL MESIN */}
          <div className="bg-gradient-to-br from-white to-slate-50 border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300">

            <div className="flex justify-between items-center mb-4">
              <h3 className="text-slate-500 font-medium">
                Kontrol Mesin
              </h3>

              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">

              </div>
            </div>

            <h1
              className={`text-4xl font-bold ${status.kontrol_mesin === "on"
                ? "text-green-500"
                : "text-red-500"
                }`}
            >
              {status.kontrol_mesin === "on" ? "ON" : "OFF"}
            </h1>

            <div className="flex gap-3 mt-6">

              <button
                onClick={() => handlePower("on")}
                className="flex-1 py-3 rounded-xl bg-green-500 hover:bg-green-600 text-white font-semibold shadow-lg"
              >
                ON
              </button>

              <button
                onClick={() => handlePower("off")}
                className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold shadow-lg"
              >
                OFF
              </button>

            </div>

            <p className="text-sm text-slate-500 mt-5">
              Relay control mesin grafir.
            </p>

          </div>

          {/* POWER ASLI */}
          <div className="bg-gradient-to-br from-white to-slate-50 border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300">

            <div className="flex justify-between items-center mb-4">
              <h3 className="text-slate-500 font-medium">
                Power Mesin Asli
              </h3>

              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">

              </div>
            </div>

            <h1
              className={`text-4xl font-bold ${status.power === "on"
                ? "text-green-500"
                : "text-red-500"
                }`}
            >
              {status.power === "on" ? "ON" : "OFF"}
            </h1>

            <p className="mt-5 text-sm text-slate-500">
              Monitoring arus dari sensor ACS712.
            </p>

          </div>

          {/* STATUS PROSES */}
          <div className="bg-gradient-to-br from-white to-slate-50 border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300">

            <div className="flex justify-between items-center mb-4">
              <h3 className="text-slate-500 font-medium">
                Status Produksi
              </h3>

              <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">

              </div>
            </div>

            <h1
              className={`text-4xl font-bold ${status.status === "running"
                ? "text-blue-600"
                : "text-slate-500"
                }`}
            >
              {status.status === "running"
                ? "RUNNING"
                : "IDLE"}
            </h1>

            <p className="mt-5 text-sm text-slate-500">
              RUNNING saat mesin benar-benar bekerja.
            </p>

          </div>

        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-lg border border-slate-200 overflow-hidden">

        <div className="h-2 bg-gradient-to-r from-blue-500 via-cyan-500 to-indigo-500"></div>

        <div className="p-8">

          <div className="flex justify-between items-center mb-6">

            <div>
              <h2 className="text-2xl font-bold text-slate-800">
                Antrian Produksi
              </h2>

              <p className="text-slate-500 text-sm">
                Total Antrian : {antrian.length}
              </p>
            </div>

            <button
              onClick={getAntrian}
              className="px-5 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl shadow-lg"
            >
              Refresh
            </button>

          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200">

            <table className="w-full">

              <thead>
                <tr className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
                  <th className="p-4">No</th>
                  <th className="p-4 text-left">Nama Design</th>
                  <th className="p-4">Text</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Aksi</th>
                </tr>
              </thead>

              <tbody>

                {antrian.length === 0 ? (
                  <tr>
                    <td
                      colSpan="5"
                      className="py-16 text-center text-slate-400"
                    >
                      Belum ada antrian produksi
                    </td>
                  </tr>
                ) : (
                  antrian.map((item, index) => (
                    <tr
                      key={item.id}
                      className="border-b hover:bg-slate-50 transition"
                    >
                      <td className="p-4 text-center font-medium">
                        {index + 1}
                      </td>

                      <td className="p-4">
                        <div className="font-semibold text-slate-800">
                          {item.name}
                        </div>

                        <div className="text-xs text-slate-500">
                          #{item.id}
                        </div>
                      </td>

                      <td className="p-4 text-center">
                        {item.text || "-"}
                      </td>

                      <td className="p-4 text-center">
                        <span
                          className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusBadge(
                            item.status
                          )}`}
                        >
                          {item.status}
                        </span>
                      </td>

                      <td className="p-4">
                        <div className="flex justify-center gap-2">

                          <button
                            onClick={() => handleDownloadPNG(item)}
                            className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium"
                          >
                            PNG
                          </button>

                          <button
                            onClick={() => handleDownloadJSON(item)}
                            className="px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium"
                          >
                            JSON
                          </button>

                          <button
                            onClick={() => handleDelete(item.id)}
                            className="px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium"
                          >
                            Hapus
                          </button>

                        </div>
                      </td>
                    </tr>
                  ))
                )}

              </tbody>

            </table>

          </div>

        </div>

      </div>

      {/* ============ MODAL ALERT / CONFIRM ============ */}
      {modal.open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => !modal.onConfirm && closeModal()}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl animate-[fadeInScale_0.15s_ease-out]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3 mb-4">
              <div
                className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${modal.danger ? "bg-red-100" : "bg-blue-100"
                  }`}
              >
                {modal.danger ? (
                  <svg
                    className="h-5 w-5 text-red-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01M10.29 3.86l-8.18 14.14A1.5 1.5 0 003.5 20.5h17a1.5 1.5 0 001.39-2.5L13.71 3.86a1.5 1.5 0 00-2.42 0z"
                    />
                  </svg>
                ) : (
                  <svg
                    className="h-5 w-5 text-blue-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                )}
              </div>

              <div className="flex-1 pt-1">
                <h3 className="text-base font-bold text-gray-800">
                  {modal.title}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-gray-500">
                  {modal.message}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              {modal.onConfirm && (
                <button
                  onClick={closeModal}
                  className="rounded-xl bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-200"
                >
                  Batal
                </button>
              )}

              <button
                onClick={() => (modal.onConfirm ? modal.onConfirm() : closeModal())}
                className={`rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-md transition ${modal.danger
                  ? "bg-red-500 hover:bg-red-600"
                  : "bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
                  }`}
              >
                {modal.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeInScale {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(4px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
