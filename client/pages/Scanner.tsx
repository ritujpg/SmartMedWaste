import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Camera, Square, Zap } from "lucide-react";
import { CardTitle, PageHeading, StatusBadge } from "@/components/dashboard/primitives";
import { apiPostForm, apiPost } from "@/lib/api";
export function Scanner() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectInFlight = useRef(false);
  const lastPersistedRef = useRef({ object: "", at: 0 });
  const sessionRef = useRef(0);

  const apiBase = (
    import.meta.env.VITE_API_URL || "http://localhost:8000"
  ).replace(/\/$/, "");

  const [result, setResult] = useState<any>(null);
  const [status, setStatus] = useState("Starting camera...");
  const [cameraError, setCameraError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState<"detect" | "classify">("detect");

  const normalizeBox = (
    box: any,
    width: number,
    height: number,
  ) => {
    if (!box || typeof box !== "object") return null;

    const x = Number(box.x);
    const y = Number(box.y);
    const w = Number(box.width);
    const h = Number(box.height);

    if (
      !Number.isFinite(x) ||
      !Number.isFinite(y) ||
      !Number.isFinite(w) ||
      !Number.isFinite(h)
    ) {
      return null;
    }

    const isPercentFormat =
      x >= 0 &&
      y >= 0 &&
      w >= 0 &&
      h >= 0 &&
      x <= 100 &&
      y <= 100 &&
      w <= 100 &&
      h <= 100;

    if (isPercentFormat) {
      return {
        x: Math.min(Math.max(x, 0), 100),
        y: Math.min(Math.max(y, 0), 100),
        width: Math.min(Math.max(w, 0), 100),
        height: Math.min(Math.max(h, 0), 100),
      };
    }

    return {
      x: Math.min(
        Math.max((x / Math.max(width, 1)) * 100, 0),
        100,
      ),
      y: Math.min(
        Math.max((y / Math.max(height, 1)) * 100, 0),
        100,
      ),
      width: Math.min(
        Math.max((w / Math.max(width, 1)) * 100, 0),
        100,
      ),
      height: Math.min(
        Math.max((h / Math.max(height, 1)) * 100, 0),
        100,
      ),
    };
  };

  const stopCamera = () => {
    sessionRef.current += 1;
    const stream = streamRef.current;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsRunning(false);
    setLoading(false);
    setStatus("Camera stopped");
  };

  const startCamera = async () => {
      if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
      ) {
        setCameraError(
          "Camera is not supported in this browser.",
        );
        setStatus("Camera unavailable");
        return;
      }

      try {
        stopCamera();
        setStatus("Requesting camera access...");

        const stream =
          await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: "environment" },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
            audio: false,
          });

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        setIsRunning(true);
        setCameraError("");
        setStatus(mode === "detect" ? "Live detection starting..." : "Live classification starting...");
      } catch (error) {
        setCameraError(
          error instanceof Error
            ? error.message
            : "Camera permission is required to scan live medical waste.",
        );

        setStatus("Camera unavailable");
      }
    };

  useEffect(() => () => stopCamera(), []);

  const processFrame = async () => {
    if (!isRunning || detectInFlight.current) return;

    const video = videoRef.current;

    if (!video || !video.videoWidth || !video.videoHeight) {
      return;
    }

    detectInFlight.current = true;
    setLoading(true);
    const session = sessionRef.current;

    try {
      const width = video.videoWidth;
      const height = video.videoHeight;

      /*
       * Create an invisible canvas.
       * The current camera frame is drawn into it.
       * The frame is converted to a JPEG Blob.
       * The Blob is sent to FastAPI.
       *
       * Nothing is saved permanently by the frontend.
       */

      const canvas = document.createElement("canvas");

      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext("2d");

      if (!context) {
        throw new Error("Canvas could not be initialized");
      }

      context.drawImage(video, 0, 0, width, height);

      const blob = await new Promise<Blob | null>(
        (resolve) => {
          canvas.toBlob(
            resolve,
            "image/jpeg",
            0.85,
          );
        },
      );

      if (!blob) {
        throw new Error("Camera frame could not be captured");
      }

      const formData = new FormData();

      formData.append(
        "file",
        blob,
        "camera-frame.jpg",
      );

      if (mode === "classify") {
        formData.append("model", "local");
      }
      const payload = await apiPostForm<any>(mode === "detect" ? "/detect" : "/api/waste/classify", formData);
      if (session !== sessionRef.current || !isRunning) return;

      const box = mode === "detect" ? normalizeBox(payload.box, width, height) : null;

      const normalizedPayload = {
        ...payload,
        box,
      };

      setResult(normalizedPayload);

      if (mode === "detect") {
        const now = Date.now();
        if (payload.object && Number(payload.confidence || 0) >= 0.7 && (payload.object !== lastPersistedRef.current.object || now - lastPersistedRef.current.at > 30000)) {
          await apiPost("/api/waste/detections", payload);
          lastPersistedRef.current = { object: payload.object, at: now };
        }
      }

      if (mode === "classify") {
        setStatus(payload.requires_human_verification ? "Low-confidence classification" : "Live classification active");
      } else if (!payload.object) {
        setStatus("No medical waste detected");
      } else if (Number(payload.confidence || 0) < 0.7) {
        setStatus("Uncertain detection");
      } else {
        setStatus("Live detection active");
      }

      setCameraError("");
    } catch (error) {
      console.error("Camera inference error:", error);

      setStatus(
        error instanceof Error
          ? error.message
          : "Inference failed",
      );

      setCameraError(
        `Unable to process this frame. Make sure FastAPI is running at ${apiBase}.`,
      );
    } finally {
      detectInFlight.current = false;
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isRunning) return undefined;

    /*
     * Process approximately two camera frames per second.
     *
     * The detectInFlight guard prevents multiple requests
     * from running at the same time.
     */

    const id = window.setInterval(() => {
      if (!detectInFlight.current) {
        void processFrame();
      }
    }, 800);

    return () => {
      window.clearInterval(id);
    };
  }, [apiBase, isRunning, mode]);

  return (
    <>
      <PageHeading
        eyebrow="Real-time medical waste scanner"
        title="AI Waste Scanner"
        subtitle="Choose Roboflow detection or local YOLO classification for live camera frames."
        action={
          <span className="flex items-center gap-2 rounded-full border border-mint/30 bg-mint-pale px-3 py-2 text-[11px] font-semibold text-teal">
            <span className="pulse-dot" />

            {loading ? "Processing" : isRunning ? "Live camera" : "Camera stopped"}
          </span>
        }
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-amber-900">
        <AlertTriangle
          size={18}
          className="mt-0.5 shrink-0 text-amber-600"
        />

        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold">
            Camera inference
          </p>

          <p className="mt-0.5 text-[11px] leading-4 text-amber-800/80">
            Frames are sent to the selected backend model periodically. Classification does not produce bounding boxes or disposal decisions.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button type="button" onClick={startCamera} disabled={isRunning} className="flex items-center gap-2 rounded-lg bg-teal px-3 py-2 text-[11px] font-bold text-white disabled:opacity-50">
            <Camera size={14} /> Start Camera
          </button>
          <button type="button" onClick={stopCamera} disabled={!isRunning} className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-[11px] font-bold text-slate-700 disabled:opacity-50">
            <Square size={13} /> Stop Camera
          </button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <button type="button" onClick={() => { stopCamera(); setMode("detect"); setResult(null); }} className={`rounded-lg px-3 py-2 text-xs font-bold ${mode === "detect" ? "bg-navy text-white" : "border border-slate-300 bg-white text-slate-700"}`}>Roboflow object detection</button>
        <button type="button" onClick={() => { stopCamera(); setMode("classify"); setResult(null); }} className={`rounded-lg px-3 py-2 text-xs font-bold ${mode === "classify" ? "bg-navy text-white" : "border border-slate-300 bg-white text-slate-700"}`}>Local YOLO classification</button>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_.95fr]">
        <div className="panel">
          <CardTitle
            title="Live scanner"
            subtitle="Continuous camera feed"
          />

          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 shadow-inner">
            <video
              ref={videoRef}
              className="h-90 w-full object-cover md:h-110"
              autoPlay
              muted
              playsInline
            />

            <div className="pointer-events-none absolute inset-0">
              <span className="absolute left-4 top-4 h-10 w-10 rounded-tl-xl border-l-2 border-t-2 border-mint" />

              <span className="absolute right-4 top-4 h-10 w-10 rounded-tr-xl border-r-2 border-t-2 border-mint" />

              <span className="absolute bottom-4 left-4 h-10 w-10 rounded-bl-xl border-b-2 border-l-2 border-mint" />

              <span className="absolute bottom-4 right-4 h-10 w-10 rounded-br-xl border-b-2 border-r-2 border-mint" />
            </div>

            {mode === "detect" && result?.box && (
              <div
                className="absolute border-2 border-mint bg-mint/10"
                style={{
                  left: `${result.box.x}%`,
                  top: `${result.box.y}%`,
                  width: `${result.box.width}%`,
                  height: `${result.box.height}%`,
                }}
              >
                {result?.object && (
                  <span className="absolute -top-7 left-0 whitespace-nowrap rounded bg-mint px-2 py-1 text-[10px] font-bold text-slate-950">
                    {result.object}
                  </span>
                )}
              </div>
            )}

            <div className="absolute bottom-4 left-4 rounded-lg border border-white/15 bg-slate-950/70 px-3 py-2 text-[11px] text-white">
              <span className="font-semibold text-mint">
                {status}
              </span>
            </div>
          </div>

          {cameraError && (
            <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
              {cameraError}
            </div>
          )}
        </div>

        <div className="panel">
          <CardTitle
            title={mode === "detect" ? "Detection results" : "Classification results"}
            subtitle={mode === "detect" ? "Roboflow object detection" : "Local YOLO11n classification"}
          />

          <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                {mode === "detect" ? "Detected Object" : "Predicted Class"}
              </span>

              <span
                className={`status-badge ${
                  (mode === "detect" ? result?.object : result?.predicted_class)
                    ? "status-green"
                    : "status-slate"
                }`}
              >
                <span className="status-dot" />

                {(mode === "detect" ? result?.object : result?.predicted_class)
                  ? "Detected"
                  : "No result"}
              </span>
            </div>

            <div className="mt-5 grid gap-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Object
                </p>

                <p className="mt-2 text-lg font-bold text-navy">
                  {mode === "detect" ? (result?.object || "No medical waste detected") : (result?.predicted_class || "No classification yet")}
                </p>
              </div>

              {mode === "detect" && <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Category
                </p>

                <p className="mt-2 text-lg font-bold text-navy">
                  {result?.category || "--"}
                </p>
              </div>}

              {mode === "detect" && <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Sub-category
                </p>

                <p className="mt-2 text-lg font-bold text-navy">
                  {result?.subcategory || "--"}
                </p>
              </div>}

              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Recommended bin
                </p>

                <p className="mt-2 text-lg font-bold text-navy">
                  {mode === "detect" ? (result?.bin || "--") : "Not assigned"}
                </p>
              </div>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Confidence
                </p>

                <p className="mt-2 text-lg font-bold text-teal">
                  {result
                    ? `${Math.round(
                        Number(result.confidence || 0) * 100,
                      )}%`
                    : "--"}
                </p>

                {result &&
                  Number(result.confidence || 0) < 0.7 && (
                    <p className="mt-2 text-[11px] font-bold text-amber-700">
                      Uncertain detection
                    </p>
                  )}
              </div>
            </div>
            {mode === "classify" && result?.top_predictions && (
              <div className="mt-4 border-t border-slate-200 pt-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Top predictions</p>
                <ul className="mt-2 space-y-1 text-xs text-slate-600">
                  {result.top_predictions.map((prediction: { class_name: string; confidence: number }) => <li key={prediction.class_name} className="flex justify-between"><span>{prediction.class_name}</span><span>{Math.round(prediction.confidence * 100)}%</span></li>)}
                </ul>
              </div>
            )}
          </div>

          <div className="mt-4 rounded-xl border border-teal/10 bg-mint-pale p-4">
            <div className="flex items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-teal">
                <Zap size={15} />
              </span>

              <div>
                <p className="text-xs font-bold text-teal">
                  {mode === "detect" ? "Automatic AI segregation" : "Classification only"}
                </p>

                <p className="mt-1 text-[11px] leading-4 text-teal/80">
                  {mode === "detect" ? "Roboflow identifies objects and may return a detection box. Verify any disposal mapping before handling waste." : "The local YOLO model identifies the most likely class. It does not assign disposal bins or authorize handling."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default Scanner;
