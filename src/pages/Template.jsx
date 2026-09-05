import { useEffect, useRef, useState } from "react";
import { fabric } from "fabric";
import tumblerImg from "../assets/tumbler1.png";
const API_URL = "https://grafir-tumbler-backend.onrender.com";
const CANVAS_WIDTH = 150;
const CANVAS_HEIGHT = 320;
const EXPORT_PX_PER_MM = 10;
// Preset awal. Semua nilai tetap dapat diubah pengguna karena ukuran tumbler
// di lapangan dapat berbeda walaupun kapasitasnya sama.
const TUMBLER_PRESETS = {
 slim20: {
 label: "Tumbler 20 Oz - Slim",
 diameterMm: 74,
 heightMm: 210,
 workWidthMm: 80,
 workHeightMm: 180,
 },
 regular20: {
 label: "Tumbler 20 Oz - Regular",
 diameterMm: 78,
 heightMm: 205,
 workWidthMm: 85,
 workHeightMm: 175,
 },
 oz30: {
 label: "Tumbler 30 Oz",
 diameterMm: 90,
 heightMm: 240,
 workWidthMm: 100,
 workHeightMm: 205,
 },
 custom: {
 label: "Custom",
 diameterMm: 74,
 heightMm: 210,
 workWidthMm: 80,
 workHeightMm: 180,
 },
};
const SCALE_FACTORS = {
 "1:1": 1,
 "1:2": 0.5,
 "2:1": 2,
};
const round2 = (value) => Math.round((Number(value) || 0) * 100) / 100;
/**
 * Helper untuk menyusun beberapa fabric.Text/Line dalam baris-baris yang
 * otomatis di-center dan tidak saling tumpuk.
 */
