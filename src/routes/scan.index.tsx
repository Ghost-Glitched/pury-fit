import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { useApp } from "../store/app";
import { analyzeBarcodeProduct, analyzePhoto } from "../lib/scan.functions";
import { useServerFn } from "@tanstack/react-start";

export const Route = createFileRoute("/scan/")({
  component: ScanPage,
});

type Mode = "photo" | "barcode";

function ScanPage() {
  const navigate = useNavigate();
  const profile = useApp((s) => s.profile);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [mode, setMode] = useState<Mode>("photo");
  const [status, setStatus] = useState<string>("Ready");
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);

  const analyzePhotoFn = useServerFn(analyzePhoto);
  const analyzeBarcodeFn = useServerFn(analyzeBarcodeProduct);

  useEffect(() => {
    if (!profile) {
      navigate({ to: "/onboarding" });
    }
  }, [profile, navigate]);

  // Start camera
  useEffect(() => {
    let cancelled = false;
    async function start() {
      try {
        setError(null);
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
          setCameraReady(true);
        }
      } catch (e) {
        console.error(e);
        setError("Camera blocked. Use the upload button below.");
      }
    }
    start();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  // Barcode mode: start zxing
  useEffect(() => {
    if (mode !== "barcode" || !cameraReady || !videoRef.current) return;
    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;
    let stopped = false;
    setStatus("Looking for barcode…");
    reader
      .decodeFromVideoElement(videoRef.current, (result) => {
        if (stopped || !result) return;
        const text = result.getText();
        stopped = true;
        handleBarcode(text);
      })
      .catch((e) => console.error("zxing error", e));
    return () => {
      stopped = true;
      try {
        // @ts-expect-error reset exists at runtime
        reader.reset?.();
      } catch {}
      readerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, cameraReady]);

  async function handleBarcode(code: string) {
    if (!profile) return;
    setAnalyzing(true);
    setStatus(`Found ${code} — looking up…`);
    try {
      const res = await fetch(
        `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json`,
      );
      const data = await res.json();
      if (data.status !== 1 || !data.product) {
        throw new Error("Product not found in OpenFoodFacts. Try a photo instead.");
      }
      const p = data.product;
      const nutriments: Record<string, number> = {};
      ["energy-kcal_100g", "proteins_100g", "carbohydrates_100g", "fat_100g", "sugars_100g"].forEach(
        (k) => {
          if (typeof p.nutriments?.[k] === "number") nutriments[k] = p.nutriments[k];
        },
      );
      setStatus("Analyzing for your goal…");
      const analysis = await analyzeBarcodeFn({
        data: {
          goal: profile.goal,
          productName: p.product_name || "Unknown product",
          brand: p.brands,
          nutriments,
          servingSize: p.serving_size,
          ingredients: p.ingredients_text,
        },
      });
      const pending = { analysis, source: "barcode" as const };
      sessionStorage.setItem("fuelscan-pending", JSON.stringify(pending));
      navigate({ to: "/scan/result" });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setAnalyzing(false);
      setStatus("Ready");
    }
  }

  async function capturePhoto() {
    if (!profile || !videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    const w = video.videoWidth || 720;
    const h = video.videoHeight || 1280;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, w, h);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
    await analyzeFromDataUrl(dataUrl);
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") analyzeFromDataUrl(reader.result);
    };
    reader.readAsDataURL(file);
  }

  async function analyzeFromDataUrl(dataUrl: string) {
    if (!profile) return;
    setAnalyzing(true);
    setError(null);
    setStatus("Analyzing photo with AI…");
    try {
      const analysis = await analyzePhotoFn({
        data: { imageDataUrl: dataUrl, goal: profile.goal },
      });
      const meal = {
        ...analysis,
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        source: "photo" as const,
        imageDataUrl: dataUrl,
      };
      sessionStorage.setItem("fuelscan-pending", JSON.stringify(meal));
      navigate({ to: "/scan/result" });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setAnalyzing(false);
      setStatus("Ready");
    }
  }

  return (
    <div className="fixed inset-0 bg-black flex flex-col z-50">
      {/* Top bar */}
      <div className="absolute top-0 inset-x-0 z-20 px-6 pt-6 pb-4 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent">
        <Link
          to="/"
          className="size-10 rounded-full bg-black/60 backdrop-blur border border-white/10 flex items-center justify-center text-white"
          aria-label="Close scanner"
        >
          ✕
        </Link>
        <div className="flex bg-black/60 backdrop-blur rounded-full border border-white/10 p-1">
          <button
            onClick={() => setMode("photo")}
            className={`px-4 py-1.5 text-[10px] font-bold uppercase rounded-full transition-colors ${
              mode === "photo" ? "bg-primary text-primary-foreground" : "text-white/60"
            }`}
          >
            Photo
          </button>
          <button
            onClick={() => setMode("barcode")}
            className={`px-4 py-1.5 text-[10px] font-bold uppercase rounded-full transition-colors ${
              mode === "barcode" ? "bg-primary text-primary-foreground" : "text-white/60"
            }`}
          >
            Barcode
          </button>
        </div>
        <div className="size-10" />
      </div>

      {/* Camera */}
      <div className="relative flex-1 overflow-hidden">
        <video
          ref={videoRef}
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover"
        />
        {!cameraReady && (
          <div className="absolute inset-0 flex items-center justify-center text-white/60 font-mono text-xs uppercase">
            Starting camera…
          </div>
        )}

        {/* Viewfinder overlay */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-8 sm:inset-16">
            <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-primary" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-primary" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-primary" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-primary" />
            {mode === "barcode" && (
              <div className="absolute left-0 right-0 top-0 h-px bg-primary shadow-[0_0_12px_var(--color-primary)] animate-scan" />
            )}
          </div>
        </div>

        {/* Status */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur px-4 py-2 rounded-full border border-white/10 flex items-center gap-2">
          <div
            className={`size-2 rounded-full ${analyzing ? "bg-warning animate-pulse-ring" : "bg-primary"}`}
          />
          <span className="text-[10px] font-mono uppercase tracking-widest text-white">
            {analyzing ? status : mode === "barcode" ? "Align barcode" : "Frame your meal"}
          </span>
        </div>

        {error && (
          <div className="absolute bottom-40 left-6 right-6 bg-destructive/90 text-destructive-foreground p-4 text-sm font-medium">
            {error}
          </div>
        )}
      </div>

      {/* Bottom controls */}
      <div className="bg-black px-6 py-8 flex items-center justify-around">
        <button
          onClick={() => fileRef.current?.click()}
          disabled={analyzing}
          className="flex flex-col items-center gap-1 text-white/70 disabled:opacity-30"
        >
          <div className="size-12 rounded-full border border-white/20 flex items-center justify-center">
            ⬆
          </div>
          <span className="font-mono text-[9px] uppercase">Upload</span>
        </button>

        {mode === "photo" ? (
          <button
            onClick={capturePhoto}
            disabled={analyzing || !cameraReady}
            className="size-20 rounded-full border-4 border-white flex items-center justify-center disabled:opacity-40 active:scale-95 transition-transform"
            aria-label="Capture"
          >
            <div className="size-16 bg-white rounded-full" />
          </button>
        ) : (
          <div className="size-20 flex items-center justify-center">
            <div className="font-mono text-[10px] uppercase text-white/60 text-center">
              {analyzing ? "Working…" : "Auto-scan"}
            </div>
          </div>
        )}

        <div className="size-12" />

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={onFile}
          className="hidden"
        />
      </div>
    </div>
  );
}
