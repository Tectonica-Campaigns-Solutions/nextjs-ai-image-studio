import { Rect, Canvas, FabricObject } from "fabric";

export interface SnappyRectOptions {
  snapEnabled?: boolean;
  snapThreshold?: number;
  [key: string]: any;
}

export class SnappyRect extends Rect {
  declare snapEnabled: boolean;
  declare snapThreshold: number;
  private guideLines: { x?: number; y?: number }[] = [];
  private _snapCanvas: Canvas | null = null;

  constructor(options?: SnappyRectOptions) {
    super(options);
    this.snapEnabled = options?.snapEnabled ?? true;
    this.snapThreshold = options?.snapThreshold ?? 5;
    this.guideLines = [];
  }

  initialize(options?: SnappyRectOptions) {
    super.initialize(options);
    this.snapEnabled = options?.snapEnabled ?? true;
    this.snapThreshold = options?.snapThreshold ?? 5;
    return this;
  }

  _setCanvas(canvas: Canvas) {
    this.canvas = canvas;
  }

  /**
   * Calculate snap positions for guides (canvas center, edges)
   */
  private _getGuidePositions(): { x: number[]; y: number[] } {
    if (!this._snapCanvas) return { x: [], y: [] };

    const canvasWidth = this._snapCanvas.width || 0;
    const canvasHeight = this._snapCanvas.height || 0;

    return {
      x: [0, canvasWidth / 2, canvasWidth], // left, center, right
      y: [0, canvasHeight / 2, canvasHeight], // top, center, bottom
    };
  }

  /**
   * Get snap positions from other objects on canvas
   */
  private _getObjectSnapPositions(): { x: number[]; y: number[] } {
    if (!this._snapCanvas) return { x: [], y: [] };

    const objects = this._snapCanvas.getObjects();
    const snapPositions: { x: number[]; y: number[] } = { x: [], y: [] };

    objects.forEach((obj) => {
      // Skip self and background objects
      if (obj === this || (obj as any).isBackground) return;

      const bounds = obj.getBoundingRect();
      const centerX = bounds.left + bounds.width / 2;
      const centerY = bounds.top + bounds.height / 2;

      // Add edges and center
      snapPositions.x.push(bounds.left, centerX, bounds.left + bounds.width);
      snapPositions.y.push(bounds.top, centerY, bounds.top + bounds.height);
    });

    return snapPositions;
  }

  /**
   * Find the closest snap position within threshold
   */
  private _findSnapPosition(
    currentPos: number,
    snapPositions: number[],
    threshold: number
  ): number | null {
    let closestPos: number | null = null;
    let minDistance = threshold;

    snapPositions.forEach((pos) => {
      const distance = Math.abs(currentPos - pos);
      if (distance < minDistance) {
        minDistance = distance;
        closestPos = pos;
      }
    });

    return closestPos;
  }

  /**
   * Apply snapping to position
   */
  private _snapPosition(
    currentPos: number,
    snapPositions: number[],
    threshold: number
  ): { snapped: boolean; position: number; guide?: number } {
    if (!this.snapEnabled) {
      return { snapped: false, position: currentPos };
    }

    const snapPos = this._findSnapPosition(currentPos, snapPositions, threshold);
    if (snapPos !== null) {
      return { snapped: true, position: snapPos, guide: snapPos };
    }

    return { snapped: false, position: currentPos };
  }

