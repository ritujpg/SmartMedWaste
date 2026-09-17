import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Zap } from "lucide-react";
import { CardTitle, PageHeading, StatusBadge } from "@/components/dashboard/primitives";
import { apiPostForm, apiPost } from "@/lib/api";
export function Scanner() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectInFlight = useRef(false);
  const lastPersistedRef = useRef({ object: "", at: 0 });

  const apiBase = (
    import.meta.env.VITE_API_URL || "http://localhost:8000"
  ).replace(/\/$/, "");

  const [result, setResult] = useState<any>(null);
  const [status, setStatus] = useState("Starting camera...");
  const [cameraError, setCameraError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

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

  useEffect(() => {
    let cancelled = false;

    async function startCamera() {
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

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        setIsRunning(true);
        setCameraError("");
        setStatus("Live detection starting...");
      } catch (error) {
        setCameraError(
          error instanceof Error
            ? error.message
            : "Camera permission is required to scan live medical waste.",
        );

        setStatus("Camera unavailable");
      }
    }

    startCamera();

    return () => {
      cancelled = true;

      const stream = streamRef.current;

      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const runDetection = async () => {
    if (!isRunning || detectInFlight.current) return;

    const video = videoRef.current;

    if (!video || !video.videoWidth || !video.videoHeight) {
      return;
    }

    detectInFlight.current = true;
    setLoading(true);

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

      const payload = await apiPostForm<any>("/detect", formData);

      const box = normalizeBox(
        payload.box,
        width,
        height,
      );

      const normalizedPayload = {
        ...payload,
        box,
      };

      setResult(normalizedPayload);

      const now = Date.now();
      if (payload.object && Number(payload.confidence || 0) >= 0.7 && (payload.object !== lastPersistedRef.current.object || now - lastPersistedRef.current.at > 30000)) {
        await apiPost("/api/waste/detections", payload);
        lastPersistedRef.current = { object: payload.object, at: now };
      }

      if (!payload.object) {
        setStatus("No medical waste detected");
      } else if (
        Number(payload.confidence || 0) < 0.7
      ) {
        setStatus("Uncertain detection");
      } else {
        setStatus("Live detection active");
      }

      setCameraError("");
    } catch (error) {
      console.error("Detection error:", error);

      setStatus(
        error instanceof Error
          ? error.message
          : "Backend unavailable",
      );

      setCameraError(
        `Backend unavailable. Make sure FastAPI is running at ${apiBase}.`,
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
        void runDetection();
      }
    }, 500);

    return () => {
      window.clearInterval(id);
    };
  }, [apiBase, isRunning]);

  return (
    <>
      <PageHeading
        eyebrow="Real-time medical waste scanner"
        title="AI Waste Scanner"
        subtitle="Live camera scanning with automatic medical-waste object detection."
        action={
          <span className="flex items-center gap-2 rounded-full border border-mint/30 bg-mint-pale px-3 py-2 text-[11px] font-semibold text-teal">
            <span className="pulse-dot" />

            {loading
              ? "Scanning"
              : isRunning
                ? "Live camera"
                : "Starting camera"}
          </span>
        }
      />

      <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-amber-900">
        <AlertTriangle
          size={18}
          className="mt-0.5 shrink-0 text-amber-600"
        />

        <div>
          <p className="text-xs font-bold">
            Live camera prototype
          </p>

          <p className="mt-0.5 text-[11px] leading-4 text-amber-800/80">
            No capture, upload, or manual classification is
            required. The scanner continuously processes the
            live camera feed.
          </p>
        </div>
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
              className="h-[360px] w-full object-cover md:h-[440px]"
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

            {result?.box && (
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
            title="Detection results"
            subtitle="Automatic medical-waste object detection"
          />

          <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Detected Object
              </span>

              <span
                className={`status-badge ${
                  result?.object
                    ? "status-green"
                    : "status-slate"
                }`}
              >
                <span className="status-dot" />

                {result?.object
                  ? "Detected"
                  : "No object"}
              </span>
            </div>

            <div className="mt-5 grid gap-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Object
                </p>

                <p className="mt-2 text-lg font-bold text-navy">
                  {result?.object ||
                    "No medical waste detected"}
                </p>
              </div>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Category
                </p>

                <p className="mt-2 text-lg font-bold text-navy">
                  {result?.category || "--"}
                </p>
              </div>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Sub-category
                </p>

                <p className="mt-2 text-lg font-bold text-navy">
                  {result?.subcategory || "--"}
                </p>
              </div>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Recommended bin
                </p>

                <p className="mt-2 text-lg font-bold text-navy">
                  {result?.bin || result?.recommended_bin || "--"}
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
          </div>

          <div className="mt-4 rounded-xl border border-teal/10 bg-mint-pale p-4">
            <div className="flex items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-teal">
                <Zap size={15} />
              </span>

              <div>
                <p className="text-xs font-bold text-teal">
                  Automatic AI segregation
                </p>

                <p className="mt-1 text-[11px] leading-4 text-teal/80">
                  The system continuously analyzes the camera
                  feed and identifies waste without requiring
                  the user to capture, upload or manually
                  classify an item.
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
