"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, CameraOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface QRScannerProps {
  onScan: (data: string) => void;
}

export function QRScanner({ onScan }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasCamera, setHasCamera] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    let mounted = true;

    async function startScanner() {
      try {
        // Request camera permission
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "environment", // Prefer back camera on mobile
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });

        if (!mounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          setIsScanning(true);
          setError(null);

          // Start scanning for QR codes
          scanForQRCode();
        }
      } catch (err) {
        if (!mounted) return;

        if (err instanceof Error) {
          if (
            err.name === "NotAllowedError" ||
            err.name === "PermissionDeniedError"
          ) {
            setError("Camera permission denied. Please allow camera access.");
          } else if (
            err.name === "NotFoundError" ||
            err.name === "DevicesNotFoundError"
          ) {
            setHasCamera(false);
            setError("No camera found on this device.");
          } else {
            setError("Failed to access camera: " + err.message);
          }
        }
      }
    }

    function scanForQRCode() {
      if (!videoRef.current || !canvasRef.current || !mounted) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });

      if (!ctx) return;

      // Set canvas size to video size
      if (video.videoWidth && video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Draw video frame to canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Get image data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        // Try to decode QR code using jsQR (we'll load it dynamically)
        decodeQRCode(imageData);
      }

      // Continue scanning
      animationFrameRef.current = requestAnimationFrame(scanForQRCode);
    }

    async function decodeQRCode(imageData: ImageData) {
      try {
        // Dynamically import jsQR for client-side QR decoding
        // This is a lightweight pure JavaScript QR code decoder
        const jsQR = (await import("jsqr")).default;

        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert",
        });

        if (code && code.data) {
          // QR code found!
          onScan(code.data);
        }
      } catch {
        // jsQR not available, use fallback
        console.log("QR scanning requires jsQR library");
      }
    }

    startScanner();

    return () => {
      mounted = false;
      setIsScanning(false);

      // Stop all tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      // Cancel animation frame
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [onScan]);

  const handleRetry = () => {
    setError(null);
    setHasCamera(true);
    // Re-mount will trigger useEffect
    window.location.reload();
  };

  if (!hasCamera) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <CameraOff className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground mb-4">No camera available</p>
        <p className="text-sm text-muted-foreground">
          Use the manual entry option to validate tickets
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={handleRetry} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-black">
      {/* Video element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
      />

      {/* Hidden canvas for processing */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Scanning overlay */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="relative">
          {/* Scanner frame */}
          <div className="w-64 h-64 border-2 border-white/50 rounded-lg">
            {/* Corner indicators */}
            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-lg" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-lg" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-lg" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-lg" />

            {/* Scanning line animation */}
            {isScanning && (
              <div className="absolute inset-x-0 h-0.5 bg-primary animate-scan-line" />
            )}
          </div>
        </div>
      </div>

      {/* Status indicator */}
      <div className="absolute bottom-4 left-0 right-0 text-center">
        <div className="inline-flex items-center gap-2 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
          <Camera className="h-4 w-4" />
          {isScanning ? "Scanning for QR code..." : "Starting camera..."}
        </div>
      </div>
    </div>
  );
}