  /**
   * Apply snapping during movement
   */
  private _applySnapping() {
    if (!this._snapCanvas || !this.snapEnabled) {
      this.guideLines = [];
      return;
    }

    const guidePositions = this._getGuidePositions();
    const objectPositions = this._getObjectSnapPositions();

    const allXPositions = [...guidePositions.x, ...objectPositions.x];
    const allYPositions = [...guidePositions.y, ...objectPositions.y];

    const bounds = this.getBoundingRect();
    const currentLeft = bounds.left;
    const currentTop = bounds.top;
    const currentRight = bounds.left + bounds.width;
    const currentBottom = bounds.top + bounds.height;
    const currentCenterX = bounds.left + bounds.width / 2;
    const currentCenterY = bounds.top + bounds.height / 2;

    const guideLines: { x?: number; y?: number }[] = [];

    // Snap left edge
    const leftSnap = this._snapPosition(
      currentLeft,
      allXPositions,
      this.snapThreshold
    );
    if (leftSnap.snapped && leftSnap.guide !== undefined) {
      this.set({ left: leftSnap.position });
      guideLines.push({ x: leftSnap.guide });
    }

    // Snap right edge
    const rightSnap = this._snapPosition(
      currentRight,
      allXPositions,
      this.snapThreshold
    );
    if (rightSnap.snapped && rightSnap.guide !== undefined) {
      this.set({ left: rightSnap.position - bounds.width });
      guideLines.push({ x: rightSnap.guide });
    }

    // Snap center X
    const centerXSnap = this._snapPosition(
      currentCenterX,
      allXPositions,
      this.snapThreshold
    );
    if (centerXSnap.snapped && centerXSnap.guide !== undefined) {
      this.set({ left: centerXSnap.position - bounds.width / 2 });
      guideLines.push({ x: centerXSnap.guide });
    }

    // Snap top edge
    const topSnap = this._snapPosition(
      currentTop,
      allYPositions,
      this.snapThreshold
    );
    if (topSnap.snapped && topSnap.guide !== undefined) {
      this.set({ top: topSnap.position });
      guideLines.push({ y: topSnap.guide });
    }

    // Snap bottom edge
    const bottomSnap = this._snapPosition(
      currentBottom,
      allYPositions,
      this.snapThreshold
    );
    if (bottomSnap.snapped && bottomSnap.guide !== undefined) {
      this.set({ top: bottomSnap.position - bounds.height });
      guideLines.push({ y: bottomSnap.guide });
    }

    // Snap center Y
    const centerYSnap = this._snapPosition(
      currentCenterY,
      allYPositions,
      this.snapThreshold
    );
    if (centerYSnap.snapped && centerYSnap.guide !== undefined) {
      this.set({ top: centerYSnap.position - bounds.height / 2 });
      guideLines.push({ y: centerYSnap.guide });
    }

    this.guideLines = guideLines;
  }

  /**
   * Draw guide lines on canvas
   */
  _drawGuides(ctx: CanvasRenderingContext2D) {
    if (!this._snapCanvas || this.guideLines.length === 0) return;

    const vpt = this._snapCanvas.viewportTransform;
    if (!vpt) return;

    ctx.save();
    ctx.strokeStyle = "#5C38F3";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);

    this.guideLines.forEach((guide) => {
      if (guide.x !== undefined) {
        const x = guide.x * vpt[0] + vpt[4];
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, this._snapCanvas!.height! * vpt[3]);
        ctx.stroke();
      }

      if (guide.y !== undefined) {
        const y = guide.y * vpt[3] + vpt[5];
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(this._snapCanvas!.width! * vpt[0], y);
        ctx.stroke();
      }
    });

    ctx.restore();
  }

  /**
   * Override set method to apply snapping
   */
  set(key: string | any, value?: any) {
    super.set(key, value);
    return this;
  }

  /**
   * Override to handle canvas reference and setup event listeners
   */
  setCoords() {
    super.setCoords();
    
    // Get canvas from fabric object
    if (!this._snapCanvas && (this as any).canvas) {
      this._snapCanvas = (this as any).canvas;
    }
    
    // Apply snapping during movement/scaling
    if (this._snapCanvas && this.snapEnabled) {
      this._applySnapping();
    }
  }

  /**
   * Setup canvas reference when added to canvas
   */
  _setCanvas(canvas: Canvas | null) {
    this._snapCanvas = canvas;
    
    // Setup event listeners for snapping
    if (canvas) {
      this.on("moving", () => {
        if (this.snapEnabled) {
          this._applySnapping();
          canvas.renderAll();
        }
      });
      
      this.on("scaling", () => {
        if (this.snapEnabled) {
          this._applySnapping();
          canvas.renderAll();
        }
      });
    }
  }

  /**
   * Serialization
   */
  toObject(propertiesToInclude?: string[]): any {
    return {
      ...super.toObject(propertiesToInclude),
      snapEnabled: this.snapEnabled,
      snapThreshold: this.snapThreshold,
      type: "snappy-rect",
    };
  }

  /**
   * Deserialization
   */
  static fromObject(
    object: any,
    callback?: (instance: SnappyRect) => void
  ): SnappyRect {
    const instance = new SnappyRect(object);
    if (callback) {
      callback(instance);
    }
    return instance;
  }
}

// Register custom class for serialization
if (typeof window !== "undefined" && (window as any).fabric) {
  (window as any).fabric.SnappyRect = SnappyRect;
}
