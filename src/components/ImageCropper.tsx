import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent } from "@/components/ui/card";
import { Crop, RotateCw, ZoomIn, Check, X } from "lucide-react";

interface ImageCropperProps {
  imageSrc: string;
  onCropComplete: (croppedImageUrl: string) => void;
  onCancel: () => void;
}

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function ImageCropper({ imageSrc, onCropComplete, onCancel }: ImageCropperProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isLoaded, setIsLoaded] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [cropArea, setCropArea] = useState<CropArea>({ x: 0, y: 0, width: 100, height: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [displaySize, setDisplaySize] = useState({ width: 0, height: 0 });

  // Load image
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imageRef.current = img;
      setIsLoaded(true);

      // Calculate display size to fit container
      const maxWidth = 600;
      const maxHeight = 400;
      const ratio = Math.min(maxWidth / img.width, maxHeight / img.height, 1);
      setDisplaySize({
        width: img.width * ratio,
        height: img.height * ratio,
      });

      // Set initial crop area (80% of image)
      setCropArea({
        x: img.width * 0.1 * ratio,
        y: img.height * 0.1 * ratio,
        width: img.width * 0.8 * ratio,
        height: img.height * 0.8 * ratio,
      });
    };
    img.src = imageSrc;
  }, [imageSrc]);

  // Draw canvas
  useEffect(() => {
    if (!isLoaded || !canvasRef.current || !imageRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = displaySize.width;
    canvas.height = displaySize.height;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw image with transformations
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(zoom, zoom);
    ctx.translate(-canvas.width / 2, -canvas.height / 2);
    ctx.drawImage(imageRef.current, 0, 0, displaySize.width, displaySize.height);
    ctx.restore();

    // Draw darkened overlay
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Clear crop area (show original image)
    ctx.save();
    ctx.beginPath();
    ctx.rect(cropArea.x, cropArea.y, cropArea.width, cropArea.height);
    ctx.clip();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(zoom, zoom);
    ctx.translate(-canvas.width / 2, -canvas.height / 2);
    ctx.drawImage(imageRef.current, 0, 0, displaySize.width, displaySize.height);
    ctx.restore();

    // Draw crop border
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.strokeRect(cropArea.x, cropArea.y, cropArea.width, cropArea.height);

    // Draw grid lines
    ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
    ctx.lineWidth = 1;
    const thirdW = cropArea.width / 3;
    const thirdH = cropArea.height / 3;
    ctx.beginPath();
    ctx.moveTo(cropArea.x + thirdW, cropArea.y);
    ctx.lineTo(cropArea.x + thirdW, cropArea.y + cropArea.height);
    ctx.moveTo(cropArea.x + thirdW * 2, cropArea.y);
    ctx.lineTo(cropArea.x + thirdW * 2, cropArea.y + cropArea.height);
    ctx.moveTo(cropArea.x, cropArea.y + thirdH);
    ctx.lineTo(cropArea.x + cropArea.width, cropArea.y + thirdH);
    ctx.moveTo(cropArea.x, cropArea.y + thirdH * 2);
    ctx.lineTo(cropArea.x + cropArea.width, cropArea.y + thirdH * 2);
    ctx.stroke();

    // Draw corner handles
    const handleSize = 10;
    ctx.fillStyle = "#fff";
    const corners = [
      { x: cropArea.x, y: cropArea.y },
      { x: cropArea.x + cropArea.width, y: cropArea.y },
      { x: cropArea.x, y: cropArea.y + cropArea.height },
      { x: cropArea.x + cropArea.width, y: cropArea.y + cropArea.height },
    ];
    corners.forEach(({ x, y }) => {
      ctx.fillRect(x - handleSize / 2, y - handleSize / 2, handleSize, handleSize);
    });
  }, [isLoaded, cropArea, zoom, rotation, displaySize]);

  const getMousePos = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getMousePos(e);
    const handleSize = 15;

    // Check if clicking on corners (resize handles)
    const corners = [
      { name: "nw", x: cropArea.x, y: cropArea.y },
      { name: "ne", x: cropArea.x + cropArea.width, y: cropArea.y },
      { name: "sw", x: cropArea.x, y: cropArea.y + cropArea.height },
      { name: "se", x: cropArea.x + cropArea.width, y: cropArea.y + cropArea.height },
    ];

    for (const corner of corners) {
      if (
        Math.abs(pos.x - corner.x) < handleSize &&
        Math.abs(pos.y - corner.y) < handleSize
      ) {
        setIsResizing(corner.name);
        setDragStart(pos);
        return;
      }
    }

    // Check if clicking inside crop area (drag)
    if (
      pos.x >= cropArea.x &&
      pos.x <= cropArea.x + cropArea.width &&
      pos.y >= cropArea.y &&
      pos.y <= cropArea.y + cropArea.height
    ) {
      setIsDragging(true);
      setDragStart(pos);
    }
  }, [cropArea, getMousePos]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getMousePos(e);
    const deltaX = pos.x - dragStart.x;
    const deltaY = pos.y - dragStart.y;

    if (isDragging) {
      setCropArea((prev) => ({
        ...prev,
        x: Math.max(0, Math.min(displaySize.width - prev.width, prev.x + deltaX)),
        y: Math.max(0, Math.min(displaySize.height - prev.height, prev.y + deltaY)),
      }));
      setDragStart(pos);
    } else if (isResizing) {
      setCropArea((prev) => {
        let newArea = { ...prev };
        const minSize = 50;

        switch (isResizing) {
          case "nw":
            newArea.width = Math.max(minSize, prev.width - deltaX);
            newArea.height = Math.max(minSize, prev.height - deltaY);
            newArea.x = prev.x + prev.width - newArea.width;
            newArea.y = prev.y + prev.height - newArea.height;
            break;
          case "ne":
            newArea.width = Math.max(minSize, prev.width + deltaX);
            newArea.height = Math.max(minSize, prev.height - deltaY);
            newArea.y = prev.y + prev.height - newArea.height;
            break;
          case "sw":
            newArea.width = Math.max(minSize, prev.width - deltaX);
            newArea.height = Math.max(minSize, prev.height + deltaY);
            newArea.x = prev.x + prev.width - newArea.width;
            break;
          case "se":
            newArea.width = Math.max(minSize, prev.width + deltaX);
            newArea.height = Math.max(minSize, prev.height + deltaY);
            break;
        }

        // Constrain to canvas bounds
        newArea.x = Math.max(0, newArea.x);
        newArea.y = Math.max(0, newArea.y);
        newArea.width = Math.min(displaySize.width - newArea.x, newArea.width);
        newArea.height = Math.min(displaySize.height - newArea.y, newArea.height);

        return newArea;
      });
      setDragStart(pos);
    }
  }, [isDragging, isResizing, dragStart, getMousePos, displaySize]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(null);
  }, []);

  const handleCrop = useCallback(() => {
    if (!imageRef.current) return;

    const img = imageRef.current;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Calculate actual crop coordinates based on original image size
    const scaleX = img.width / displaySize.width;
    const scaleY = img.height / displaySize.height;

    const actualCrop = {
      x: cropArea.x * scaleX,
      y: cropArea.y * scaleY,
      width: cropArea.width * scaleX,
      height: cropArea.height * scaleY,
    };

    // Set output canvas size
    canvas.width = actualCrop.width;
    canvas.height = actualCrop.height;

    // Apply transformations and draw cropped image
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(zoom, zoom);
    ctx.translate(-canvas.width / 2, -canvas.height / 2);
    ctx.drawImage(
      img,
      actualCrop.x / zoom,
      actualCrop.y / zoom,
      actualCrop.width / zoom,
      actualCrop.height / zoom,
      0,
      0,
      canvas.width,
      canvas.height
    );
    ctx.restore();

    // Convert to data URL
    const croppedImageUrl = canvas.toDataURL("image/jpeg", 0.9);
    onCropComplete(croppedImageUrl);
  }, [cropArea, rotation, zoom, displaySize, onCropComplete]);

  const handleRotate = useCallback(() => {
    setRotation((prev) => (prev + 90) % 360);
  }, []);

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading image...</p>
      </div>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Crop className="w-5 h-5" />
          <h3 className="text-lg font-semibold">Crop Image</h3>
        </div>

        <div
          ref={containerRef}
          className="relative flex justify-center bg-muted rounded-lg p-4 mb-4"
        >
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className="cursor-crosshair rounded"
            style={{ maxWidth: "100%", height: "auto" }}
          />
        </div>

        <div className="space-y-4 mb-6">
          <div className="flex items-center gap-4">
            <ZoomIn className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm w-12">Zoom</span>
            <Slider
              value={[zoom]}
              onValueChange={([value]) => setZoom(value)}
              min={0.5}
              max={2}
              step={0.1}
              className="flex-1"
            />
            <span className="text-sm w-12 text-right">{(zoom * 100).toFixed(0)}%</span>
          </div>

          <Button variant="outline" size="sm" onClick={handleRotate}>
            <RotateCw className="w-4 h-4 mr-2" />
            Rotate 90°
          </Button>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onCancel}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleCrop}>
            <Check className="w-4 h-4 mr-2" />
            Apply Crop
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
