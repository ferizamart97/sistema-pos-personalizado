import React, { useState, useEffect, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import { getProductImageUrl } from '../../utils/imageUrl';

export default function ImageCapture({ currentImageUrl, onImageSelected }) {
  const [mode, setMode] = useState('preview'); // 'preview', 'webcam', 'file'
  const [previewUrl, setPreviewUrl] = useState(currentImageUrl || null);
  const [facingMode, setFacingMode] = useState('environment'); // cámara trasera por defecto en tablet
  const webcamRef = useRef(null);

  useEffect(() => {
    setPreviewUrl(currentImageUrl || null);
  }, [currentImageUrl]);

  const capturePhoto = useCallback(() => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      if (imageSrc) {
        setPreviewUrl(imageSrc);
        setMode('preview');

        // Convert base64 to File blob
        fetch(imageSrc)
          .then((res) => res.blob())
          .then((blob) => {
            const file = new File([blob], `product_${Date.now()}.jpg`, { type: 'image/jpeg' });
            if (onImageSelected) onImageSelected(file, imageSrc);
          });
      }
    }
  }, [webcamRef, onImageSelected]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setMode('preview');
      if (onImageSelected) onImageSelected(file, url);
    }
  };

  const handleRemoveImage = () => {
    setPreviewUrl(null);
    setMode('preview');
    if (onImageSelected) onImageSelected(null, null);
  };

  const toggleCamera = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  return (
    <div className="space-y-3 p-4 bg-[#f8f9ff] rounded-2xl border border-[#ccc3d8]/40">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-[#0b1c30] uppercase tracking-wider flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[18px] text-[#630ed4]">photo_camera</span>
          Fotografía del Producto
        </label>
        <span className="text-xs text-[#7b7487]">Cámara o Galería</span>
      </div>

      {/* Webcam Mode */}
      {mode === 'webcam' && (
        <div className="relative rounded-2xl overflow-hidden bg-black aspect-4/3 flex flex-col items-center justify-center">
          <Webcam
            audio={false}
            ref={webcamRef}
            screenshotFormat="image/jpeg"
            videoConstraints={{
              facingMode: facingMode,
              width: 1280,
              height: 720
            }}
            className="w-full h-full object-cover"
          />

          {/* Camera Controls Overlay */}
          <div className="absolute bottom-4 inset-x-0 flex items-center justify-center gap-4 z-10 px-4">
            <button
              type="button"
              onClick={toggleCamera}
              className="w-12 h-12 rounded-full bg-white/30 backdrop-blur-md text-white flex items-center justify-center hover:bg-white/50 active:scale-95 transition-all"
              title="Cambiar de cámara"
            >
              <span className="material-symbols-outlined text-[24px]">flip_camera_ios</span>
            </button>

            <button
              type="button"
              onClick={capturePhoto}
              className="w-16 h-16 rounded-full bg-white border-4 border-[#630ed4] flex items-center justify-center shadow-2xl active:scale-90 transition-all cursor-pointer"
              title="Capturar foto"
            >
              <div className="w-12 h-12 rounded-full bg-[#630ed4]"></div>
            </button>

            <button
              type="button"
              onClick={() => setMode('preview')}
              className="w-12 h-12 rounded-full bg-white/30 backdrop-blur-md text-white flex items-center justify-center hover:bg-white/50 active:scale-95 transition-all"
              title="Cancelar"
            >
              <span className="material-symbols-outlined text-[24px]">close</span>
            </button>
          </div>
        </div>
      )}

      {/* Preview / Selection Mode */}
      {mode === 'preview' && (
        <div className="flex flex-col sm:flex-row items-center gap-4">
          {/* Image Thumbnail Preview */}
          <div className="w-32 h-32 rounded-2xl bg-[#eff4ff] border-2 border-dashed border-[#ccc3d8] flex items-center justify-center overflow-hidden shrink-0 relative group">
            {previewUrl ? (
              <>
                <img 
                  src={getProductImageUrl(previewUrl)} 
                  alt="Vista previa" 
                  className="w-full h-full object-cover" 
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = 'https://images.unsplash.com/photo-1582058091505-f87a2e55a40f?w=300&auto=format&fit=crop&q=60';
                  }}
                />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute top-1 right-1 w-7 h-7 bg-[#ef4444] text-white rounded-full flex items-center justify-center shadow-md opacity-90 hover:opacity-100 transition-opacity"
                  title="Eliminar foto"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              </>
            ) : (
              <div className="text-center p-2 text-[#7b7487]">
                <span className="material-symbols-outlined text-[36px] text-[#ccc3d8]">image</span>
                <span className="block text-[10px] mt-1 font-semibold">Sin imagen</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex-1 w-full space-y-2">
            <button
              type="button"
              onClick={() => setMode('webcam')}
              className="w-full min-h-[44px] px-4 py-2.5 bg-[#630ed4] hover:bg-[#7c3aed] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">photo_camera</span>
              Tomar Foto con Cámara
            </button>

            <label className="w-full min-h-[44px] px-4 py-2.5 bg-white hover:bg-[#e5eeff] text-[#0b1c30] border border-[#ccc3d8] rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-xs active:scale-95 transition-all cursor-pointer">
              <span className="material-symbols-outlined text-[20px] text-[#630ed4]">upload_file</span>
              Subir desde Archivo
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
