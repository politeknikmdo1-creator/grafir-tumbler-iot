import { useEffect, useMemo, useState } from "react";
import { fabric } from "fabric";
const API_URL =
 import.meta.env.VITE_BACKEND_URL ||
 "https://grafir-tumbler-backend.onrender.com";
const ACTIVE_STATUSES = ["persiapan", "proses"];
export default function Dashboard() {
 const [status, setStatus] = useState({});
 const [antrian, setAntrian] = useState([]);
 const [startingId, setStartingId] = useState(null);
 const [powerUpdating, setPowerUpdating] = useState(false);
 const [nowTick, setNowTick] = useState(Date.now());
 const [modal, setModal] = useState({
 open: false,
 title: "",
 message: "",
 });
 const showAlert = (title, message) =>
 setModal({ open: true, title, message });
 const closeModal = () =>
 setModal({ open: false, title: "", message: "" });
 const activeJob = useMemo(
 () => antrian.find((item) => ACTIVE_STATUSES.includes(item.status)) || null,
 [antrian]
 );
 const getStatus = async () => {
 try {
 const res = await fetch(`${API_URL}/status_mesin`, {
 cache: "no-store",
 });
 if (!res.ok) throw new Error(`HTTP ${res.status}`);
 const data = await res.json();
 setStatus(data || {});
 } catch (error) {
 console.log("GET status mesin error:", error);
 }
 };
 const getAntrian = async () => {
 try {
 const res = await fetch(`${API_URL}/antrian`, {
 cache: "no-store",
 });
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
 setPowerUpdating(true);
 const res = await fetch(`${API_URL}/status_mesin`, {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({ switch: switchValue }),
 });
 const data = await res.json();
 if (!res.ok || !data.success) {
 showAlert(
 "Gagal",
 data.message || "Gagal mengubah kontrol mesin."
 );
 return;
 }
 await getStatus();
 } catch (error) {
 console.log("POST status mesin error:", error);
 showAlert(
 "Gagal",
 "Tidak dapat menghubungi backend kontrol mesin."
 );
 } finally {
 setPowerUpdating(false);
 }
 };
 const downloadJobDesign = async (item) => {
 if (!item.design_json) {
 throw new Error("Design JSON kosong");
 }
 const designData =
 typeof item.design_json === "string"
 ? JSON.parse(item.design_json)
 : item.design_json;
 const metadata = designData?.editor_metadata || null;
 const physicalArea = metadata?.tumbler || null;
 const editorMeta = metadata?.editor || null;
 const laserMeta = metadata?.lasergrbl || null;
 const safeName =
 String(item.name || "design")
 .trim()
 .replace(/[^a-z0-9_-]+/gi, "_")
 .replace(/^_+|_+$/g, "") || "design";
 // Desain baru dari Template menyimpan ukuran fisik area kerja di
 // editor_metadata. Untuk desain tersebut PNG tidak lagi di-crop hanya
 // mengikuti bounding-box object, tetapi diexport sebagai SELURUH area
 // kerja. Dengan begitu posisi X/Y object terhadap titik 0,0 tetap sama
 // saat gambar dibuka di LaserGRBL.
 if (physicalArea && editorMeta) {
 const scaleFactor = Number(editorMeta.scale_factor || 1) || 1;
 const scaleMode = String(editorMeta.scale || "1:1");
 const sourceWidthPx = Math.max(
 1,
 Math.round(Number(editorMeta.canvas_width_px) || 1)
 );
 const sourceHeightPx = Math.max(
 1,
 Math.round(Number(editorMeta.canvas_height_px) || 1)
 );
 const outputWidthMm = Math.max(
 0.1,
 Number(laserMeta?.recommended_width_mm) ||
 Number(physicalArea.work_width_mm || 1) * scaleFactor
 );
 const outputHeightMm = Math.max(
 0.1,
 Number(laserMeta?.recommended_height_mm) ||
 Number(physicalArea.work_height_mm || 1) * scaleFactor
 );
 // 10 px/mm ~= 254 DPI. Cukup detail untuk image engraving dan masih
 // aman untuk browser. Untuk area custom yang sangat besar resolusi
 // otomatis diturunkan agar sisi terpanjang tidak melebihi 6000 px.
 const BASE_PIXELS_PER_MM = 10;
 const MAX_EXPORT_SIDE_PX = 6000;
 const pixelsPerMm = Math.max(
 1,
 Math.min(
 BASE_PIXELS_PER_MM,
 MAX_EXPORT_SIDE_PX / outputWidthMm,
 MAX_EXPORT_SIDE_PX / outputHeightMm
 )
 );
 const outputWidthPx = Math.max(
 1,
 Math.round(outputWidthMm * pixelsPerMm)
 );
 const outputHeightPx = Math.max(
 1,
 Math.round(outputHeightMm * pixelsPerMm)
 );
 const canvasElement = document.createElement("canvas");
 canvasElement.width = sourceWidthPx;
 canvasElement.height = sourceHeightPx;
 const tempCanvas = new fabric.StaticCanvas(canvasElement, {
 width: sourceWidthPx,
 height: sourceHeightPx,
 backgroundColor: "#ffffff",
 renderOnAddRemove: false,
 });
 try {
 await new Promise((resolve, reject) => {
 try {
 tempCanvas.loadFromJSON(designData, () => {
 // Template menyimpan background transparan untuk editor.
 // Saat export final untuk LaserGRBL, paksa background putih
 // agar object hitam selalu terbaca jelas dan konsisten.
 tempCanvas.setBackgroundColor("#ffffff", () => {
 tempCanvas.renderAll();
 resolve();
 });
 });
 } catch (error) {
 reject(error);
 }
 });
 const objects = tempCanvas.getObjects();
 if (objects.length === 0) {
 throw new Error("Design tidak memiliki object yang dapat diexport");
 }
 // Konversi seluruh koordinat Fabric dari preview editor ke ukuran
 // raster final. Rasio X/Y dipertahankan sehingga posisi fisik object
 // tetap sesuai metadata Template.
 const scaleX = outputWidthPx / sourceWidthPx;
 const scaleY = outputHeightPx / sourceHeightPx;
 objects.forEach((object) => {
 object.set({
 left: Number(object.left || 0) * scaleX,
 top: Number(object.top || 0) * scaleY,
 scaleX: Number(object.scaleX || 1) * scaleX,
 scaleY: Number(object.scaleY || 1) * scaleY,
 });
 object.setCoords();
 });
 tempCanvas.setDimensions({
 width: outputWidthPx,
 height: outputHeightPx,
 });
 tempCanvas.renderAll();
 const dataUrl = tempCanvas.toDataURL({
 format: "png",
 quality: 1,
 multiplier: 1,
 left: 0,
 top: 0,
 width: outputWidthPx,
 height: outputHeightPx,
 });
 const dimensionName = `${String(outputWidthMm).replace(
 ".",
 "_"
 )}x${String(outputHeightMm).replace(".", "_")}mm`;
 const scaleName = scaleMode.replace(":", "to");
 const link = document.createElement("a");
 link.href = dataUrl;
 link.download = `job-${item.id}-${safeName}-${dimensionName}-${scaleName}.png`;
 document.body.appendChild(link);
 link.click();
 document.body.removeChild(link);
 return {
 physical: true,
 widthMm: Math.round(outputWidthMm * 100) / 100,
 heightMm: Math.round(outputHeightMm * 100) / 100,
 scaleMode,
 widthPx: outputWidthPx,
 heightPx: outputHeightPx,
 };
 } finally {
 tempCanvas.dispose();
 }
 }
 // Fallback untuk job/template lama yang belum mempunyai editor_metadata.
 // Mekanisme crop lama tetap dipertahankan agar data lama tidak rusak.
 const canvasElement = document.createElement("canvas");
 canvasElement.width = 2000;
 canvasElement.height = 2000;
 const tempCanvas = new fabric.StaticCanvas(canvasElement, {
 width: 2000,
 height: 2000,
 backgroundColor: "#ffffff",
 renderOnAddRemove: false,
 });
 try {
 await new Promise((resolve, reject) => {
 try {
 tempCanvas.loadFromJSON(designData, () => {
 // Template menyimpan background transparan untuk editor.
 // Saat export final untuk LaserGRBL, paksa background putih
 // agar object hitam selalu terbaca jelas dan konsisten.
 tempCanvas.setBackgroundColor("#ffffff", () => {
 tempCanvas.renderAll();
 resolve();
 });
 });
 } catch (error) {
 reject(error);
 }
 });
 const objects = tempCanvas.getObjects();
 if (objects.length === 0) {
 throw new Error("Design tidak memiliki object yang dapat diexport");
 }
 const padding = 12;
 let bounds = objects.map((object) =>
 object.getBoundingRect(true, true)
 );
 let minLeft = Math.min(...bounds.map((box) => box.left));
 let minTop = Math.min(...bounds.map((box) => box.top));
 const shiftX = minLeft < padding ? padding - minLeft : 0;
 const shiftY = minTop < padding ? padding - minTop : 0;
 if (shiftX !== 0 || shiftY !== 0) {
 objects.forEach((object) => {
 object.set({
 left: Number(object.left || 0) + shiftX,
 top: Number(object.top || 0) + shiftY,
 });
 object.setCoords();
 });
 tempCanvas.renderAll();
 bounds = objects.map((object) =>
 object.getBoundingRect(true, true)
 );
 }
 minLeft = Math.min(...bounds.map((box) => box.left));
 minTop = Math.min(...bounds.map((box) => box.top));
 const maxRight = Math.max(
 ...bounds.map((box) => box.left + box.width)
 );
 const maxBottom = Math.max(
 ...bounds.map((box) => box.top + box.height)
 );
 const exportLeft = Math.max(0, Math.floor(minLeft - padding));
 const exportTop = Math.max(0, Math.floor(minTop - padding));
 const exportWidth = Math.max(
 1,
 Math.ceil(maxRight - minLeft + padding * 2)
 );
 const exportHeight = Math.max(
 1,
 Math.ceil(maxBottom - minTop + padding * 2)
 );
 const dataUrl = tempCanvas.toDataURL({
 format: "png",
 quality: 1,
 multiplier: 2,
 left: exportLeft,
 top: exportTop,
 width: exportWidth,
 height: exportHeight,
 });
 const link = document.createElement("a");
 link.href = dataUrl;
 link.download = `job-${item.id}-${safeName}.png`;
 document.body.appendChild(link);
 link.click();
 document.body.removeChild(link);
 return {
 physical: false,
 widthPx: exportWidth * 2,
 heightPx: exportHeight * 2,
 };
 } finally {
 tempCanvas.dispose();
 }
 };
 const handleStart = async (item) => {
 if (activeJob && activeJob.id !== item.id) {
 showAlert(
 "Antrian Dikunci",
 `Job #${activeJob.id} masih aktif pada tahap ${
 activeJob.status === "persiapan" ? "Persiapan" : "Sedang diproses"
 }. Tunggu sampai job aktif selesai.`
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
 showAlert(
 "Start Gagal",
 data.message || "Job tidak dapat dimulai."
 );
 await getAntrian();
 return;
 }
 let downloadBerhasil = true;
 let downloadInfo = null;
 try {
 downloadInfo = await downloadJobDesign(item);
 } catch (downloadError) {
 downloadBerhasil = false;
 console.log("DOWNLOAD design error:", downloadError);
 }
 await refreshDashboard();
 if (downloadBerhasil) {
 const ukuranInfo = downloadInfo?.physical
 ? ` PNG area kerja ${downloadInfo.widthMm} x ${downloadInfo.heightMm} mm (${downloadInfo.scaleMode}) berhasil didownload.`
 : " File PNG desain berhasil didownload.";
 showAlert(
 "Job Masuk Persiapan",
 `Job #${item.id} sekarang berstatus Persiapan. Runtime mulai dihitung.${ukuranInfo}`
 );
 } else {
 showAlert(
 "Job Masuk Persiapan - Download Gagal",
 `Job #${item.id} sudah berstatus Persiapan, tetapi file PNG gagal didownload. Cek console browser.`
 );
 }
 } catch (error) {
 console.log("START job error:", error);
 showAlert("Start Gagal", "Tidak dapat menghubungi backend.");
 } finally {
 setStartingId(null);
 }
 };
 const getStatusBadge = (itemStatus) => {
 if (itemStatus === "selesai") {
 return "bg-green-100 text-green-700";
 }
 if (itemStatus === "proses") {
 return "bg-blue-100 text-blue-700";
 }
 if (itemStatus === "persiapan") {
 return "bg-orange-100 text-orange-700";
 }
 return "bg-yellow-100 text-yellow-700";
 };
 const getStatusLabel = (itemStatus) => {
 if (itemStatus === "selesai") return "Selesai";
 if (itemStatus === "proses") return "Sedang diproses";
 if (itemStatus === "persiapan") return "Persiapan";
 return "Menunggu";
 };
 const formatSeconds = (totalSeconds) => {
 const safeSeconds = Math.max(0, Math.floor(Number(totalSeconds) || 0));
 const hours = Math.floor(safeSeconds / 3600);
 const minutes = Math.floor((safeSeconds % 3600) / 60);
 const seconds = safeSeconds % 60;
 return [hours, minutes, seconds]
 .map((value) => String(value).padStart(2, "0"))
 .join(":");
 };
 const getRuntimeSeconds = (item) => {
 if (!item.started_at) {
 return Number(item.runtime_seconds || 0);
 }
 const startedAtMs = new Date(item.started_at).getTime();
 if (!Number.isFinite(startedAtMs)) {
 return Number(item.runtime_seconds || 0);
 }
 const finishedAtMs = item.finished_at
 ? new Date(item.finished_at).getTime()
 : nowTick;
 if (!Number.isFinite(finishedAtMs)) {
 return Number(item.runtime_seconds || 0);
 }
 return Math.max(0, Math.floor((finishedAtMs - startedAtMs) / 1000));
 };
 useEffect(() => {
 refreshDashboard();
 const refreshInterval = setInterval(refreshDashboard, 2000);
 const runtimeInterval = setInterval(() => setNowTick(Date.now()), 1000);
 return () => {
 clearInterval(refreshInterval);
 clearInterval(runtimeInterval);
 };
 }, []);
 const ActionButton = ({ item }) => {
 const lockedByOtherJob = Boolean(
 activeJob && activeJob.id !== item.id
 );
 const isStarting = startingId === item.id;
 const canStart =
 item.status === "menunggu" &&
 !lockedByOtherJob &&
 !isStarting;
 let label = "Start";
 if (isStarting) label = "Memulai...";
 else if (item.status === "persiapan") label = "Persiapan";
 else if (item.status === "proses") label = "Sedang diproses";
 else if (item.status === "selesai") label = "Selesai";
 else if (lockedByOtherJob) label = "Terkunci";
 const disabledClass =
 item.status === "persiapan"
 ? "bg-orange-100 text-orange-700 cursor-not-allowed"
 : item.status === "proses"
 ? "bg-blue-100 text-blue-700 cursor-not-allowed"
 : item.status === "selesai"
 ? "bg-green-100 text-green-700 cursor-not-allowed"
 : "bg-slate-200 text-slate-500 cursor-not-allowed";
 return (
 <button
 type="button"
 onClick={() => handleStart(item)}
 disabled={!canStart}
 className={`w-full sm:w-auto min-w-[130px] px-4 py-2.5 rounded-xl text-sm font-semibold transition ${
 canStart
 ? "bg-blue-600 hover:bg-blue-700 text-white shadow-md"
 : disabledClass
 }`}
 >
 {label}
 </button>
 );
 };
 const voltage = Number(status.voltage || 0);
 const current = Number(status.current || 0);
 const powerWatt = Number(status.power || 0);
 const machineStatus = String(status.machine_status || "Idle");
 const isRunning = machineStatus.toLowerCase() === "running";
 const sensorOnline = status.sensor_online === true;
 const dataAgeSeconds =
 status.data_age_seconds !== null &&
 status.data_age_seconds !== undefined
 ? Number(status.data_age_seconds)
 : null;
 const switchOn = Number(status.switch) === 1;
 return (
 <div className="space-y-6">
 <section className="bg-white rounded-2xl sm:rounded-3xl shadow-lg border border-slate-200 overflow-hidden">
 <div className="h-2 bg-gradient-to-r from-blue-500 via-cyan-500 to-indigo-500" />
 <div className="p-4 sm:p-6 md:p-8">
 <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
 <div>
 <h2 className="text-xl sm:text-2xl font-bold text-slate-800">
 Monitoring Mesin
 </h2>
 <p className="text-sm text-slate-500">
 Status mesin, voltage, arus, dan daya diperbarui dari data
 PZEM yang diterima API.
 </p>
 </div>
 <div className="inline-flex self-start sm:self-auto items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold bg-slate-100 text-slate-600">
 Update otomatis setiap 2 detik
 </div>
 </div>
 <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
 <div className="border border-slate-200 rounded-2xl p-5 bg-slate-50">
 <p className="text-sm text-slate-500">Kontrol Mesin</p>
 <div className="mt-3 flex items-center justify-between gap-4">
 <div>
 <p
 className={`text-3xl font-bold ${
 switchOn ? "text-green-600" : "text-red-500"
 }`}
 >
 {switchOn ? "ON" : "OFF"}
 </p>
 <p className="mt-1 text-xs text-slate-500">
 Perintah daya mesin
 </p>
 </div>
 <button
 type="button"
 role="switch"
 aria-checked={switchOn}
 aria-label={
 switchOn ? "Matikan mesin" : "Nyalakan mesin"
 }
 onClick={() => handlePower(switchOn ? 0 : 1)}
 disabled={powerUpdating}
 className={`relative inline-flex h-8 w-16 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
 switchOn ? "bg-green-500" : "bg-slate-300"
 } ${
 powerUpdating
 ? "cursor-wait opacity-60"
 : "cursor-pointer"
 }`}
 >
 <span
 className={`inline-block h-6 w-6 rounded-full bg-white shadow-md transition-transform ${
 switchOn ? "translate-x-9" : "translate-x-1"
 }`}
 />
 </button>
 </div>
 <p className="mt-4 text-xs font-medium text-slate-600">
 {powerUpdating
 ? "Memperbarui kontrol..."
 : switchOn
 ? "Klik switch untuk OFF"
 : "Klik switch untuk ON"}
 </p>
 </div>
 <div
 className={`border rounded-2xl p-5 ${
 !sensorOnline
 ? "border-red-200 bg-red-50"
 : isRunning
 ? "border-emerald-200 bg-emerald-50"
 : "border-slate-200 bg-slate-50"
 }`}
 >
 <p
 className={`text-sm ${
 !sensorOnline
 ? "text-red-700"
 : isRunning
 ? "text-emerald-700"
 : "text-slate-500"
 }`}
 >
 Status Mesin
 </p>
 <div className="mt-2 flex items-center gap-3">
 <span
 className={`h-3 w-3 rounded-full ${
 !sensorOnline
 ? "bg-red-500"
 : isRunning
 ? "bg-emerald-500 animate-pulse"
 : "bg-slate-400"
 }`}
 />
 <p
 className={`text-3xl font-bold ${
 !sensorOnline
 ? "text-red-700"
 : isRunning
 ? "text-emerald-700"
 : "text-slate-700"
 }`}
 >
 {isRunning ? "RUNNING" : "IDLE"}
 </p>
 </div>
 <p
 className={`mt-3 text-xs ${
 !sensorOnline
 ? "text-red-600"
 : isRunning
 ? "text-emerald-600"
 : "text-slate-500"
 }`}
 >
 {!sensorOnline
 ? "Data PZEM tidak diperbarui dalam batas waktu"
 : isRunning
 ? "Mesin terdeteksi sedang bekerja"
 : "Mesin tidak sedang melakukan proses grafir"}
 </p>
 <div className="mt-4">
 <span
 className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
 sensorOnline
 ? "bg-green-100 text-green-700"
 : "bg-red-100 text-red-700"
 }`}
 >
 {sensorOnline ? "PZEM Terhubung" : "PZEM Terputus"}
 </span>
 </div>
 {dataAgeSeconds !== null && (
 <p className="mt-2 text-xs text-slate-400">
 Data terakhir: {dataAgeSeconds} detik lalu
 </p>
 )}
 </div>
 <div className="border border-slate-200 rounded-2xl p-5 bg-slate-50">
 <p className="text-sm text-slate-500">Tegangan</p>
 <p className="mt-2 text-3xl font-bold text-slate-800">
 {voltage.toFixed(1)}{" "}
 <span className="text-lg text-slate-500">V</span>
 </p>
 <p className="mt-3 text-xs text-slate-500">
 Voltage dari PZEM
 </p>
 </div>
 <div className="border border-blue-200 rounded-2xl p-5 bg-blue-50">
 <p className="text-sm text-blue-600">Arus</p>
 <p className="mt-2 text-3xl font-bold text-blue-700">
 {current.toFixed(3)}{" "}
 <span className="text-lg text-blue-500">A</span>
 </p>
 <p className="mt-3 text-xs text-blue-600">
 Current real-time dari PZEM
 </p>
 </div>
 <div className="border border-slate-200 rounded-2xl p-5 bg-slate-50">
 <p className="text-sm text-slate-500">Daya</p>
 <p className="mt-2 text-3xl font-bold text-slate-800">
 {powerWatt.toFixed(1)}{" "}
 <span className="text-lg text-slate-500">W</span>
 </p>
 <p className="mt-3 text-xs text-slate-500">
 Power aktual mesin
 </p>
 </div>
 </div>
 </div>
 </section>
 <section className="bg-white rounded-2xl sm:rounded-3xl shadow-lg border border-slate-200 overflow-hidden">
 <div className="h-2 bg-gradient-to-r from-blue-500 via-cyan-500 to-indigo-500" />
 <div className="p-4 sm:p-6 md:p-8">
 <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
 <div>
 <h2 className="text-xl sm:text-2xl font-bold text-slate-800">
 Antrian Produksi
 </h2>
 <p className="text-slate-500 text-sm">
 Total Antrian: {antrian.length}
 </p>
 </div>
 <button
 type="button"
 onClick={refreshDashboard}
 className="px-5 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl shadow-lg w-full sm:w-auto"
 >
 Refresh
 </button>
 </div>
 {activeJob && (
 <div className="mb-5 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
 <span className="font-semibold">Antrian terkunci.</span>{" "}
 Job #{activeJob.id} ({activeJob.name}) sedang pada tahap{" "}
 <span className="font-semibold">
 {getStatusLabel(activeJob.status)}
 </span>
 . Job lain akan aktif kembali setelah job aktif selesai.
 </div>
 )}
 <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-200">
 <table className="w-full min-w-[1180px]">
 <thead>
 <tr className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
 <th className="p-4">Posisi</th>
 <th className="p-4">ID Job</th>
 <th className="p-4">ID Mesin</th>
 <th className="p-4 text-left">Nama Design</th>
 <th className="p-4">Text</th>
 <th className="p-4">Status</th>
 <th className="p-4">Runtime</th>
 <th className="p-4">Aksi</th>
 </tr>
 </thead>
 <tbody>
 {antrian.length === 0 ? (
 <tr>
 <td
 colSpan="8"
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
 <td className="p-4 text-center font-semibold text-slate-700">
 {item.queue_position ?? index + 1}
 </td>
 <td className="p-4 text-center font-mono text-sm font-semibold text-slate-700">
 #{item.id}
 </td>
 <td className="p-4 text-center font-mono text-sm text-slate-700">
 {item.machine_id ?? 1}
 </td>
 <td className="p-4">
 <div className="font-semibold text-slate-800">
 {item.name}
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
 {getStatusLabel(item.status)}
 </span>
 </td>
 <td className="p-4 text-center">
 <span className="inline-flex rounded-lg bg-slate-100 px-3 py-2 font-mono text-sm font-semibold tabular-nums text-slate-700">
 {formatSeconds(getRuntimeSeconds(item))}
 </span>
 </td>
 <td className="p-4 text-center">
 <ActionButton item={item} />
 </td>
 </tr>
 ))
 )}
 </tbody>
 </table>
 </div>
 <div className="md:hidden space-y-3">
 {antrian.length === 0 ? (
 <div className="py-16 text-center text-slate-400 rounded-2xl border border-slate-200">
 Belum ada antrian produksi
 </div>
 ) : (
 antrian.map((item, index) => (
 <div
 key={item.id}
 className="rounded-2xl border border-slate-200 p-4 shadow-sm"
 >
 <div className="flex justify-between items-start gap-3 mb-3">
 <div>
 <div className="text-xs text-slate-400 font-medium">
 Posisi {item.queue_position ?? index + 1}
 </div>
 <div className="font-semibold text-slate-800">
 {item.name}
 </div>
 </div>
 <span
 className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getStatusBadge(
 item.status
 )}`}
 >
 {getStatusLabel(item.status)}
 </span>
 </div>
 <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
 <div className="rounded-xl bg-slate-50 p-3">
 <p className="text-xs text-slate-400">ID Job</p>
 <p className="font-semibold text-slate-700">
 #{item.id}
 </p>
 </div>
 <div className="rounded-xl bg-slate-50 p-3">
 <p className="text-xs text-slate-400">ID Mesin</p>
 <p className="font-semibold text-slate-700">
 {item.machine_id ?? 1}
 </p>
 </div>
 <div className="rounded-xl bg-slate-50 p-3 col-span-2">
 <p className="text-xs text-slate-400">Runtime</p>
 <p className="font-mono font-semibold tabular-nums text-slate-700">
 {formatSeconds(getRuntimeSeconds(item))}
 </p>
 </div>
 </div>
 <div className="text-sm text-slate-500 mb-3">
 <span className="font-medium text-slate-600">
 Text:{" "}
 </span>
 {item.text || "-"}
 </div>
 <ActionButton item={item} />
 </div>
 ))
 )}
 </div>
 </div>
 </section>
 {modal.open && (
 <div
 className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
 onClick={closeModal}
 >
 <div
 className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
 onClick={(event) => event.stopPropagation()}
 >
 <h3 className="text-lg font-bold text-slate-800">
 {modal.title}
 </h3>
 <p className="mt-2 text-sm leading-relaxed text-slate-500">
 {modal.message}
 </p>
 <button
 type="button"
 onClick={closeModal}
 className="mt-5 w-full rounded-xl bg-blue-600 px-4 py-2.5 font-semibold text-white hover:bg-blue-700"
 >
 OK
 </button>
 </div>
 </div>
 )}
 </div>
 );
}