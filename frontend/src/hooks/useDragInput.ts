// Hook for handling drag/flick input on canvas

import { useState, useCallback, useRef } from "react";
import type { Vector2D, FlickInput } from "@/game/types";
import { vec2 } from "@/game/physics";

interface UseDragInputOptions {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  chunPosition: Vector2D;
  chunRadius: number;
  enabled: boolean;
  onFlick: (input: FlickInput) => void;
}

interface UseDragInputReturn {
  isDragging: boolean;
  dragStart: Vector2D;
  dragCurrent: Vector2D;
  handleMouseDown: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  handleMouseMove: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  handleMouseUp: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  handleTouchStart: (e: React.TouchEvent<HTMLCanvasElement>) => void;
  handleTouchMove: (e: React.TouchEvent<HTMLCanvasElement>) => void;
  handleTouchEnd: (e: React.TouchEvent<HTMLCanvasElement>) => void;
}

function getCanvasPosition(
  canvas: HTMLCanvasElement,
  clientX: number,
  clientY: number,
): Vector2D {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY,
  };
}

export function useDragInput(options: UseDragInputOptions): UseDragInputReturn {
  const { canvasRef, chunPosition, chunRadius, enabled, onFlick } = options;

  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Vector2D>({ x: 0, y: 0 });
  const [dragCurrent, setDragCurrent] = useState<Vector2D>({ x: 0, y: 0 });

  const isValidDrag = useRef(false);

  const startDrag = useCallback(
    (pos: Vector2D) => {
      if (!enabled) return;

      // Check if click is on the chun
      const distance = vec2.distance(pos, chunPosition);
      
      if (distance <= chunRadius * 1.5) {
        setIsDragging(true);
        setDragStart(chunPosition);
        setDragCurrent(pos);
        isValidDrag.current = true;
      }
    },
    [enabled, chunPosition, chunRadius],
  );

  const updateDrag = useCallback(
    (pos: Vector2D) => {
      if (!isDragging || !isValidDrag.current) return;
      setDragCurrent(pos);
    },
    [isDragging],
  );

  const endDrag = useCallback(
    (pos: Vector2D) => {
      if (!isDragging || !isValidDrag.current) return;

      setIsDragging(false);

      const distance = vec2.distance(pos, dragStart);

      // Only trigger flick if drag distance is significant
      if (distance > 10) {
        onFlick({
          startPosition: dragStart,
          endPosition: pos,
          power: Math.min(distance / 100, 1),
        });
      }

      isValidDrag.current = false;
    },
    [isDragging, dragStart, onFlick],
  );

  // Mouse handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const pos = getCanvasPosition(canvas, e.clientX, e.clientY);
      startDrag(pos);
    },
    [canvasRef, startDrag],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const pos = getCanvasPosition(canvas, e.clientX, e.clientY);
      updateDrag(pos);
    },
    [canvasRef, updateDrag],
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const pos = getCanvasPosition(canvas, e.clientX, e.clientY);
      endDrag(pos);
    },
    [canvasRef, endDrag],
  );

  // Touch handlers
  const handleTouchStart = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas || e.touches.length === 0) return;

      const touch = e.touches[0];
      const pos = getCanvasPosition(canvas, touch.clientX, touch.clientY);
      startDrag(pos);
    },
    [canvasRef, startDrag],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas || e.touches.length === 0) return;

      const touch = e.touches[0];
      const pos = getCanvasPosition(canvas, touch.clientX, touch.clientY);
      updateDrag(pos);
    },
    [canvasRef, updateDrag],
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas) return;

      // Use last known position
      endDrag(dragCurrent);
    },
    [canvasRef, endDrag, dragCurrent],
  );

  return {
    isDragging,
    dragStart,
    dragCurrent,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  };
}
