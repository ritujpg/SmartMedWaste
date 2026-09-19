import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Bot, Camera, ShieldAlert, Square, Zap } from "lucide-react";
import { CardTitle, PageHeading, StatusBadge } from "@/components/dashboard/primitives";
import { apiGet, apiPostForm, apiPost } from "@/lib/api";
export function Scanner() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectInFlight = useRef(false);
  const lastPersistedRef = useRef({ object: "", at: 0 });
  const sessionRef = useRef(0);
  const classificationStabilityRef = useRef({
    candidate: "",
    consecutiveFrames: 0,
    stableClass: "",
  });

  const apiBase = (
    import.meta.env.VITE_API_URL || "http://localhost:8000"
  ).replace(/\/$/, "");

  const [result, setResult] = useState<any>(null);
  const [status, setStatus] = useState("Starting camera...");
  const [cameraError, setCameraError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [scannerMode, setScannerMode] = useState<"detect" | "classify">("detect");
  const [scannerConfigLoading, setScannerConfigLoading] = useState(true);
  const [scannerConfidenceThreshold, setScannerConfidenceThreshold] = useState(0.7);
  const [robot, setRobot] = useState<{
    robot_id: string;
    status: "Offline" | "Idle" | "Scanning" | "On Mission" | "Error";
    armed: boolean;
    emergency_stop: boolean;
    mission_id: string | null;
    last_seen: string | null;
    last_result: any;
    error: string | null;
  } | null>(null);
  const [robotAction, setRobotAction] = useState("");

  const refreshRobotStatus = () => {
    void apiGet<typeof robot>("/api/robot/status")
      .then(setRobot)
      .catch((error) => setRobotAction(error instanceof Error ? error.message : "Robot status unavailable."));
  };

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
    classificationStabilityRef.current = { candidate: "", consecutiveFrames: 0, stableClass: "" };
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
        setStatus("Preparing automatic scan...");
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

  useEffect(() => {
    let active = true;
    void apiGet<{ mode: "detect" | "classify"; confidence_threshold: number }>("/api/waste/scanner-config")
      .then((config) => {
        if (active && (config.mode === "detect" || config.mode === "classify")) {
          setScannerMode(config.mode);
        }
        if (active && Number.isFinite(config.confidence_threshold) && config.confidence_threshold >= 0 && config.confidence_threshold <= 1) {
          setScannerConfidenceThreshold(config.confidence_threshold);
        }
      })
      .catch((error) => {
        console.error("Scanner configuration error:", error);
      })
      .finally(() => {
        if (active) setScannerConfigLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    refreshRobotStatus();
    const id = window.setInterval(refreshRobotStatus, 2000);
    return () => window.clearInterval(id);
  }, []);

  const runRobotAction = async (path: "/api/robot/authorize" | "/api/robot/disarm" | "/api/robot/emergency-stop", body?: unknown) => {
    setRobotAction("Updating robot safety state...");
    try {
      const next = await apiPost<typeof robot>(path, body || {});
      setRobot(next);
      setRobotAction(path.endsWith("emergency-stop") ? "Emergency stop is active." : "Robot safety state updated.");
    } catch (error) {
      setRobotAction(error instanceof Error ? error.message : "Robot action failed.");
    }
  };

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

      if (scannerMode === "classify") {
        formData.append("model", "local");
      }
      const payload = await apiPostForm<any>(scannerMode === "detect" ? "/detect" : "/api/waste/classify", formData);
      if (session !== sessionRef.current || !isRunning) return;

      const box = scannerMode === "detect" ? normalizeBox(payload.box, width, height) : null;

      const normalizedPayload = {
        ...payload,
        box,
      };

      let displayPayload = normalizedPayload;
      if (scannerMode === "classify") {
        const threshold = Number(payload.confidence_threshold ?? scannerConfidenceThreshold);
        const confidence = Number(payload.confidence || 0);
        const predictedClass = String(payload.predicted_class || "");
        const stability = classificationStabilityRef.current;

        if (!predictedClass || confidence < threshold) {
          classificationStabilityRef.current = { candidate: "", consecutiveFrames: 0, stableClass: "" };
          displayPayload = {
            ...normalizedPayload,
            predicted_class: null,
            classification_state: "uncertain",
            is_confident: false,
          };
        } else {
          const consecutiveFrames = stability.candidate === predictedClass ? stability.consecutiveFrames + 1 : 1;
          const stableClass = consecutiveFrames >= 3 ? predictedClass : stability.stableClass;
          classificationStabilityRef.current = { candidate: predictedClass, consecutiveFrames, stableClass };
          displayPayload = {
            ...normalizedPayload,
            predicted_class: stableClass || null,
            classification_state: stableClass ? "stable" : "stabilizing",
            is_confident: Boolean(stableClass),
          };
        }
      }

      setResult(displayPayload);

      if (scannerMode === "detect") {
        const now = Date.now();
        if (payload.object && Number(payload.confidence || 0) >= 0.7 && (payload.object !== lastPersistedRef.current.object || now - lastPersistedRef.current.at > 30000)) {
          await apiPost("/api/waste/detections", payload);
          lastPersistedRef.current = { object: payload.object, at: now };
        }
      }

      if (scannerMode === "classify") {
        if (displayPayload.classification_state === "uncertain") {
          setStatus("Uncertain — please reposition the item");
        } else if (displayPayload.classification_state === "stabilizing") {
          setStatus("Stabilizing scan...");
        } else {
          setStatus("Live classification active");
        }
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
  }, [apiBase, isRunning, scannerMode]);

  return (
    <>
      <PageHeading
        eyebrow="Real-time medical waste scanner"
        title="AI Waste Scanner"
        subtitle="Start a live scan to identify medical waste."
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
            Frames are processed automatically while scanning. Results should be verified by trained hospital staff before handling waste.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button type="button" onClick={startCamera} disabled={isRunning || scannerConfigLoading} className="flex items-center gap-2 rounded-lg bg-teal px-3 py-2 text-[11px] font-bold text-white disabled:opacity-50">
            <Camera size={14} /> Start Scanning
          </button>
          <button type="button" onClick={stopCamera} disabled={!isRunning} className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-[11px] font-bold text-slate-700 disabled:opacity-50">
            <Square size={13} /> Stop Scanning
          </button>
        </div>
      </div>

      <section className="panel mb-4">
        <CardTitle title="Robot scanning" subtitle="Separate from this browser camera session" />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-navy"><Bot size={20} /></span>
            <div>
              <p className="text-sm font-bold text-navy">{robot?.robot_id || "Robot interface"}</p>
              <p className="text-xs text-slate-500">{robot?.status || "Loading robot status..."}{robot?.mission_id ? ` · Mission ${robot.mission_id}` : ""}</p>
            </div>
            <span className={`status-badge ${robot?.status === "Error" ? "status-red" : robot?.status === "Offline" ? "status-slate" : "status-green"}`}><span className="status-dot" />{robot?.status || "Unknown"}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => runRobotAction("/api/robot/authorize", { robot_id: robot?.robot_id || "robot-1" })} disabled={!robot || robot.status === "Scanning" || robot.status === "On Mission"} className="secondary-button disabled:opacity-50">Authorize robot</button>
            <button type="button" onClick={() => runRobotAction("/api/robot/disarm")} disabled={!robot?.armed} className="secondary-button disabled:opacity-50">Disarm</button>
            <button type="button" onClick={() => runRobotAction("/api/robot/emergency-stop")} className="flex items-center gap-2 rounded-lg bg-rose-600 px-3 py-2 text-[11px] font-bold text-white disabled:opacity-50"><ShieldAlert size={14} /> Emergency stop</button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-slate-500">
          <span>{robot?.armed ? "Authorized / armed" : "Not armed"}</span>
          <span>{robot?.last_seen ? `Last heartbeat ${new Date(robot.last_seen).toLocaleTimeString()}` : "No robot heartbeat received"}</span>
          {robotAction && <span className="font-semibold text-slate-700">{robotAction}</span>}
        </div>
        {robot?.error && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">Robot stopped safely: {robot.error}</p>}
        {robot?.last_result && <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">Latest robot result: <strong className="text-navy">{robot.last_result.object || robot.last_result.predicted_class || "Result received"}</strong>{robot.last_result.confidence != null ? ` · ${Math.round(Number(robot.last_result.confidence) * 100)}% confidence` : ""}</div>}
        <p className="mt-3 text-[11px] leading-4 text-slate-500">This dashboard does not start movement or collection. Robot onboard software must connect using the device API key, send heartbeats, and begin scanning only after its own authorized mission and safety checks.</p>
      </section>

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

            {scannerMode === "detect" && result?.box && (
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
            title="Scan results"
            subtitle="Review the automated result before handling waste"
          />

          <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                {scannerMode === "detect" ? "Detected Object" : "Predicted Class"}
              </span>

              <span
                className={`status-badge ${
                  (scannerMode === "detect" ? result?.object : result?.predicted_class)
                    ? "status-green"
                    : "status-slate"
                }`}
              >
                <span className="status-dot" />

                {(scannerMode === "detect" ? result?.object : result?.predicted_class)
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
                  {scannerMode === "detect"
                    ? (result?.object || "No medical waste detected")
                    : result?.classification_state === "uncertain"
                      ? "Uncertain — please reposition the item"
                      : result?.classification_state === "stabilizing"
                        ? "Stabilizing scan..."
                        : (result?.predicted_class || "No classification yet")}
                </p>
              </div>

              {scannerMode === "detect" && <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Category
                </p>

                <p className="mt-2 text-lg font-bold text-navy">
                  {result?.category || "--"}
                </p>
              </div>}

              {scannerMode === "detect" && <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Sub-category
                </p>

                <p className="mt-2 text-lg font-bold text-navy">
                  {result?.subcategory || "--"}
                </p>
              </div>}

              {scannerMode === "detect" && <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Recommended bin
                </p>

                <p className="mt-2 text-lg font-bold text-navy">
                  {result?.bin || "--"}
                </p>
              </div>}

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
                  Number(result.confidence || 0) < Number(result.confidence_threshold ?? (scannerMode === "classify" ? scannerConfidenceThreshold : 0.7)) && (
                    <p className="mt-2 text-[11px] font-bold text-amber-700">
                      {scannerMode === "classify" ? "Uncertain — please reposition the item" : "Uncertain detection"}
                    </p>
                  )}
              </div>
            </div>
            {scannerMode === "classify" && result?.top_predictions && (
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
                  {scannerMode === "detect" ? "Automated scan" : "Classification result"}
                </p>

                <p className="mt-1 text-[11px] leading-4 text-teal/80">
                  {scannerMode === "detect" ? "The scan may identify an object and show its location. Verify the result and disposal mapping before handling waste." : "The scan identifies the most likely class and provides confidence details. It does not assign disposal bins or authorize handling."}
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
