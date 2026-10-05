import { useEffect, useRef, useState } from 'react';
import type { IScannerControls } from '@zxing/browser';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ProductQrScannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDetected: (text: string) => void;
}

function cameraErrorMessage(error: unknown) {
  if (error instanceof DOMException) {
    if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
      return 'Autorisez l’accès à la caméra dans les réglages du navigateur, puis réessayez.';
    }
    if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
      return 'Aucune caméra n’a été trouvée sur cet appareil.';
    }
    if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
      return 'La caméra est déjà utilisée par une autre application.';
    }
  }
  return 'Impossible de démarrer le scanner. Vérifiez les autorisations de la caméra et réessayez.';
}

export function ProductQrScannerDialog({
  open,
  onOpenChange,
  onDetected,
}: ProductQrScannerDialogProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraError, setCameraError] = useState('');
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!open) return;

    let isActive = true;
    let hasRead = false;
    let controls: IScannerControls | undefined;
    const video = videoRef.current;

    setCameraError('');
    setStarting(true);

    if (!video || !navigator.mediaDevices?.getUserMedia) {
      setStarting(false);
      setCameraError('Cet appareil ou navigateur ne permet pas d’accéder à une caméra.');
      return;
    }

    if (!window.isSecureContext && window.location.hostname !== 'localhost') {
      setStarting(false);
      setCameraError('Le scanner nécessite une connexion HTTPS sécurisée.');
      return;
    }

    const startScanner = async () => {
      try {
        const { BrowserQRCodeReader } = await import('@zxing/browser');
        if (!isActive) return;
        const reader = new BrowserQRCodeReader();
        controls = await reader.decodeFromVideoDevice(undefined, video, (result, _error, scannerControls) => {
          controls = scannerControls;
          if (!isActive || !result || hasRead) return;

          hasRead = true;
          scannerControls.stop();
          onDetected(result.getText());
          onOpenChange(false);
        });
        if (!isActive) {
          controls.stop();
          return;
        }
        setStarting(false);
      } catch (error) {
        if (!isActive) return;
        setStarting(false);
        setCameraError(cameraErrorMessage(error));
      }
    };

    void startScanner();

    return () => {
      isActive = false;
      controls?.stop();
      const stream = video.srcObject;
      if (stream instanceof MediaStream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      video.srcObject = null;
    };
  }, [open, onDetected, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="scanner-dialog-content">
        <DialogHeader>
          <DialogTitle>Scanner un QR produit</DialogTitle>
          <DialogDescription>
            La caméra arrière est utilisée si elle est disponible. Le scan reste sur cet appareil.
          </DialogDescription>
        </DialogHeader>
        <div className="scanner-video-frame">
          <video ref={videoRef} autoPlay muted playsInline aria-label="Aperçu de la caméra pour scanner un QR" />
          {starting && <div className="scanner-overlay">Démarrage de la caméra…</div>}
        </div>
        {cameraError ? (
          <p className="scanner-error" role="alert">{cameraError}</p>
        ) : (
          <p className="scanner-hint">
            Le QR doit contenir un nom et un prix. Exemple :
          </p>
        )}
        <pre className="scanner-example">{'{"name":"Riz","price":2500,"currency":"CDF","quantity":1}'}</pre>
      </DialogContent>
    </Dialog>
  );
}
