import { useEffect, useRef } from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Download, QrCode } from "lucide-react";
import { toast } from "sonner";

interface QRCodeGeneratorProps {
  url: string;
  menuName: string;
}

export function QRCodeGenerator({ url, menuName }: QRCodeGeneratorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, url, {
        width: 300,
        margin: 2,
        color: {
          dark: '#ea580c',
          light: '#fffbeb',
        },
      });
    }
  }, [url]);

  const handleDownload = () => {
    if (canvasRef.current) {
      canvasRef.current.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${menuName.replace(/\s+/g, '-').toLowerCase()}-qr-code.png`;
          a.click();
          URL.revokeObjectURL(url);
          toast.success("QR code downloaded!");
        }
      });
    }
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <QrCode className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">QR Code</h3>
        </div>
        <div className="flex flex-col items-center">
          <canvas ref={canvasRef} className="mb-4 rounded-lg shadow-warm" />
          <Button onClick={handleDownload} variant="outline" className="w-full">
            <Download className="w-4 h-4 mr-2" />
            Download QR Code
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
