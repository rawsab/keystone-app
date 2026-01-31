"use client";

import { useRef, useState, useEffect } from "react";
import { useFileDownloadUrl } from "@/lib/queries/files.queries";
import { FileText } from "lucide-react";
import { cn } from "@/lib/utils";

const THUMB_SIZE = 40;

export interface FileThumbnailProps {
  fileId: string;
  mimeType: string;
  fileName?: string;
  className?: string;
}

function isImage(mime: string): boolean {
  return mime.startsWith("image/");
}

function isPdf(mime: string): boolean {
  return mime === "application/pdf";
}

export function FileThumbnail({
  fileId,
  mimeType,
  fileName,
  className,
}: FileThumbnailProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [imageError, setImageError] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const shouldLoadPreview = isImage(mimeType) || isPdf(mimeType);
  const {
    data: downloadUrl,
    isLoading,
    isError,
  } = useFileDownloadUrl(fileId, isVisible && shouldLoadPreview, {
    preview: true,
  });

  // Lazy: only observe when we might show a preview
  useEffect(() => {
    if (!shouldLoadPreview || !containerRef.current) return;
    const el = containerRef.current;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setIsVisible(true);
      },
      { rootMargin: "50px", threshold: 0.01 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [shouldLoadPreview]);

  // Render PDF first page to canvas when URL is ready
  useEffect(() => {
    if (!isPdf(mimeType) || !downloadUrl || !canvasRef.current) return;
    let cancelled = false;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    async function renderPdfFirstPage() {
      try {
        const pdfjs = await import("pdfjs-dist");
        const pdf = await pdfjs.getDocument({ url: downloadUrl }).promise;
        if (cancelled) return;
        const page = await pdf.getPage(1);
        if (cancelled) return;
        const viewport = page.getViewport({ scale: 1 });
        const scale = Math.min(
          THUMB_SIZE / viewport.width,
          THUMB_SIZE / viewport.height,
          1,
        );
        const scaledViewport = page.getViewport({ scale });
        canvas.width = Math.min(scaledViewport.width, THUMB_SIZE);
        canvas.height = Math.min(scaledViewport.height, THUMB_SIZE);
        const task = page.render({
          canvasContext: ctx ?? undefined,
          canvas,
          viewport: scaledViewport,
          intent: "display",
        });
        await task.promise;
      } catch {
        // Ignore PDF load/render errors; fallback icon is shown
      }
    }
    renderPdfFirstPage();
    return () => {
      cancelled = true;
    };
  }, [mimeType, downloadUrl]);

  const boxClass = cn(
    "flex shrink-0 items-center justify-center overflow-hidden rounded border bg-muted",
    "w-10 h-10",
    className,
  );

  if (!shouldLoadPreview) {
    return (
      <div className={boxClass} ref={containerRef}>
        <FileText className="h-5 w-5 text-muted-foreground" />
      </div>
    );
  }

  if (!isVisible) {
    return (
      <div className={boxClass} ref={containerRef}>
        <div className="h-5 w-5 animate-pulse rounded bg-muted-foreground/20" />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={boxClass} ref={containerRef}>
        <div className="h-5 w-5 animate-pulse rounded bg-muted-foreground/20" />
      </div>
    );
  }

  if (isError || !downloadUrl || (isImage(mimeType) && imageError)) {
    return (
      <div className={boxClass} ref={containerRef}>
        <FileText className="h-5 w-5 text-muted-foreground" />
      </div>
    );
  }

  if (isImage(mimeType)) {
    return (
      <div className={boxClass} ref={containerRef}>
        <img
          src={downloadUrl}
          alt={fileName ? `Preview of ${fileName}` : "File preview"}
          className="h-full w-full object-cover"
          loading="lazy"
          onError={() => setImageError(true)}
        />
      </div>
    );
  }

  if (isPdf(mimeType)) {
    return (
      <div className={boxClass} ref={containerRef}>
        <canvas
          ref={canvasRef}
          className="h-full w-full object-contain"
          style={{ maxWidth: THUMB_SIZE, maxHeight: THUMB_SIZE }}
        />
      </div>
    );
  }

  return (
    <div className={boxClass} ref={containerRef}>
      <FileText className="h-5 w-5 text-muted-foreground" />
    </div>
  );
}
