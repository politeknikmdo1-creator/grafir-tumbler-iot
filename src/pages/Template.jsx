import { useEffect, useRef, useState } from "react";
import { fabric } from "fabric";
import tumblerImg from "../assets/tumbler1.png";

const API_URL = "https://grafir-tumbler-backend-production.up.railway.app";

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

  const [templates, setTemplates] = useState([]);
  const [selected, setSelected] = useState(null);

  const [customText, setCustomText] = useState("");
  const [fontSize, setFontSize] = useState(18);
  const [rotation, setRotation] = useState(0);

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
      width: 150,
      height: 320,
      backgroundColor: "transparent",
      preserveObjectStacking: true,
    });

    fabricCanvas.current = canvas;

    const updateToolbar = () => {
      const obj = canvas.getActiveObject();
      if (!obj) return;

      setRotation(Math.round(obj.angle || 0));

      if (
        obj.type === "i-text" ||
        obj.type === "textbox" ||
        obj.type === "text"
      ) {
        setCustomText(obj.text || "");
        setFontSize(obj.fontSize || 18);
      }
    };

    canvas.on("selection:created", updateToolbar);
    canvas.on("selection:updated", updateToolbar);
    canvas.on("object:modified", updateToolbar);
    canvas.on("object:scaling", updateToolbar);
    canvas.on("object:rotating", updateToolbar);

    getTemplates();

    return () => {
      canvas.dispose();
    };
  }, []);

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
    canvas.requestRenderAll();
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

        canvas.add(img);
        canvas.setActiveObject(img);
        canvas.requestRenderAll();

        setRotation(0);
      });
    };

    reader.readAsDataURL(file);
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
      });

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
        const designJson = JSON.stringify(canvas.toJSON());

        const payload = {
          template_id: selected ? selected.id : null,
          name: namaDesign,
          text: firstText ? firstText.text : "",
          design_json: designJson,
          font_size: firstText ? firstText.fontSize : 18,
          rotation: firstText ? firstText.angle || 0 : 0,
          pos_x: firstText ? firstText.left || 50 : 50,
          pos_y: firstText ? firstText.top || 100 : 100,
          box_width: firstText ? firstText.width || 120 : 120,
          box_height: firstText ? firstText.height || 50 : 50,
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
        const designJson = JSON.stringify(canvas.toJSON());

        // screenshot canvas jadi base64, nanti di-decode jadi file oleh backend
        const thumbnail = getCanvasThumbnail(canvas);

        const payload = {
          name: namaTemplate,
          file_path: "",
          text_value: firstText ? firstText.text : "",
          font_size: firstText ? firstText.fontSize : 18,
          rotation: firstText ? firstText.angle || 0 : 0,
          pos_x: firstText ? firstText.left || 50 : 50,
          pos_y: firstText ? firstText.top || 100 : 100,
          box_width: firstText ? firstText.width || 120 : 120,
          box_height: firstText ? firstText.height || 50 : 50,
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
      canvas.loadFromJSON(t.design_json, () => {
        canvas.requestRenderAll();

        const objects = canvas.getObjects();
        const firstText = findFirstText(objects);

        if (firstText) {
          canvas.setActiveObject(firstText);
          setCustomText(firstText.text || "");
          setFontSize(firstText.fontSize || 18);
          setRotation(Math.round(firstText.angle || 0));
        } else {
          setCustomText("");
          setFontSize(18);
          setRotation(0);
        }
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

        canvas.add(text);
        canvas.setActiveObject(text);
        canvas.requestRenderAll();

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
    <div className="flex h-full">
      {/* ===================== SIDEBAR KIRI ===================== */}
      <div className="w-80 m-4 bg-white rounded-2xl shadow-md p-4 flex flex-col h-[calc(100vh-2rem)]">

        {/* ===== Bagian ini TIDAK ikut scroll (statis) ===== */}
        <div className="flex-shrink-0">
          <h2 className="font-bold mb-4 text-lg text-gray-700 border-b pb-2">
            Templates
          </h2>

          <label className="flex items-center justify-center w-full px-4 py-3 bg-gradient-to-r from-indigo-500 to-blue-600 text-white font-semibold rounded-xl cursor-pointer hover:from-indigo-600 hover:to-blue-700 transition transform hover:scale-105 shadow-md mb-4 active:scale-95">
            <svg
              className="w-5 h-5 mr-2"
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
            <span>Upload Logo / Gambar</span>
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

            <div className="grid grid-cols-2 gap-3">
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
                className="border rounded-xl h-20 text-sm hover:bg-blue-50 col-span-2"
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

        {/* ===== Bagian ini YANG SCROLL (list template) ===== */}
        <div className="flex-1 overflow-y-auto pr-1 -mr-1">
          <div className="grid grid-cols-2 gap-3 pb-2">
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
              <p className="col-span-2 text-center text-gray-400 text-sm py-6">
                Belum ada template tersimpan.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ===================== AREA CANVAS ===================== */}
      <div className="flex-1 flex flex-col items-center pt-6">
        <div className="bg-white px-4 py-3 rounded-2xl shadow-md flex flex-wrap items-center gap-3 mb-6 sticky top-4 z-10">
          <input
            value={customText}
            onChange={handleTextChange}
            placeholder="Masukkan Text"
            className="border px-3 py-2 rounded-xl w-56 outline-none focus:ring-2 focus:ring-blue-400"
          />

          <input
            type="number"
            value={fontSize}
            onChange={handleFontSizeChange}
            className="border px-3 py-2 w-20 rounded-xl outline-none"
          />

          <div className="flex items-center gap-2">
            <span className="text-sm">Rotasi</span>

            <input
              type="range"
              min="-180"
              max="180"
              value={rotation}
              onChange={handleRotationChange}
            />
          </div>

          <button
            onClick={handleUngroup}
            className="bg-purple-100 text-purple-600 px-3 py-2 rounded-xl hover:bg-purple-200"
          >
            Ungroup
          </button>

          <button
            onClick={handleDuplicateObject}
            className="bg-blue-100 text-blue-600 px-3 py-2 rounded-xl hover:bg-blue-200"
          >
            Copy
          </button>

          <button
            onClick={handleHapusObject}
            className="bg-orange-100 text-orange-600 px-3 py-2 rounded-xl hover:bg-orange-200"
          >
            Hapus Dipilih
          </button>

          <button
            onClick={handleSelesai}
            className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-2 rounded-xl hover:from-green-600 hover:to-emerald-700 font-semibold transition shadow-md"
          >
            ✓ Selesai & Kirim
          </button>

          <button
            onClick={handleHapusCanvas}
            className="bg-red-100 text-red-600 px-3 py-2 rounded-xl hover:bg-red-200"
          >
            Hapus Text & Logo
          </button>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow w-[350px] h-[550px] relative flex items-center justify-center">
          <img
            src={tumblerImg}
            className="absolute h-[480px] pointer-events-none"
          />

          <div className="absolute w-[150px] h-[320px] flex items-center justify-center">
            <div className="absolute w-[110px] h-[340px] flex items-center justify-center pointer-events-none">
              <div className="absolute w-[90px] h-[330px] border-2 border-dashed border-green-400 rounded-md translate-y-[25px]"></div>
              <div className="absolute w-[75px] h-[300px] border border-green-600 rounded-md translate-y-[25px]"></div>
            </div>

            <canvas
              ref={canvasRef}
              className="absolute z-10"
              width="150"
              height="320"
            />
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