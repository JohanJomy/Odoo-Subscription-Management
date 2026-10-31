"use client";

import { useEffect, useRef, useState } from "react";

export default function QrScanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [value, setValue] = useState("");
  const [message, setMessage] = useState("Start the camera or paste a QR payload.");
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!active || !videoRef.current || !("BarcodeDetector" in window)) return;
    let stopped = false;
    let stream: MediaStream | undefined;
    const scan = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (!videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        const detector = new (window as unknown as {
          BarcodeDetector: new (options: { formats: string[] }) => {
            detect(video: HTMLVideoElement): Promise<Array<{ rawValue?: string }>>;
          };
        }).BarcodeDetector({ formats: ["qr_code"] });
        while (!stopped) {
          const codes = await detector.detect(videoRef.current);
          if (codes[0]?.rawValue) {
            setValue(codes[0].rawValue);
            setMessage("QR payload captured. Verify the amount and invoice before recording payment.");
            setActive(false);
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, 300));
        }
      } catch {
        setMessage("Camera access failed. Use the manual payload field below.");
        setActive(false);
      }
    };
    void scan();
    return () => {
      stopped = true;
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [active]);

  return <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-2xs"><div><h2 className="font-semibold text-slate-900">UPI QR Scanner</h2><p className="mt-1 text-xs text-slate-500">{message}</p></div><video ref={videoRef} className={`aspect-video w-full rounded-lg bg-slate-900 object-cover ${active ? "block" : "hidden"}`} muted playsInline /><div className="flex flex-wrap gap-2"><button type="button" onClick={() => setActive(true)} className="rounded-md bg-indigo-600 px-3 py-2 text-xs font-semibold text-white">Start camera</button><button type="button" onClick={() => { setActive(false); setValue(""); setMessage("Ready for another scan."); }} className="rounded-md border border-slate-200 px-3 py-2 text-xs">Clear</button></div><label className="block text-xs font-semibold text-slate-700">Scanned or pasted payload<textarea value={value} onChange={(event) => setValue(event.target.value)} rows={3} className="mt-1 w-full rounded-md border border-slate-200 p-2 font-mono text-xs" placeholder="upi://pay?pa=merchant@bank..." /></label>{value && <div className="rounded-lg bg-emerald-50 p-3 text-xs text-emerald-800">Payload captured. This scanner does not mark a payment as settled automatically; record the verified transaction through the Payments API.</div>}</div>;
}
