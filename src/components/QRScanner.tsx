import React, { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import ScanOverlay from "./ScanOverlay";

const QRScanner = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scanning, setScanning] = useState(true);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  useEffect(() => {
    const startCamera = async () => {
      try {
        const constraints = {
          video: {
            facingMode: "environment",
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        };
        
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        toast.error("カメラへのアクセスが拒否されました");
      }
    };

    startCamera();

    return () => {
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream)
          .getTracks()
          .forEach((track) => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    let animationFrame: number;

    const scan = () => {
      if (!scanning) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video?.readyState === video.HAVE_ENOUGH_DATA && canvas) {
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // スキャンエリアの計算（1:3の比率）
        const scanAreaWidth = Math.min(video.videoWidth * 0.8, 800);
        const scanAreaHeight = scanAreaWidth / 3;
        const x = (video.videoWidth - scanAreaWidth) / 2;
        const y = (video.videoHeight - scanAreaHeight) / 2;

        // ビデオ全体を描画
        ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);

        // スキャンエリアの画像データを取得
        const imageData = ctx.getImageData(x, y, scanAreaWidth, scanAreaHeight);

        try {
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
          });

          if (code) {
            setScanning(false);
            const captureCanvas = document.createElement('canvas');
            captureCanvas.width = scanAreaWidth;
            captureCanvas.height = scanAreaHeight;
            const captureCtx = captureCanvas.getContext('2d');
            
            if (captureCtx) {
              captureCtx.drawImage(
                canvas, 
                x, y, scanAreaWidth, scanAreaHeight,
                0, 0, scanAreaWidth, scanAreaHeight
              );
              setCapturedImage(captureCanvas.toDataURL("image/png"));
              toast.success("QRコードを検出しました");
            }
          }
        } catch (error) {
          console.error("QRコードの検出中にエラーが発生しました:", error);
        }
      }

      animationFrame = requestAnimationFrame(scan);
    };

    scan();

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [scanning]);

  const handleDownload = () => {
    if (capturedImage) {
      const link = document.createElement("a");
      link.href = capturedImage;
      link.download = "qr-scan.png";
      link.click();
      toast.success("画像を保存しました");
    }
  };

  return (
    <div className="fixed inset-0 bg-black">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="h-full w-full object-cover"
      />
      <canvas ref={canvasRef} className="hidden" />
      <ScanOverlay scanning={scanning} />
      
      <div className="absolute bottom-8 left-0 right-0 flex justify-center">
        {capturedImage && (
          <Button
            onClick={handleDownload}
            className="animate-fade-in bg-scanner-highlight px-8 py-4 text-white hover:bg-blue-700"
          >
            写真をダウンロード
          </Button>
        )}
      </div>
    </div>
  );
};

export default QRScanner;