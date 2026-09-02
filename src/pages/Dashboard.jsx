import { useEffect, useMemo, useState } from "react";

const API_URL = import.meta.env.VITE_BACKEND_URL || "https://grafir-tumbler-backend.onrender.com";

export default function Dashboard() {
  const [status, setStatus] = useState({});
  const [antrian, setAntrian] = useState([]);
  const [startingId, setStartingId] = useState(null);
  const [modal, setModal] = useState({ open: false, title: "", message: "" });

  const showAlert = (title, message) => setModal({ open: true, title, message });
  const closeModal = () => setModal({ open: false, title: "", message: "" });

  const activeJob = useMemo(
    () => antrian.find((item) => item.status === "proses") || null,
    [antrian]
  );

  const getStatus = async () => {
    try {
      const res = await fetch(`${API_URL}/status_mesin`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setStatus(data || {});
    } catch (error) {
      console.log("GET status mesin error:", error);
    }
  };

  const getAntrian = async () => {
    try {
      const res = await fetch(`${API_URL}/antrian`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setAntrian(Array.isArray(data) ? data : []);
    } catch (error) {
      console.log("GET antrian error:", error);
    }
  };

  const refreshDashboard = async () => {
    await Promise.all([getStatus(), getAntrian()]);
  };

  const handlePower = async (switchValue) => {
    try {
      const res = await fetch(`${API_URL}/status_mesin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ switch: switchValue }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        showAlert("Gagal", data.message || "Gagal mengubah kontrol mesin.");
        return;
      }
      await getStatus();
    } catch (error) {
      console.log("POST status mesin error:", error);
      showAlert("Gagal", "Tidak dapat menghubungi backend kontrol mesin.");
    }
  };

  const handleStart = async (item) => {
    if (activeJob && activeJob.id !== item.id) {
      showAlert(
        "Antrian Dikunci",
        `Job #${activeJob.id} sedang diproses. Tunggu sampai status job aktif menjadi Selesai.`
      );
      return;
    }

    if (item.status !== "menunggu") return;

    try {
      setStartingId(item.id);
      const res = await fetch(`${API_URL}/antrian/${item.id}/start`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        showAlert("Start Gagal", data.message || "Job tidak dapat dimulai.");
        await getAntrian();
        return;
      }

      await refreshDashboard();
      showAlert(
        "Job Dimulai",
        `Job #${item.id} sekarang Sedang diproses. Job lain dikunci sampai mesin selesai bekerja.`
      );
    } catch (error) {
      console.log("START job error:", error);
      showAlert("Start Gagal", "Tidak dapat menghubungi backend.");
    } finally {
      setStartingId(null);
    }
  };

  const getStatusBadge = (itemStatus) => {
    if (itemStatus === "selesai") return "bg-green-100 text-green-700";
    if (itemStatus === "proses") return "bg-blue-100 text-blue-700";
    return "bg-yellow-100 text-yellow-700";
  };

  const getStatusLabel = (itemStatus) => {
    if (itemStatus === "selesai") return "Selesai";
    if (itemStatus === "proses") return "Sedang diproses";
    return "Menunggu";
  };

  useEffect(() => {
    refreshDashboard();
    const interval = setInterval(refreshDashboard, 2000);
    return () => clearInterval(interval);
  }, []);

  const ActionButton = ({ item }) => {
    const lockedByOtherJob = Boolean(activeJob && activeJob.id !== item.id);
    const isStarting = startingId === item.id;
    const canStart = item.status === "menunggu" && !lockedByOtherJob && !isStarting;

    let label = "Start";
    if (isStarting) label = "Memulai...";
    else if (item.status === "proses") label = "Sedang diproses";
    else if (item.status === "selesai") label = "Selesai";
    else if (lockedByOtherJob) label = "Terkunci";

    return (
      <button
        type="button"
        onClick={() => handleStart(item)}
        disabled={!canStart}
        className={`w-full sm:w-auto min-w-[130px] px-4 py-2.5 rounded-xl text-sm font-semibold transition ${
          canStart
            ? "bg-blue-600 hover:bg-blue-700 text-white shadow-md"
            : item.status === "proses"
              ? "bg-blue-100 text-blue-700 cursor-not-allowed"
              : item.status === "selesai"
                ? "bg-green-100 text-green-700 cursor-not-allowed"
                : "bg-slate-200 text-slate-500 cursor-not-allowed"
        }`}
      >
        {label}
      </button>
    );
  };

  const voltage = Number(status.voltage || 0);
  const current = Number(status.current || 0);
  const powerWatt = Number(status.power || 0);

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-2xl sm:rounded-3xl shadow-lg border border-slate-200 overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-blue-500 via-cyan-500 to-indigo-500" />
        <div className="p-4 sm:p-6 md:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-800">Monitoring Mesin</h2>
              <p className="text-sm text-slate-500">Voltage, arus, dan daya ditampilkan dari data mentah yang diterima API.</p>
            </div>
            <div className="inline-flex self-start sm:self-auto items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold bg-slate-100 text-slate-600">
              Update otomatis setiap 2 detik
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="border border-slate-200 rounded-2xl p-5 bg-slate-50">
              <p className="text-sm text-slate-500">Kontrol Mesin</p>
              <p className={`mt-2 text-3xl font-bold ${Number(status.switch) === 1 ? "text-green-600" : "text-red-500"}`}>
                {Number(status.switch) === 1 ? "ON" : "OFF"}
              </p>
              <div className="flex gap-2 mt-4">
                <button onClick={() => handlePower(1)} className="flex-1 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white font-semibold">ON</button>
                <button onClick={() => handlePower(0)} className="flex-1 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white font-semibold">OFF</button>
              </div>
            </div>

            <div className="border border-slate-200 rounded-2xl p-5 bg-slate-50">
              <p className="text-sm text-slate-500">Tegangan</p>
              <p className="mt-2 text-3xl font-bold text-slate-800">{voltage.toFixed(1)} <span className="text-lg text-slate-500">V</span></p>
              <p className="mt-3 text-xs text-slate-500">Voltage dari PZEM</p>
            </div>

            <div className="border border-blue-200 rounded-2xl p-5 bg-blue-50">
              <p className="text-sm text-blue-600">Arus</p>
              <p className="mt-2 text-3xl font-bold text-blue-700">{current.toFixed(3)} <span className="text-lg text-blue-500">A</span></p>
              <p className="mt-3 text-xs text-blue-600">Current real-time dari PZEM</p>
            </div>

            <div className="border border-slate-200 rounded-2xl p-5 bg-slate-50">
              <p className="text-sm text-slate-500">Daya</p>
              <p className="mt-2 text-3xl font-bold text-slate-800">{powerWatt.toFixed(1)} <span className="text-lg text-slate-500">W</span></p>
              <p className="mt-3 text-xs text-slate-500">Power aktual mesin</p>
            </div>

          </div>
        </div>
      </section>

      <section className="bg-white rounded-2xl sm:rounded-3xl shadow-lg border border-slate-200 overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-blue-500 via-cyan-500 to-indigo-500" />
        <div className="p-4 sm:p-6 md:p-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-800">Antrian Produksi</h2>
              <p className="text-slate-500 text-sm">Total Antrian: {antrian.length}</p>
            </div>
            <button onClick={refreshDashboard} className="px-5 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl shadow-lg w-full sm:w-auto">Refresh</button>
          </div>

          {activeJob && (
            <div className="mb-5 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
              <span className="font-semibold">Antrian terkunci.</span> Job #{activeJob.id} ({activeJob.name}) sedang diproses. Job lain akan aktif kembali setelah status job aktif menjadi Selesai.
            </div>
          )}

          <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-200">
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
                  <tr><td colSpan="5" className="py-16 text-center text-slate-400">Belum ada antrian produksi</td></tr>
                ) : antrian.map((item, index) => (
                  <tr key={item.id} className="border-b hover:bg-slate-50 transition">
                    <td className="p-4 text-center font-medium">{index + 1}</td>
                    <td className="p-4">
                      <div className="font-semibold text-slate-800">{item.name}</div>
                      <div className="text-xs text-slate-500">#{item.id}</div>
                    </td>
                    <td className="p-4 text-center">{item.text || "-"}</td>
                    <td className="p-4 text-center"><span className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusBadge(item.status)}`}>{getStatusLabel(item.status)}</span></td>
                    <td className="p-4 text-center"><ActionButton item={item} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden space-y-3">
            {antrian.length === 0 ? (
              <div className="py-16 text-center text-slate-400 rounded-2xl border border-slate-200">Belum ada antrian produksi</div>
            ) : antrian.map((item, index) => (
              <div key={item.id} className="rounded-2xl border border-slate-200 p-4 shadow-sm">
                <div className="flex justify-between items-start gap-3 mb-3">
                  <div>
                    <div className="text-xs text-slate-400 font-medium">#{index + 1} · ID {item.id}</div>
                    <div className="font-semibold text-slate-800">{item.name}</div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getStatusBadge(item.status)}`}>{getStatusLabel(item.status)}</span>
                </div>
                <div className="text-sm text-slate-500 mb-3"><span className="font-medium text-slate-600">Text: </span>{item.text || "-"}</div>
                <ActionButton item={item} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={closeModal}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-800">{modal.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">{modal.message}</p>
            <button onClick={closeModal} className="mt-5 w-full rounded-xl bg-blue-600 px-4 py-2.5 font-semibold text-white hover:bg-blue-700">OK</button>
          </div>
        </div>
      )}
    </div>
  );
}
