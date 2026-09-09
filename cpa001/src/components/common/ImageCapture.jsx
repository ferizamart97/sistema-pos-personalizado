import React, { useState, useRef, useEffect } from 'react';

export default function ImageCapture({ currentImageUrl, onImageSelected }) {
  const [mode, setMode] = useState('preview'); // 'preview', 'camera'
  const [previewUrl, setPreviewUrl] = useState(currentImageUrl || null);
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' (back) or 'user' (front)
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    setPreviewUrl(currentImageUrl || null);
  }, [currentImageUrl]);

  const startCamera = async () => {
    try {
      setMode('camera');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: facingMode }, width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.warn('No se pudo acceder a la cámara WebRTC, usando selector de archivos:', err);
      // Fallback to file input click
      document.getElementById('pos-camera-fallback-file')?.click();
      setMode('preview');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setMode('preview');
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

    setPreviewUrl(dataUrl);
    stopCamera();

    if (onImageSelected) {
      onImageSelected(null, dataUrl);
    }
  };

  const toggleCameraFacing = async () => {
    stopCamera();
    const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextFacing);
    setTimeout(startCamera, 200);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const dataUrl = evt.target.result;
        setPreviewUrl(dataUrl);
        if (onImageSelected) onImageSelected(file, dataUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemove = () => {
    setPreviewUrl(null);
    if (onImageSelected) onImageSelected(null, null);
  };

  return (
    <div className="space-y-2.5 p-3.5 bg-[#f8f9ff] rounded-2xl border border-[#ccc3d8]/40">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-[#0b1c30] uppercase flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[18px] text-[#630ed4]">photo_camera</span>
          <span>Foto del Producto Apartado (Opcional)</span>
        </label>
        <span className="text-[10px] text-[#7b7487]">Cámara de tablet o archivo</span>
      </div>

      {mode === 'camera' ? (
        <div className="relative rounded-2xl overflow-hidden bg-black aspect-4/3 flex flex-col items-center justify-center">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-3 inset-x-0 flex items-center justify-center gap-4 z-10 px-4">
            <button
              type="button"
              onClick={toggleCameraFacing}
              className="w-10 h-10 rounded-full bg-white/30 backdrop-blur-md text-white flex items-center justify-center hover:bg-white/50 active:scale-95 transition-all"
              title="Cambiar de cámara"
            >
              <span className="material-symbols-outlined text-[20px]">flip_camera_ios</span>
            </button>

            <button
              type="button"
              onClick={capturePhoto}
              className="w-14 h-14 rounded-full bg-white border-4 border-[#630ed4] flex items-center justify-center shadow-xl active:scale-90 transition-all cursor-pointer"
              title="Tomar foto"
            >
              <div className="w-10 h-10 rounded-full bg-[#630ed4]"></div>
            </button>

            <button
              type="button"
              onClick={stopCamera}
              className="w-10 h-10 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 active:scale-95 transition-all"
              title="Cancelar"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          {previewUrl ? (
            <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-[#ccc3d8] shadow-2xs shrink-0 group">
              <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={handleRemove}
                className="absolute inset-0 bg-black/50 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                title="Eliminar foto"
              >
                <span className="material-symbols-outlined text-[20px]">delete</span>
              </button>
            </div>
          ) : (
            <div className="w-20 h-20 rounded-xl bg-white border border-dashed border-[#ccc3d8] flex flex-col items-center justify-center text-[#7b7487] shrink-0">
              <span className="material-symbols-outlined text-[24px]">image</span>
              <span className="text-[9px] uppercase font-bold mt-0.5">Sin foto</span>
            </div>
          )}

          <div className="flex-1 space-y-1.5">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={startCamera}
                className="min-h-[36px] px-3 bg-white hover:bg-[#eff4ff] text-[#630ed4] border border-[#630ed4]/40 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs active:scale-95 transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">photo_camera</span>
                <span>Tomar Foto</span>
              </button>

              <label className="min-h-[36px] px-3 bg-white hover:bg-[#eff4ff] text-[#0b1c30] border border-[#ccc3d8] rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs active:scale-95 transition-all cursor-pointer">
                <span className="material-symbols-outlined text-[18px]">upload</span>
                <span>Subir Imagen</span>
                <input
                  id="pos-camera-fallback-file"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>
            <p className="text-[10px] text-[#7b7487]">Toma una foto de la mercancía o etiqueta para identificar el apartado.</p>
          </div>
        </div>
      )}
    </div>
  );
}