const layoutTexts = (rows, options = {}) => {
 const { lineGap = 4, rowGap = 4, align = "center" } = options;
 let y = 0;
 const rowMeta = [];
 let maxWidth = 0;
 rows.forEach((row) => {
 const rowHeight = Math.max(...row.map((obj) => obj.height || 0));
 let x = 0;
 row.forEach((obj, i) => {
 let top = y;
 if (align === "center") {
 top = y + (rowHeight - (obj.height || 0)) / 2;
 } else if (align === "bottom") {
 top = y + (rowHeight - (obj.height || 0));
 }
 obj.set({ left: x, top });
 x += (obj.width || 0) + (i < row.length - 1 ? lineGap : 0);
 });
 rowMeta.push({ width: x, height: rowHeight });
 maxWidth = Math.max(maxWidth, x);
 y += rowHeight + rowGap;
 });
 rows.forEach((row, idx) => {
 const offsetX = (maxWidth - rowMeta[idx].width) / 2;
 row.forEach((obj) => obj.set({ left: (obj.left || 0) + offsetX }));
 });
 return rows.flat();
};
export default function Template() {
 const canvasRef = useRef(null);
 const fabricCanvas = useRef(null);
 const nextObjectIdRef = useRef(1);
 const editorSettingsRef = useRef({
 workWidthMm: TUMBLER_PRESETS.slim20.workWidthMm,
 workHeightMm: TUMBLER_PRESETS.slim20.workHeightMm,
 });
 const [templates, setTemplates] = useState([]);
 const [selected, setSelected] = useState(null);
 const [customText, setCustomText] = useState("");
 const [fontSize, setFontSize] = useState(18);
 const [rotation, setRotation] = useState(0);
 const [tumblerType, setTumblerType] = useState("slim20");
 const [tumblerDiameterMm, setTumblerDiameterMm] = useState(
 TUMBLER_PRESETS.slim20.diameterMm
 );
 const [tumblerHeightMm, setTumblerHeightMm] = useState(
 TUMBLER_PRESETS.slim20.heightMm
 );
 const [workWidthMm, setWorkWidthMm] = useState(
 TUMBLER_PRESETS.slim20.workWidthMm
 );
 const [workHeightMm, setWorkHeightMm] = useState(
 TUMBLER_PRESETS.slim20.workHeightMm
 );
 const [unit, setUnit] = useState("mm");
 const [scaleMode, setScaleMode] = useState("1:1");
 const [objectList, setObjectList] = useState([]);
 const [activeObjectId, setActiveObjectId] = useState(null);
 const [objectMetrics, setObjectMetrics] = useState(null);
 const [modal, setModal] = useState({
 open: false,
 title: "",
 message: "",
 confirmText: "OK",
 danger: false,
 onConfirm: null,
 });
 const [inputModal, setInputModal] = useState({
 open: false,
 title: "",
 placeholder: "",
 value: "",
 onSave: null,
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
 const showInputModal = (title, onSave, placeholder = "") => {
 setInputModal({
 open: true,
 title,
 placeholder,
 value: "",
 onSave,
 });
 };
 const closeInputModal = () => {
 setInputModal({ open: false, title: "", placeholder: "", value: "", onSave: null });
 };
 // ========================================================
 const findFirstText = (objects) => {
 for (const obj of objects) {
 if (
 obj.type === "i-text" ||
 obj.type === "textbox" ||
 obj.type === "text"
 ) {
 return obj;
 }
 if (obj.type === "group" && obj._objects) {
 const found = findFirstText(obj._objects);
 if (found) return found;
 }
 }
 return null;
 };
 const mmToDisplay = (valueMm) =>
 unit === "cm" ? round2((Number(valueMm) || 0) / 10) : round2(valueMm);
 const displayToMm = (value) => {
 const numberValue = Number(value);
 if (!Number.isFinite(numberValue)) return 0;
 return unit === "cm" ? numberValue * 10 : numberValue;
 };
 const getPresetLabel = (type = tumblerType) =>
 TUMBLER_PRESETS[type]?.label || TUMBLER_PRESETS.custom.label;
 const ensureEditorIdentity = (obj, index = 0, preferredLabel = "") => {
 if (!obj) return;
 if (!obj.editorId) {
 obj.set(
 "editorId",
 `obj-${Date.now()}-${nextObjectIdRef.current++}-${index}`
 );
 }
 if (!obj.editorLabel) {
 let label = preferredLabel;
 if (!label) {
 if (obj.type === "image") label = `Gambar ${index + 1}`;
 else if (obj.type === "group") label = `Group / WordArt ${index + 1}`;
 else if (["i-text", "textbox", "text"].includes(obj.type)) {
 const value = String(obj.text || "Text").trim();
 label = value ? `Text: ${value.slice(0, 24)}` : `Text ${index + 1}`;
 } else {
 label = `Objek ${index + 1}`;
 }
 }
 obj.set("editorLabel", label);
 }
 };
 const getObjectPhysicalMetrics = (obj, canvas = fabricCanvas.current) => {
 if (!obj || !canvas) return null;
 obj.setCoords();
 const rect = obj.getBoundingRect(true, true);
 const settings = editorSettingsRef.current;
 const widthMm = Number(settings.workWidthMm) || 1;
 const heightMm = Number(settings.workHeightMm) || 1;
 const xMm = (rect.left / canvas.width) * widthMm;
 const yMm = (rect.top / canvas.height) * heightMm;
 const objectWidthMm = (rect.width / canvas.width) * widthMm;
 const objectHeightMm = (rect.height / canvas.height) * heightMm;
 return {
 xMm: round2(xMm),
 yMm: round2(yMm),
 widthMm: round2(objectWidthMm),
 heightMm: round2(objectHeightMm),
 rightMm: round2(widthMm - xMm - objectWidthMm),
 bottomMm: round2(heightMm - yMm - objectHeightMm),
 };
 };
 const refreshObjectList = (canvas = fabricCanvas.current) => {
 if (!canvas) return;
 const objects = canvas.getObjects();
 objects.forEach((obj, index) => ensureEditorIdentity(obj, index));
 setObjectList(
 objects.map((obj, index) => ({
 id: obj.editorId,
 label: obj.editorLabel || `Objek ${index + 1}`,
 type: obj.type,
 }))
 );
 const active = canvas.getActiveObject();
 setActiveObjectId(active?.editorId || null);
 };
 const syncActiveObjectMetrics = (canvas = fabricCanvas.current) => {
 if (!canvas) return;
 const obj = canvas.getActiveObject();
 if (!obj) {
 setActiveObjectId(null);
 setObjectMetrics(null);
 return;
 }
 const index = Math.max(0, canvas.getObjects().indexOf(obj));
 ensureEditorIdentity(obj, index);
 setActiveObjectId(obj.editorId);
 const metrics = getObjectPhysicalMetrics(obj, canvas);
 setObjectMetrics(
 metrics
 ? {
 ...metrics,
 label: obj.editorLabel,
 type: obj.type,
 angle: round2(obj.angle || 0),
 }
 : null
 );
 };
 const keepObjectInsideCanvas = (obj, canvas = fabricCanvas.current) => {
 if (!obj || !canvas) return;
 obj.setCoords();
 let rect = obj.getBoundingRect(true, true);
 let deltaX = 0;
 let deltaY = 0;
 if (rect.left < 0) deltaX = -rect.left;
 if (rect.top < 0) deltaY = -rect.top;
 if (rect.left + rect.width > canvas.width) {
 deltaX = canvas.width - (rect.left + rect.width);
 }
 if (rect.top + rect.height > canvas.height) {
 deltaY = canvas.height - (rect.top + rect.height);
 }
 if (deltaX || deltaY) {
 obj.set({
 left: Number(obj.left || 0) + deltaX,
 top: Number(obj.top || 0) + deltaY,
 });
 obj.setCoords();
 }
 };
 const selectObjectFromList = (objectId) => {
 const canvas = fabricCanvas.current;
 if (!canvas) return;
 const obj = canvas.getObjects().find((item) => item.editorId === objectId);
 if (!obj) return;
 canvas.setActiveObject(obj);
 canvas.requestRenderAll();
 syncActiveObjectMetrics(canvas);
 };
 const updateActiveObjectMetric = (field, displayValue) => {
 const canvas = fabricCanvas.current;
 if (!canvas) return;
 const obj = canvas.getActiveObject();
 if (!obj) return;
 const valueMm = displayToMm(displayValue);
 if (!Number.isFinite(valueMm)) return;
 obj.setCoords();
 const rect = obj.getBoundingRect(true, true);
 const settings = editorSettingsRef.current;
 const workW = Number(settings.workWidthMm) || 1;
 const workH = Number(settings.workHeightMm) || 1;
 if (field === "x") {
 const targetPx = (valueMm / workW) * canvas.width;
 obj.set("left", Number(obj.left || 0) + (targetPx - rect.left));
 }
 if (field === "y") {
 const targetPx = (valueMm / workH) * canvas.height;
 obj.set("top", Number(obj.top || 0) + (targetPx - rect.top));
 }
 if (field === "width" && valueMm > 0 && rect.width > 0) {
 const targetWidthPx = (valueMm / workW) * canvas.width;
 obj.set("scaleX", Number(obj.scaleX || 1) * (targetWidthPx / rect.width));
 }
 if (field === "height" && valueMm > 0 && rect.height > 0) {
 const targetHeightPx = (valueMm / workH) * canvas.height;
 obj.set("scaleY", Number(obj.scaleY || 1) * (targetHeightPx / rect.height));
 }
 keepObjectInsideCanvas(obj, canvas);
 obj.setCoords();
 canvas.requestRenderAll();
 syncActiveObjectMetrics(canvas);
 };
 const applyTumblerPreset = (type) => {
 setTumblerType(type);
 const preset = TUMBLER_PRESETS[type];
 if (!preset || type === "custom") return;
 setTumblerDiameterMm(preset.diameterMm);
 setTumblerHeightMm(preset.heightMm);
 setWorkWidthMm(preset.workWidthMm);
 setWorkHeightMm(preset.workHeightMm);
 };
 const updatePhysicalSetting = (setter, value) => {
 const mmValue = displayToMm(value);
 if (!Number.isFinite(mmValue) || mmValue <= 0) return;
 setter(mmValue);
 setTumblerType("custom");
 };
 const buildEditorMetadata = (canvas) => {
 const scaleFactor = SCALE_FACTORS[scaleMode] || 1;
 const objects = canvas.getObjects();
 return {
 version: 1,
 tumbler: {
 type: tumblerType,
 label: getPresetLabel(),
 diameter_mm: round2(tumblerDiameterMm),
 height_mm: round2(tumblerHeightMm),
 work_width_mm: round2(workWidthMm),
 work_height_mm: round2(workHeightMm),
 },
 editor: {
 unit,
 scale: scaleMode,
 scale_factor: scaleFactor,
 canvas_width_px: canvas.width,
 canvas_height_px: canvas.height,
 coordinate_origin: "top-left",
 x_direction: "right",
 y_direction: "down",
 },
 objects: objects.map((obj, index) => {
 ensureEditorIdentity(obj, index);
 const metrics = getObjectPhysicalMetrics(obj, canvas);
 return {
 id: obj.editorId,
 label: obj.editorLabel,
 type: obj.type,
 x_mm: metrics?.xMm ?? 0,
 y_mm: metrics?.yMm ?? 0,
 right_mm: metrics?.rightMm ?? 0,
 bottom_mm: metrics?.bottomMm ?? 0,
 width_mm: metrics?.widthMm ?? 0,
 height_mm: metrics?.heightMm ?? 0,
 rotation_deg: round2(obj.angle || 0),
 output_x_mm: round2((metrics?.xMm ?? 0) * scaleFactor),
 output_y_mm: round2((metrics?.yMm ?? 0) * scaleFactor),
 output_width_mm: round2((metrics?.widthMm ?? 0) * scaleFactor),
 output_height_mm: round2((metrics?.heightMm ?? 0) * scaleFactor),
 };
 }),
 lasergrbl: {
 recommended_scale: scaleMode,
 recommended_width_mm: round2(workWidthMm * scaleFactor),
 recommended_height_mm: round2(workHeightMm * scaleFactor),
 note:
 "Import PNG menggunakan ukuran output di atas agar posisi dan ukuran fisik mengikuti editor.",
 },
 };
 };
 const serializeDesign = (canvas) => {
 const fabricJson = canvas.toJSON(["editorId", "editorLabel"]);
 return JSON.stringify({
 ...fabricJson,
 editor_metadata: buildEditorMetadata(canvas),
 });
 };
 const downloadUrl = (url, fileName) => {
 const link = document.createElement("a");
 link.href = url;
 link.download = fileName;
 document.body.appendChild(link);
 link.click();
 document.body.removeChild(link);
 };
 const downloadBlob = (blob, fileName) => {
 const url = URL.createObjectURL(blob);
 downloadUrl(url, fileName);
 setTimeout(() => URL.revokeObjectURL(url), 1000);
 };
 const sanitizeFileName = (value) =>
 String(value || "design-tumbler")
 .trim()
 .replace(/[^a-z0-9_-]+/gi, "_")
 .replace(/^_+|_+$/g, "") || "design-tumbler";
 const exportDesignFiles = async (fileName) => {
 const canvas = fabricCanvas.current;
 if (!canvas) return;
 const objects = canvas.getObjects();
 if (objects.length === 0) {
 showAlert("Canvas Masih Kosong", "Masukkan text atau logo dulu sebelum download.");
 return;
 }
 const cleanName = sanitizeFileName(fileName);
 const scaleFactor = SCALE_FACTORS[scaleMode] || 1;
 const outputWidthMm = Math.max(1, workWidthMm * scaleFactor);
 const outputHeightMm = Math.max(1, workHeightMm * scaleFactor);
 const outputWidthPx = Math.max(1, Math.round(outputWidthMm * EXPORT_PX_PER_MM));
 const outputHeightPx = Math.max(1, Math.round(outputHeightMm * EXPORT_PX_PER_MM));
 // Export seluruh area kerja, bukan crop object, supaya koordinat tidak hilang.
 const previewDataUrl = canvas.toDataURL({
 format: "png",
 quality: 1,
 multiplier: 4,
 left: 0,
 top: 0,
 width: canvas.width,
 height: canvas.height,
 });
 const img = new Image();
 const loaded = new Promise((resolve, reject) => {
 img.onload = resolve;
 img.onerror = reject;
 });
 img.src = previewDataUrl;
 await loaded;
 const outputCanvas = document.createElement("canvas");
 outputCanvas.width = outputWidthPx;
 outputCanvas.height = outputHeightPx;
 const ctx = outputCanvas.getContext("2d");
 ctx.clearRect(0, 0, outputWidthPx, outputHeightPx);
 ctx.drawImage(img, 0, 0, outputWidthPx, outputHeightPx);
 const pngDataUrl = outputCanvas.toDataURL("image/png", 1);
 downloadUrl(pngDataUrl, `${cleanName}.png`);
 const metadata = buildEditorMetadata(canvas);
 metadata.export = {
 png_file: `${cleanName}.png`,
 metadata_file: `${cleanName}-metadata.json`,
 output_width_px: outputWidthPx,
 output_height_px: outputHeightPx,
 px_per_mm: EXPORT_PX_PER_MM,
 output_width_mm: round2(outputWidthMm),
 output_height_mm: round2(outputHeightMm),
 };
 downloadBlob(
 new Blob([JSON.stringify(metadata, null, 2)], {
 type: "application/json;charset=utf-8",
 }),
 `${cleanName}-metadata.json`
 );
 };
 const handleDownloadDesign = () => {
 const canvas = fabricCanvas.current;
 if (!canvas || canvas.getObjects().length === 0) {
 showAlert("Canvas Masih Kosong", "Masukkan text atau logo dulu sebelum download.");
 return;
 }
 showInputModal(
 "Nama file download",
 async (fileName) => {
 closeInputModal();
 try {
 await exportDesignFiles(fileName);
 showAlert(
 "Download Berhasil",
 "PNG area kerja dan file metadata koordinat berhasil dibuat. Untuk LaserGRBL, gunakan ukuran output yang tercantum pada file metadata."
 );
 } catch (error) {
 console.log("DOWNLOAD design error:", error);
 showAlert("Download Gagal", "File desain gagal dibuat.");
 }
 },
 selected?.name || "design-tumbler"
 );
 };
 const getTemplates = async () => {
 try {
 const res = await fetch(`${API_URL}/templates`);
 const data = await res.json();
 if (Array.isArray(data)) {
 setTemplates(data);
 } else {
 setTemplates([]);
 }
 } catch (error) {
 console.log("GET templates error:", error);
 setTemplates([]);
 }
 };
 useEffect(() => {
 fabric.Object.prototype.transparentCorners = false;
 fabric.Object.prototype.cornerColor = "#3b82f6";
 fabric.Object.prototype.cornerStrokeColor = "#1d4ed8";
 fabric.Object.prototype.borderColor = "#3b82f6";
 fabric.Object.prototype.cornerSize = 8;
 const canvas = new fabric.Canvas(canvasRef.current, {
 width: CANVAS_WIDTH,
 height: CANVAS_HEIGHT,
 backgroundColor: "transparent",
 preserveObjectStacking: true,
 });
 fabricCanvas.current = canvas;
 const updateToolbar = () => {
 const obj = canvas.getActiveObject();
 if (!obj) {
 setActiveObjectId(null);
 setObjectMetrics(null);
 return;
 }
 const index = Math.max(0, canvas.getObjects().indexOf(obj));
 ensureEditorIdentity(obj, index);
 setRotation(Math.round(obj.angle || 0));
 if (["i-text", "textbox", "text"].includes(obj.type)) {
 setCustomText(obj.text || "");
 setFontSize(obj.fontSize || 18);
 }
 syncActiveObjectMetrics(canvas);
 refreshObjectList(canvas);
 };
 const updateMovingObject = (event) => {
 if (event?.target) keepObjectInsideCanvas(event.target, canvas);
 updateToolbar();
 };
 const updateObjectList = (event) => {
 if (event?.target) {
 const index = Math.max(0, canvas.getObjects().indexOf(event.target));
 ensureEditorIdentity(event.target, index);
 }
 refreshObjectList(canvas);
 syncActiveObjectMetrics(canvas);
 };
 canvas.on("selection:created", updateToolbar);
 canvas.on("selection:updated", updateToolbar);
 canvas.on("selection:cleared", updateToolbar);
 canvas.on("object:moving", updateMovingObject);
 canvas.on("object:modified", updateMovingObject);
 canvas.on("object:scaling", updateMovingObject);
 canvas.on("object:rotating", updateMovingObject);
 canvas.on("object:added", updateObjectList);
 canvas.on("object:removed", updateObjectList);
 getTemplates();
 refreshObjectList(canvas);
 return () => {
 canvas.dispose();
 };
 }, []);
 useEffect(() => {
 editorSettingsRef.current = {
 workWidthMm,
 workHeightMm,
 };
 const canvas = fabricCanvas.current;
 if (canvas) {
 syncActiveObjectMetrics(canvas);
 refreshObjectList(canvas);
 }
 }, [workWidthMm, workHeightMm]);
 const addTextObject = (textValue, size, options = {}) => {
 const canvas = fabricCanvas.current;
 if (!canvas) return;
 const text = new fabric.IText(textValue, {
 left: options.left || 20,
 top: options.top || 120,
 fontSize: size,
 fill: options.fill || "#000000",
 fontFamily: options.fontFamily || "Arial",
 fontWeight: options.fontWeight || "normal",
 fontStyle: options.fontStyle || "normal",
 stroke: null,
 strokeWidth: 0,
 shadow: null,
 textAlign: options.textAlign || "center",
 angle: options.angle || 0,
 });
 ensureEditorIdentity(text, canvas.getObjects().length, `Text: ${String(textValue).slice(0, 24)}`);
 canvas.add(text);
 canvas.setActiveObject(text);
 canvas.requestRenderAll();
 setCustomText(text.text);
 setFontSize(text.fontSize);
 setRotation(text.angle || 0);
 };
 const handleTambahText = () => {
 addTextObject(customText || "Masukkan Text", Number(fontSize) || 18, {
 left: 20,
 top: 120,
 });
 };
 const handleAddHeading = () => {
 addTextObject("Heading", 30, {
 left: 20,
 top: 90,
 fontWeight: "bold",
 });
 };
 const handleAddSubHeading = () => {
 addTextObject("Sub Heading", 20, {
 left: 20,
 top: 120,
 fontWeight: "bold",
 });
 };
 const handleAddBodyText = () => {
 addTextObject("Body Text", 16, {
 left: 25,
 top: 150,
 });
 };
 const addGroupToCanvas = (objects, left = 25, top = 120, scale = 1) => {
 const canvas = fabricCanvas.current;
 if (!canvas) return;
 const group = new fabric.Group(objects, {
 left,
 top,
 scaleX: scale,
 scaleY: scale,
 });
 ensureEditorIdentity(group, canvas.getObjects().length, "Group / WordArt");
 canvas.add(group);
 canvas.setActiveObject(group);
 canvas.requestRenderAll();
 setCustomText("");
 setFontSize(18);
 setRotation(0);
 };
 // ============== WORDART (SEMUA TEKS HITAM POLOS, TANPA STROKE/SHADOW) ==============
 const addWordArtPoliteknik = () => {
 const t1 = new fabric.Text("POLITEKNIK", {
 fontSize: 18,
 fill: "#000000",
 fontWeight: "bold",
 fontFamily: "Arial",
 });
 const t2 = new fabric.Text("NEGERI", {
 fontSize: 14,
 fill: "#000000",
 fontWeight: "bold",
 fontFamily: "Arial",
 });
 const t3 = new fabric.Text("MANADO", {
 fontSize: 8,
 fill: "#000000",
 fontFamily: "Arial",
 });
 const objects = layoutTexts([[t1], [t2], [t3]], { rowGap: 2 });
 addGroupToCanvas(objects, 25, 125, 0.85);
 };
 const addWordArtThankYou = () => {
 const t1 = new fabric.Text("THANK", {
 fontSize: 22,
 fill: "#000000",
 fontWeight: "bold",
 fontFamily: "Arial",
 });
 const t2 = new fabric.Text("YOU", {
 fontSize: 28,
 fill: "#000000",
 fontWeight: "bold",
 fontFamily: "Arial",
 });
 const objects = layoutTexts([[t1], [t2]], { rowGap: 2 });
 addGroupToCanvas(objects, 32, 125, 0.9);
 };
 const addWordArtCongratulations = () => {
 const t1 = new fabric.Text("CONGRATULATIONS", {
 fontSize: 13,
 fill: "#000000",
 fontWeight: "bold",
 fontFamily: "Arial",
 });
 const t2 = new fabric.Text("BEST MOMENT", {
 fontSize: 8,
 fill: "#000000",
 fontFamily: "Arial",
 });
 const objects = layoutTexts([[t1], [t2]], { rowGap: 3 });
 addGroupToCanvas(objects, 17, 125, 0.9);
 };
 const addWordArtSale = () => {
 const t1 = new fabric.Text("SALE", {
 fontSize: 30,
 fill: "#000000",
 fontWeight: "bold",
 fontFamily: "Arial",
 });
 const line = new fabric.Line([0, 0, t1.width, 0], {
 stroke: "#000000",
 strokeWidth: 1,
 });
 const t2 = new fabric.Text("SPECIAL OFFER", {
 fontSize: 8,
 fill: "#000000",
 fontFamily: "Arial",
 });
 const objects = layoutTexts([[t1], [line], [t2]], { rowGap: 4 });
 addGroupToCanvas(objects, 35, 120, 0.85);
 };
 const addWordArtPromo20 = () => {
 const t1 = new fabric.Text("GET UP TO", {
 fontSize: 10,
 fill: "#000000",
 fontWeight: "bold",
 fontFamily: "Arial",
 });
 const t2 = new fabric.Text("20%", {
 fontSize: 28,
 fill: "#000000",
 fontWeight: "bold",
 fontFamily: "Arial",
 });
 const t3 = new fabric.Text("OFF", {
 fontSize: 22,
 fill: "#000000",
 fontWeight: "bold",
 fontFamily: "Arial",
 });
 const t4 = new fabric.Text("ON YOUR FIRST ORDER", {
 fontSize: 8,
 fill: "#000000",
 fontFamily: "Arial",
 });
 const objects = layoutTexts([[t1], [t2, t3], [t4]], {
 lineGap: 4,
 rowGap: 3,
 align: "center",
 });
 addGroupToCanvas(objects, 30, 118, 0.9);
 };
 // ============== END WORDART ==============
 const handleTextChange = (e) => {
 const value = e.target.value;
 setCustomText(value);
 const canvas = fabricCanvas.current;
 if (!canvas) return;
 const obj = canvas.getActiveObject();
 if (
 obj &&
 (obj.type === "i-text" ||
 obj.type === "textbox" ||
 obj.type === "text")
 ) {
 obj.set("text", value);
 canvas.requestRenderAll();
 }
 };
 const handleFontSizeChange = (e) => {
 const value = Number(e.target.value);
 setFontSize(value);
 const canvas = fabricCanvas.current;
 if (!canvas) return;
 const obj = canvas.getActiveObject();
 if (
 obj &&
 (obj.type === "i-text" ||
 obj.type === "textbox" ||
 obj.type === "text")
 ) {
 obj.set("fontSize", value);
 canvas.requestRenderAll();
 }
 };
 const handleRotationChange = (e) => {
 const value = Number(e.target.value);
 setRotation(value);
 const canvas = fabricCanvas.current;
 if (!canvas) return;
 const obj = canvas.getActiveObject();
 if (!obj) return;
 obj.set("angle", value);
 keepObjectInsideCanvas(obj, canvas);
 obj.setCoords();
 canvas.requestRenderAll();
 syncActiveObjectMetrics(canvas);
 };
 const handleUpload = (e) => {
 const file = e.target.files[0];
 if (!file) return;
 if (!file.type.startsWith("image/")) {
 showAlert("Format Tidak Didukung", "File harus berupa gambar.");
 return;
 }
 const canvas = fabricCanvas.current;
 if (!canvas) return;
 const reader = new FileReader();
 reader.onload = () => {
 fabric.Image.fromURL(reader.result, (img) => {
 img.set({
 left: 35,
 top: 40,
 angle: 0,
 });
 img.scaleToWidth(80);
 ensureEditorIdentity(img, canvas.getObjects().length, file.name);
 canvas.add(img);
 canvas.setActiveObject(img);
 canvas.requestRenderAll();
 setRotation(0);
 refreshObjectList(canvas);
 syncActiveObjectMetrics(canvas);
 });
 };
 reader.readAsDataURL(file);
 e.target.value = "";
 };
 const handleHapusCanvas = () => {
 const canvas = fabricCanvas.current;
 if (!canvas) return;
 canvas.clear();
 canvas.backgroundColor = "transparent";
 canvas.requestRenderAll();
 setCustomText("");
 setFontSize(18);
 setRotation(0);
 setObjectList([]);
 setActiveObjectId(null);
 setObjectMetrics(null);
 };
 const handleHapusObject = () => {
 const canvas = fabricCanvas.current;
 if (!canvas) return;
 const obj = canvas.getActiveObject();
 if (!obj) {
 showAlert("Belum Ada Yang Dipilih", "Pilih text atau logo yang mau dihapus.");
 return;
 }
 canvas.remove(obj);
 canvas.discardActiveObject();
 canvas.requestRenderAll();
 setCustomText("");
 setFontSize(18);
 setRotation(0);
 refreshObjectList(canvas);
 syncActiveObjectMetrics(canvas);
 };
 const handleDuplicateObject = () => {
 const canvas = fabricCanvas.current;
 if (!canvas) return;
 const obj = canvas.getActiveObject();
 if (!obj) {
 showAlert("Belum Ada Yang Dipilih", "Pilih text atau logo yang mau disalin.");
 return;
 }
 obj.clone((cloned) => {
 cloned.set({
 left: obj.left + 10,
 top: obj.top + 10,
 editorId: null,
 editorLabel: `${obj.editorLabel || "Objek"} - Copy`,
 });
 ensureEditorIdentity(cloned, canvas.getObjects().length);
 canvas.add(cloned);
 canvas.setActiveObject(cloned);
 canvas.requestRenderAll();
 });
 };
 const handleUngroup = () => {
 const canvas = fabricCanvas.current;
 if (!canvas) return;
 const group = canvas.getActiveObject();
 if (!group || group.type !== "group") {
 showAlert("Bukan Group", "Pilih WordArt/group yang mau di-ungroup.");
 return;
 }
 const items = group._objects;
 group._restoreObjectsState();
 canvas.remove(group);
 items.forEach((item) => {
 canvas.add(item);
 });
 canvas.discardActiveObject();
 canvas.requestRenderAll();
 refreshObjectList(canvas);
 syncActiveObjectMetrics(canvas);
 };
 // ============== HELPER: generate thumbnail dari canvas ==============
 const getCanvasThumbnail = (canvas) => {
 const objects = canvas.getObjects();
 if (objects.length === 0) {
 return canvas.toDataURL({
 format: "png",
 quality: 1,
 multiplier: 2,
 });
 }
 // Hitung bounding box gabungan secara manual, tanpa membuat Group
 let minX = Infinity;
 let minY = Infinity;
 let maxX = -Infinity;
 let maxY = -Infinity;
 objects.forEach((obj) => {
 obj.setCoords();
 const rect = obj.getBoundingRect(true, true);
 minX = Math.min(minX, rect.left);
 minY = Math.min(minY, rect.top);
 maxX = Math.max(maxX, rect.left + rect.width);
 maxY = Math.max(maxY, rect.top + rect.height);
 });
 const padding = 10;
 const left = Math.max(0, minX - padding);
 const top = Math.max(0, minY - padding);
 const width = Math.min(canvas.width - left, maxX - minX + padding * 2);
 const height = Math.min(canvas.height - top, maxY - minY + padding * 2);
 return canvas.toDataURL({
 format: "png",
 quality: 1,
 multiplier: 2,
 left,
 top,
 width,
 height,
 });
 };
 const handleSelesai = () => {
 const canvas = fabricCanvas.current;
 if (!canvas) return;
 const objects = canvas.getObjects();
 if (objects.length === 0) {
 showAlert("Canvas Masih Kosong", "Masukkan text atau logo dulu sebelum mengirim.");
 return;
 }
 showInputModal(
 "Masukkan nama design untuk antrian",
 async (namaDesign) => {
 closeInputModal();
 if (!namaDesign || !namaDesign.trim()) return;
 const firstText = findFirstText(objects);
 const designJson = serializeDesign(canvas);
 const firstCanvasObject = objects[0] || null;
 const firstMetrics = firstCanvasObject
 ? getObjectPhysicalMetrics(firstCanvasObject, canvas)
 : null;
 const payload = {
 template_id: selected ? selected.id : null,
 machine_id: 1,
 name: namaDesign,
 text: firstText ? firstText.text : "",
 design_json: designJson,
 // Fabric.js menyimpan posisi/ukuran/sudut sebagai float (misal -65.61375),
 // sedangkan kolom di backend bertipe integer, jadi wajib dibulatkan.
 font_size: firstText ? Math.round(firstText.fontSize) : 18,
 rotation: firstText ? Math.round(firstText.angle || 0) : 0,
 pos_x: firstMetrics ? Math.round(firstMetrics.xMm) : 0,
 pos_y: firstMetrics ? Math.round(firstMetrics.yMm) : 0,
 box_width: firstMetrics ? Math.round(firstMetrics.widthMm) : 0,
 box_height: firstMetrics ? Math.round(firstMetrics.heightMm) : 0,
 status: "menunggu",
 };
 try {
 const res = await fetch(`${API_URL}/antrian`, {
 method: "POST",
 headers: {
 "Content-Type": "application/json",
 },
 body: JSON.stringify(payload),
 });
 const data = await res.json();
 if (res.ok && data.success) {
 showAlert("Berhasil", "Design berhasil ditambahkan ke antrian.");
 handleHapusCanvas();
 } else {
 showAlert(
 "Gagal Menambahkan",
 "Design gagal ditambahkan ke antrian: " + (data.message || "")
 );
 console.log(data);
 }
 } catch (error) {
 console.log("POST antrian error:", error);
 showAlert("Server Error", "Server error. Cek backend bagian /antrian.");
 }
 },
 "Contoh: Design Tumbler A"
 );
 };
 const handleSimpanTemplate = () => {
 const canvas = fabricCanvas.current;
 if (!canvas) return;
 const objects = canvas.getObjects();
 if (objects.length === 0) {
 showAlert("Canvas Masih Kosong", "Masukkan text atau logo dulu sebelum menyimpan template.");
 return;
 }
 showInputModal(
 "Masukkan nama template",
 async (namaTemplate) => {
 closeInputModal();
 if (!namaTemplate || !namaTemplate.trim()) return;
 const firstText = findFirstText(objects);
 const designJson = serializeDesign(canvas);
 // screenshot canvas jadi base64, nanti di-decode jadi file oleh backend
 const thumbnail = getCanvasThumbnail(canvas);
 const payload = {
 name: namaTemplate,
 file_path: "",
 text_value: firstText ? firstText.text : "",
 // Dibulatkan juga di sini karena kolomnya integer, sama seperti /antrian.
 font_size: firstText ? Math.round(firstText.fontSize) : 18,
 rotation: firstText ? Math.round(firstText.angle || 0) : 0,
 pos_x: firstText ? Math.round(firstText.left || 50) : 50,
 pos_y: firstText ? Math.round(firstText.top || 100) : 100,
 box_width: firstText ? Math.round(firstText.width || 120) : 120,
 box_height: firstText ? Math.round(firstText.height || 50) : 50,
 logo_path: "",
 logo_rotation: 0,
 logo_x: 60,
 logo_y: 40,
 logo_width: 80,
 logo_height: 80,
 design_json: designJson,
 // dikirim ke backend untuk diubah jadi file & disimpan pathnya ke file_path
 preview_image: thumbnail,
 };
 try {
 const res = await fetch(`${API_URL}/templates`, {
 method: "POST",
 headers: {
 "Content-Type": "application/json",
 },
 body: JSON.stringify(payload),
 });
 const data = await res.json();
 if (res.ok && data.success) {
 showAlert("Berhasil", "Template berhasil disimpan.");
 getTemplates();
 } else {
 showAlert("Gagal Menyimpan", "Template gagal disimpan: " + (data.message || ""));
 console.log(data);
 }
 } catch (error) {
 console.log("POST templates error:", error);
 showAlert("Server Error", "Server error. Cek backend bagian /templates.");
 }
 },
 "Contoh: Template Ulang Tahun"
 );
 };
 const handleSelect = (t) => {
 const canvas = fabricCanvas.current;
 if (!canvas) return;
 setSelected(t);
 canvas.clear();
 canvas.backgroundColor = "transparent";
 if (t.design_json) {
 let parsedDesign = t.design_json;
 try {
 parsedDesign =
 typeof t.design_json === "string" ? JSON.parse(t.design_json) : t.design_json;
 } catch (error) {
 console.log("PARSE template design_json error:", error);
 }
 const metadata = parsedDesign?.editor_metadata;
 if (metadata?.tumbler) {
 setTumblerType(metadata.tumbler.type || "custom");
 setTumblerDiameterMm(Number(metadata.tumbler.diameter_mm) || 74);
 setTumblerHeightMm(Number(metadata.tumbler.height_mm) || 210);
 setWorkWidthMm(Number(metadata.tumbler.work_width_mm) || 80);
 setWorkHeightMm(Number(metadata.tumbler.work_height_mm) || 180);
 }
 if (metadata?.editor?.unit) setUnit(metadata.editor.unit);
 if (metadata?.editor?.scale) setScaleMode(metadata.editor.scale);
 canvas.loadFromJSON(parsedDesign, () => {
 canvas.requestRenderAll();
 const objects = canvas.getObjects();
 objects.forEach((obj, index) => ensureEditorIdentity(obj, index));
 refreshObjectList(canvas);
 const firstText = findFirstText(objects);
 const firstCanvasObject = objects[0] || null;
 if (firstCanvasObject) {
 canvas.setActiveObject(firstCanvasObject);
 }
 if (firstText) {
 setCustomText(firstText.text || "");
 setFontSize(firstText.fontSize || 18);
 setRotation(Math.round(firstText.angle || 0));
 } else {
 setCustomText("");
 setFontSize(18);
 setRotation(0);
 }
 canvas.requestRenderAll();
 syncActiveObjectMetrics(canvas);
 });
 } else {
 if (t.text_value) {
 const text = new fabric.IText(t.text_value, {
 left: t.pos_x || 20,
 top: t.pos_y || 120,
 fontSize: t.font_size || 18,
 fill: "#000000",
 fontFamily: "Arial",
 angle: t.rotation || 0,
 });
 ensureEditorIdentity(text, canvas.getObjects().length, `Text: ${String(t.text_value).slice(0, 24)}`);
 canvas.add(text);
 canvas.setActiveObject(text);
 canvas.requestRenderAll();
 refreshObjectList(canvas);
 syncActiveObjectMetrics(canvas);
 setCustomText(t.text_value || "");
 setFontSize(t.font_size || 18);
 setRotation(t.rotation || 0);
 }
 }
 };
 const handleDelete = (id) => {
 showConfirm(
 "Hapus Template?",
 "Yakin ingin menghapus template ini? Tindakan ini tidak bisa dibatalkan.",
 async () => {
 closeModal();
 try {
 const res = await fetch(`${API_URL}/templates/${id}`, {
 method: "DELETE",
 });
 const data = await res.json();
 if (data.success) {
 getTemplates();
 if (selected && selected.id === id) {
 setSelected(null);
 handleHapusCanvas();
 }
 } else {
 showAlert("Gagal", "Template gagal dihapus.");
 }
 } catch (error) {
 console.log("DELETE template error:", error);
 showAlert("Server Error", "Server error.");
 }
 },
 "Ya, Hapus"
 );
 };
 return (
 <div className="flex flex-col lg:flex-row lg:h-full">
 {/* ===================== SIDEBAR KIRI ===================== */}
 {/*
 HANYA lg:w-80 (fixed 320px) yang diganti jadi lg:w-[clamp(...)]
 supaya sidebar ikut menyesuaikan ruang saat browser di-zoom di
 desktop. Semua class lain (termasuk w-full untuk mobile) TIDAK
 diubah sama sekali.
 */}
 <div className="w-full lg:w-[clamp(260px,26vw,340px)] m-2 sm:m-4 bg-white rounded-2xl shadow-md p-4 flex flex-col h-auto lg:h-full">
 {/* ===== Bagian ini TIDAK ikut scroll (statis) ===== */}
 <div className="flex-shrink-0">
 <h2 className="font-bold mb-4 text-lg text-gray-700 border-b pb-2">
 Editor Desain
 </h2>
 <label className="flex items-center justify-center w-full px-4 py-3 bg-gradient-to-r from-indigo-500 to-blue-600 text-white font-semibold rounded-xl cursor-pointer hover:from-indigo-600 hover:to-blue-700 transition transform
 hover:scale-105 shadow-md mb-4 active:scale-95">
 <svg
 className="w-5 h-5 mr-2 flex-shrink-0"
 fill="none"
 stroke="currentColor"
 viewBox="0 0 24 24"
 >
 <path
 strokeLinecap="round"
 strokeLinejoin="round"
 strokeWidth={2}
 d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
 />
 </svg>
 <span className="text-sm sm:text-base">Upload Logo / Gambar</span>
 <input
 type="file"
 accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
 onChange={handleUpload}
 className="hidden"
 />
 </label>
 <div className="grid grid-cols-3 gap-2 mb-4">
 <button
 onClick={handleAddHeading}
 className="bg-blue-500 text-white p-2 rounded-xl text-xs hover:bg-blue-600"
 >
 Add Heading
 </button>
 <button
 onClick={handleAddSubHeading}
 className="bg-blue-500 text-white p-2 rounded-xl text-xs hover:bg-blue-600"
 >
 Add Sub Heading
 </button>
 <button
 onClick={handleAddBodyText}
 className="bg-blue-500 text-white p-2 rounded-xl text-xs hover:bg-blue-600"
 >
 Add Body Text
 </button>
 </div>
 <button
 onClick={handleTambahText}
 className="w-full bg-green-500 text-white py-2 rounded-xl mb-3 hover:bg-green-600 transition"
 >
 Tambah Text Manual
 </button>
 <div className="border-t pt-3 mb-4">
 <h3 className="font-semibold text-sm text-gray-700 mb-3">
 WordArt Suggestions
 </h3>
 <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-3">
 <button
 onClick={addWordArtPoliteknik}
 className="border rounded-xl h-20 text-xs hover:bg-blue-50"
 >
 <b>POLITEKNIK</b>
 <br />
 NEGERI
 <br />
 <span className="text-[10px]">MANADO</span>
 </button>
 <button
 onClick={addWordArtThankYou}
 className="border rounded-xl h-20 text-sm hover:bg-blue-50"
 >
 <b>THANK</b>
 <br />
 <b className="text-xl">YOU</b>
 </button>
 <button
 onClick={addWordArtCongratulations}
 className="border rounded-xl h-20 text-[11px] hover:bg-blue-50"
 >
 <b>CONGRATULATIONS</b>
 <br />
 BEST MOMENT
 </button>
 <button
 onClick={addWordArtSale}
 className="border rounded-xl h-20 text-sm hover:bg-blue-50"
 >
 <b className="text-2xl">SALE</b>
 <br />
 <span className="text-[10px]">SPECIAL OFFER</span>
 </button>
 <button
 onClick={addWordArtPromo20}
 className="border rounded-xl h-20 text-sm hover:bg-blue-50 col-span-2 sm:col-span-3 lg:col-span-2"
 >
 GET UP TO <b className="text-xl">20% OFF</b>
 <br />
 <span className="text-[10px]">ON YOUR FIRST ORDER</span>
 </button>
 </div>
 </div>
 <button
 onClick={handleSimpanTemplate}
 className="w-full bg-blue-500 text-white py-2 rounded-xl mb-4 hover:bg-blue-600 transition"
 >
 Simpan Template
 </button>
 </div>
 {/* ===== Bagian scroll: object aktif + template tersimpan ===== */}
 <div className="lg:flex-1 lg:overflow-y-auto pr-1 -mr-1">
 <div className="mb-4 border-t pt-4">
 <div className="flex items-center justify-between gap-2 mb-2">
 <h3 className="font-semibold text-sm text-gray-700">Objek Desain</h3>
 <span className="text-[11px] text-gray-400">{objectList.length} objek</span>
 </div>
 {objectList.length > 0 ? (
 <div className="space-y-2">
 {objectList.map((item, index) => (
 <button
 key={item.id}
 type="button"
 onClick={() => selectObjectFromList(item.id)}
 className={`w-full rounded-xl border px-3 py-2 text-left text-xs transition ${
 activeObjectId === item.id
 ? "border-blue-400 bg-blue-50 text-blue-700"
 : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
 }`}
 >
 <span className="font-semibold">{index + 1}.</span> {item.label}
 </button>
 ))}
 </div>
 ) : (
 <p className="rounded-xl bg-gray-50 px-3 py-3 text-center text-xs text-gray-400">
 Belum ada objek pada area kerja.
 </p>
 )}
 </div>
 <div className="flex items-center justify-between gap-2 mb-3 border-t pt-4">
 <h3 className="font-semibold text-sm text-gray-700">Template Tersimpan</h3>
 <span className="text-[11px] text-gray-400">{templates.length} template</span>
 </div>
 <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-3 pb-2">
 {templates.map((t) => (
 <div
 key={t.id}
 onClick={() => handleSelect(t)}
 className="border p-2 cursor-pointer rounded-xl text-center bg-gray-50 hover:bg-blue-100 relative overflow-hidden"
 >
 <div className="w-full h-24 flex items-center justify-center bg-white rounded-lg mb-2 overflow-hidden border border-gray-100">
 {t.file_path ? (
 <img
 src={`${API_URL}${t.file_path}`}
 alt={t.name}
 className="max-h-full max-w-full object-contain"
 />
 ) : (
 <span className="text-gray-300 text-[10px]">No Preview</span>
 )}
 </div>
 <p className="text-sm truncate">{t.name}</p>
 <button
 onClick={(e) => {
 e.stopPropagation();
 handleDelete(t.id);
 }}
 className="mt-2 bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600 w-full"
 >
 Hapus
 </button>
 </div>
 ))}
 {templates.length === 0 && (
 <p className="col-span-2 sm:col-span-3 lg:col-span-2 text-center text-gray-400 text-sm py-6">
 Belum ada template tersimpan.
 </p>
 )}
 </div>
 </div>
 </div>
 {/* ===================== AREA CANVAS ===================== */}
 <div className="flex-1 flex flex-col items-center pt-4 lg:pt-6 px-2 sm:px-4 pb-6">
 <div className="w-full bg-white p-4 rounded-2xl shadow-md mb-4">
 <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
 <div>
 <h2 className="font-bold text-gray-800">Ukuran Tumbler & Area Kerja</h2>
 <p className="text-xs text-gray-500 mt-1">
 Pilih preset atau ubah ukuran secara manual. Nilai fisik disimpan dalam mm.
 </p>
 </div>
 <div className="flex gap-2">
 <select
 value={unit}
 onChange={(e) => setUnit(e.target.value)}
 className="rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none"
 >
 <option value="mm">mm</option>
 <option value="cm">cm</option>
 </select>
 <select
 value={scaleMode}
 onChange={(e) => setScaleMode(e.target.value)}
 className="rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none"
 >
 <option value="1:1">Skala 1:1</option>
 <option value="1:2">Skala 1:2</option>
 <option value="2:1">Skala 2:1</option>
 </select>
 </div>
 </div>
 <div className="mt-4 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
 <label className="col-span-2 md:col-span-3 xl:col-span-2">
 <span className="block text-[11px] font-semibold text-gray-500 mb-1">Jenis Tumbler</span>
 <select
 value={tumblerType}
 onChange={(e) => applyTumblerPreset(e.target.value)}
 className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none"
 >
 {Object.entries(TUMBLER_PRESETS).map(([key, value]) => (
 <option key={key} value={key}>{value.label}</option>
 ))}
 </select>
 </label>
 <label>
 <span className="block text-[11px] font-semibold text-gray-500 mb-1">Diameter ({unit})</span>
 <input
 type="number"
 step="0.1"
 min="1"
 value={mmToDisplay(tumblerDiameterMm)}
 onChange={(e) => updatePhysicalSetting(setTumblerDiameterMm, e.target.value)}
 className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none"
 />
 </label>
 <label>
 <span className="block text-[11px] font-semibold text-gray-500 mb-1">Tinggi ({unit})</span>
 <input
 type="number"
 step="0.1"
 min="1"
 value={mmToDisplay(tumblerHeightMm)}
 onChange={(e) => updatePhysicalSetting(setTumblerHeightMm, e.target.value)}
 className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none"
 />
 </label>
 <label>
 <span className="block text-[11px] font-semibold text-gray-500 mb-1">Area Lebar ({unit})</span>
 <input
 type="number"
 step="0.1"
 min="1"
 value={mmToDisplay(workWidthMm)}
 onChange={(e) => updatePhysicalSetting(setWorkWidthMm, e.target.value)}
 className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none"
 />
 </label>
 <label>
 <span className="block text-[11px] font-semibold text-gray-500 mb-1">Area Tinggi ({unit})</span>
 <input
 type="number"
 step="0.1"
 min="1"
 value={mmToDisplay(workHeightMm)}
 onChange={(e) => updatePhysicalSetting(setWorkHeightMm, e.target.value)}
 className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none"
 />
 </label>
 </div>
 <div className="mt-3 flex flex-wrap gap-2 text-xs">
 <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700">
 Area kerja: {mmToDisplay(workWidthMm)} x {mmToDisplay(workHeightMm)} {unit}
 </span>
 <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">
 Output: {mmToDisplay(workWidthMm * (SCALE_FACTORS[scaleMode] || 1))} x {mmToDisplay(workHeightMm * (SCALE_FACTORS[scaleMode] || 1))} {unit}
 </span>
 <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-700">
 LaserGRBL: gunakan 1:1 untuk ukuran fisik langsung
 </span>
 </div>
 </div>
 {/*
 ====== GRUP STICKY: TOOLBAR + KANVAS TUMBLER ======
 Tidak diubah - tetap satu grup sticky seperti sebelumnya.
 */}
 <div className="w-full flex flex-col items-center gap-4 sticky top-2 lg:top-4 z-10">
 {/*
 */}
 <div className="w-full sm:w-full bg-white px-4 py-3 rounded-2xl shadow-md flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3 max-w-full">
 <div className="sm:flex-shrink-0">
 <label className="block text-xs font-semibold text-gray-500 mb-1 sm:hidden">
 Text
 </label>
 <input
 value={customText}
 onChange={handleTextChange}
 placeholder="Masukkan Text"
 className="border px-3 py-2 rounded-xl w-full sm:w-56 outline-none focus:ring-2 focus:ring-blue-400"
 />
 </div>
 <div className="flex gap-3 sm:contents">
 <div className="w-20 flex-shrink-0 sm:w-20">
 <label className="block text-xs font-semibold text-gray-500 mb-1 sm:hidden">
 Ukuran
 </label>
 <input
 type="number"
 value={fontSize}
 onChange={handleFontSizeChange}
 className="border px-3 py-2 w-full sm:w-20 rounded-xl outline-none"
 />
 </div>
 <div className="flex-1 sm:flex-initial sm:flex-shrink-0 sm:flex sm:items-center sm:gap-2">
 <label className="block text-xs font-semibold text-gray-500 mb-1 sm:hidden">
 Rotasi
 </label>
 <span className="hidden sm:inline text-sm whitespace-nowrap">Rotasi</span>
 <input
 type="range"
 min="-180"
 max="180"
 value={rotation}
 onChange={handleRotationChange}
 className="w-full sm:w-auto"
 />
 </div>
 </div>
 <div className="grid grid-cols-2 gap-2 pt-2 border-t sm:contents sm:border-0 sm:pt-0">
 <button
 onClick={handleUngroup}
 className="mt-2 sm:mt-0 sm:flex-shrink-0 sm:whitespace-nowrap bg-purple-100 text-purple-600 px-3 py-2 rounded-xl hover:bg-purple-200 text-sm"
 >
 Ungroup
 </button>
 <button
 onClick={handleDuplicateObject}
 className="mt-2 sm:mt-0 sm:flex-shrink-0 sm:whitespace-nowrap bg-blue-100 text-blue-600 px-3 py-2 rounded-xl hover:bg-blue-200 text-sm"
 >
 Copy
 </button>
 <button
 onClick={handleHapusObject}
 className="sm:flex-shrink-0 sm:whitespace-nowrap bg-orange-100 text-orange-600 px-3 py-2 rounded-xl hover:bg-orange-200 text-sm"
 >
 Hapus Dipilih
 </button>
 <button
 onClick={handleHapusCanvas}
 className="sm:flex-shrink-0 sm:whitespace-nowrap bg-red-100 text-red-600 px-3 py-2 rounded-xl hover:bg-red-200 text-sm"
 >
 Hapus Text & Logo
 </button>
 </div>
 <button
 onClick={handleDownloadDesign}
 className="w-full sm:w-auto sm:flex-shrink-0 sm:whitespace-nowrap bg-slate-800 text-white px-4 py-2.5 sm:py-2 rounded-xl hover:bg-slate-900 font-semibold transition shadow-md text-sm"
 >
 Download PNG + Data
 </button>
 <button
 onClick={handleSelesai}
 className="w-full sm:w-auto sm:flex-shrink-0 sm:whitespace-nowrap bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-2.5 sm:py-2 rounded-xl hover:from-green-600 hover:to-emerald-700 font-semibold transition
 shadow-md text-sm"
 >
 Selesai & Kirim
 </button>
 </div>
 <div className="w-full bg-white px-4 py-3 rounded-2xl shadow-md">
 <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
 <div>
 <h3 className="text-sm font-bold text-gray-700">Posisi & Ukuran Objek</h3>
 <p className="text-[11px] text-gray-400">
 Koordinat dihitung dari kiri-atas area kerja. Klik objek pada canvas atau daftar objek.
 </p>
 </div>
 {objectMetrics && (
 <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
 {objectMetrics.label}
 </span>
 )}
 </div>
 {objectMetrics ? (
 <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
 <label>
 <span className="block text-[11px] font-semibold text-gray-500 mb-1">X dari kiri ({unit})</span>
 <input
 type="number"
 step="0.1"
 value={mmToDisplay(objectMetrics.xMm)}
 onChange={(e) => updateActiveObjectMetric("x", e.target.value)}
 className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
 />
 </label>
 <label>
 <span className="block text-[11px] font-semibold text-gray-500 mb-1">Y dari atas ({unit})</span>
 <input
 type="number"
 step="0.1"
 value={mmToDisplay(objectMetrics.yMm)}
 onChange={(e) => updateActiveObjectMetric("y", e.target.value)}
 className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
 />
 </label>
 <label>
 <span className="block text-[11px] font-semibold text-gray-500 mb-1">Lebar ({unit})</span>
 <input
 type="number"
 min="0.1"
 step="0.1"
 value={mmToDisplay(objectMetrics.widthMm)}
 onChange={(e) => updateActiveObjectMetric("width", e.target.value)}
 className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
 />
 </label>
 <label>
 <span className="block text-[11px] font-semibold text-gray-500 mb-1">Tinggi ({unit})</span>
 <input
 type="number"
 min="0.1"
 step="0.1"
 value={mmToDisplay(objectMetrics.heightMm)}
 onChange={(e) => updateActiveObjectMetric("height", e.target.value)}
 className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
 />
 </label>
 <div className="rounded-xl bg-gray-50 px-3 py-2">
 <span className="block text-[11px] font-semibold text-gray-500">Dari kanan</span>
 <strong className="text-sm text-gray-700">{mmToDisplay(objectMetrics.rightMm)} {unit}</strong>
 </div>
 <div className="rounded-xl bg-gray-50 px-3 py-2">
 <span className="block text-[11px] font-semibold text-gray-500">Dari bawah</span>
 <strong className="text-sm text-gray-700">{mmToDisplay(objectMetrics.bottomMm)} {unit}</strong>
 </div>
 </div>
 ) : (
 <div className="rounded-xl bg-gray-50 px-4 py-4 text-center text-xs text-gray-400">
 Pilih satu objek untuk melihat koordinat dan ukurannya.
 </div>
 )}
 </div>
 {/* Kartu tumbler tetap menggunakan preview gambar; area kerja fisik ditentukan dari pengaturan di atas. */}
 <div className="w-full overflow-x-auto flex justify-center">
 <div className="bg-white p-4 sm:p-6 rounded-2xl shadow w-[300px] h-[500px] sm:w-[350px] sm:h-[550px] relative flex items-center justify-center flex-shrink-0">
 <img
 src={tumblerImg}
 className="absolute h-[430px] sm:h-[480px] pointer-events-none"
 />
 <div className="absolute w-[150px] h-[320px] flex items-center justify-center">
 <div className="absolute inset-0 pointer-events-none z-0">
 <div className="absolute inset-0 border-2 border-dashed border-green-400 rounded-md"></div>
 <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-white/95 px-3 py-1 text-[10px] font-semibold text-green-700 shadow">
 {mmToDisplay(workWidthMm)} x {mmToDisplay(workHeightMm)} {unit} - {scaleMode}
 </div>
 <span className="absolute -left-8 top-1 text-[9px] text-green-700">0</span>
 <span className="absolute -right-12 top-1 text-[9px] text-green-700">
 {mmToDisplay(workWidthMm)} {unit}
 </span>
 <span className="absolute -left-12 bottom-0 text-[9px] text-green-700">
 {mmToDisplay(workHeightMm)} {unit}
 </span>
 </div>
 <canvas
 ref={canvasRef}
 className="absolute z-10"
 width={CANVAS_WIDTH}
 height={CANVAS_HEIGHT}
 />
 </div>
 </div>
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
 className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${
 modal.danger ? "bg-red-100" : "bg-blue-100"
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
 className={`rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-md transition ${
 modal.danger
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
 {/* ============ MODAL INPUT (pengganti prompt) ============ */}
 {inputModal.open && (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
 <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl animate-[fadeInScale_0.15s_ease-out]">
 <h3 className="text-base font-bold text-gray-800 mb-1">
 {inputModal.title}
 </h3>
 <p className="text-xs text-gray-400 mb-4">
 Isi kolom di bawah, lalu klik simpan untuk melanjutkan.
 </p>
 <input
 autoFocus
 type="text"
 value={inputModal.value}
 placeholder={inputModal.placeholder}
 onChange={(e) =>
 setInputModal((prev) => ({ ...prev, value: e.target.value }))
 }
 onKeyDown={(e) => {
 if (e.key === "Enter" && inputModal.value.trim()) {
 inputModal.onSave(inputModal.value);
 }
 if (e.key === "Escape") {
 closeInputModal();
 }
 }}
 className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
 />
 <div className="mt-6 flex justify-end gap-2">
 <button
 onClick={closeInputModal}
 className="rounded-xl bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-200"
 >
 Batal
 </button>
 <button
 disabled={!inputModal.value.trim()}
 onClick={() => inputModal.onSave(inputModal.value)}
 className="rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:from-green-600 hover:to-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
 >
 Simpan
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