"use client";

import { useEffect, useState, useRef } from "react";
import { Html5QrcodeScanner, Html5QrcodeScanType } from "html5-qrcode";
import { Coffee, Utensils, Moon } from "lucide-react";
import { supabase } from "@/lib/supabase";

type ScanResult = "idle" | "success" | "already_used" | "invalid";

export default function ScanPage() {
  const [mealType, setMealType] = useState<"high_tea" | "lunch" | "dinner">("high_tea");
  const [status, setStatus] = useState<ScanResult>("idle");
  const [participantName, setParticipantName] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const isScanning = useRef(false);

  useEffect(() => {
    if (status !== "idle") return; // Only render the scanner when we are in the idle state

    const scanner = new Html5QrcodeScanner(
      "reader",
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
      },
      /* verbose= */ false
    );

    scanner.render(onScanSuccess, onScanFailure);

    function onScanSuccess(decodedText: string) {
      if (isScanning.current) return;
      isScanning.current = true;
      handleVerify(decodedText);
    }

    function onScanFailure() {
      // Ignore routine scan failures
    }

    return () => {
      // The DOM node (#reader) is being unmounted when status changes.
      // We explicitly clear the scanner to release the camera and prevent state update loops.
      scanner.clear().catch((error) => console.error("Failed to clear scanner. ", error));
    };
  }, [status, mealType]); // Depend on status so scanner rebuilds when we return to idle

  const handleVerify = async (scannedText: string) => {
    try {
      // Extract token if the QR code represents the full URL
      let token = scannedText;
      if (scannedText.includes("?token=")) {
        try {
          token = new URL(scannedText).searchParams.get("token") || scannedText;
        } catch (e) {
          // If URL parsing fails, fallback to the raw text
        }
      }

      // Call edge function securely using the Supabase client
      const { data, error } = await supabase.functions.invoke("verify-scan", {
        body: { token, meal_type: mealType },
      });

      if (error) throw new Error("Supabase Fetch: " + error.message);
      if (data.error) throw new Error("Edge Function: " + data.error);
      
      setStatus(data.status);
      setParticipantName(data.name || "Unknown");
      setErrorMessage("");

      if (data.status === "success") {
        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
        playBeep(800, 200);
      } else if (data.status === "already_used") {
        if (navigator.vibrate) navigator.vibrate(500);
        playBeep(300, 500);
      } else {
        if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 100]);
        playBeep(200, 300);
        setErrorMessage("Token not found in database.");
      }

    } catch (err: any) {
      console.error(err);
      setStatus("invalid");
      setErrorMessage(err.message);
    }
  };

  const playBeep = (freq: number, dur: number) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.type = "sine";
      oscillator.frequency.value = freq;
      gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
      oscillator.start();
      setTimeout(() => oscillator.stop(), dur);
    } catch (e) {}
  };

  const resetScanner = () => {
    setStatus("idle");
    setParticipantName("");
    isScanning.current = false;
  };

  const statusColors = {
    idle: "bg-gray-100 dark:bg-gray-900",
    success: "bg-green-500",
    already_used: "bg-red-500",
    invalid: "bg-yellow-500",
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 flex flex-col items-center justify-center p-4 ${statusColors[status]}`}>
      {status === "idle" ? (
        <div className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-3xl overflow-hidden shadow-2xl p-6 space-y-6">
          <div className="flex justify-between items-center bg-gray-100 dark:bg-gray-900 p-2 rounded-2xl">
            <MealButton type="high_tea" current={mealType} set={setMealType} Icon={Coffee} label="High Tea" />
            <MealButton type="lunch" current={mealType} set={setMealType} Icon={Utensils} label="Lunch" />
            <MealButton type="dinner" current={mealType} set={setMealType} Icon={Moon} label="Dinner" />
          </div>

          <div id="reader" className="w-full rounded-2xl overflow-hidden border-2 border-indigo-100 dark:border-indigo-900" />
          
          <p className="text-center font-medium text-gray-500 dark:text-gray-400">
            Scanning for: <span className="font-bold text-gray-900 dark:text-white uppercase">{mealType.replace("_", " ")}</span>
          </p>

          <button
            onClick={() => {
              document.cookie = "auth_role=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
              window.location.href = "/";
            }}
            className="w-full text-center text-sm font-medium text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            Logout
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center text-center text-white p-8 space-y-6 animate-in zoom-in duration-200">
          {status === "success" && (
            <>
              <div className="w-32 h-32 rounded-full border-4 border-white flex items-center justify-center mb-4">
                <span className="text-6xl">✅</span>
              </div>
              <h1 className="text-5xl font-black uppercase tracking-tight shadow-sm">VALID SCAN</h1>
              <p className="text-3xl font-semibold opacity-90">{mealType.replace("_", " ").toUpperCase()}</p>
              <div className="mt-8 px-8 py-4 bg-black/20 rounded-2xl backdrop-blur-sm">
                <p className="text-xl font-medium opacity-80 uppercase tracking-widest">Participant</p>
                <p className="text-4xl font-bold mt-1">{participantName}</p>
              </div>
            </>
          )}

          {status === "already_used" && (
            <>
              <div className="w-32 h-32 rounded-full border-4 border-white flex items-center justify-center mb-4">
                <span className="text-6xl">❌</span>
              </div>
              <h1 className="text-5xl font-black uppercase tracking-tight shadow-sm">ALREADY USED</h1>
              <p className="text-2xl font-semibold opacity-90">{participantName} has already claimed this meal.</p>
            </>
          )}

          {status === "invalid" && (
            <>
              <div className="w-32 h-32 rounded-full border-4 border-black/50 flex items-center justify-center mb-4">
                <span className="text-6xl">⚠️</span>
              </div>
              <h1 className="text-6xl font-black uppercase tracking-tight text-black/80">INVALID QR</h1>
              <p className="text-2xl font-medium text-black/60">{errorMessage || "Ticket not recognized in the system."}</p>
            </>
          )}

          <button
            onClick={resetScanner}
            className="mt-12 px-8 py-4 bg-white text-black text-xl font-bold rounded-xl shadow-xl hover:bg-gray-100 transition-transform hover:scale-105 active:scale-95"
          >
            Scan Next Participant
          </button>
        </div>
      )}
    </div>
  );
}

function MealButton({ type, current, set, Icon, label }: any) {
  const active = current === type;
  return (
    <button
      onClick={() => set(type)}
      className={`flex flex-col items-center justify-center w-24 h-20 rounded-xl transition-all ${
        active 
          ? "bg-indigo-600 text-white shadow-lg scale-105" 
          : "text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800"
      }`}
    >
      <Icon size={24} className="mb-1" />
      <span className="text-xs font-semibold">{label}</span>
    </button>
  );
}
