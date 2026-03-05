import type { FabricObject } from "fabric";

type ControlRenderFn = (
  ctx: CanvasRenderingContext2D,
  left: number,
  top: number,
  styleOverride: any,
  fabricObject: FabricObject,
) => void;

const CORNER_RADIUS = 6;
const ICON_RADIUS = 14;
const ICON_STROKE = "#333333";

function renderCornerDot(): ControlRenderFn {
  return (ctx, left, top) => {
    ctx.save();
    ctx.translate(left, top);

    ctx.shadowColor = "rgba(0,0,0,0.18)";
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 1;

    ctx.beginPath();
    ctx.arc(0, 0, CORNER_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = "#FFFFFF";
    ctx.fill();

    ctx.restore();
  };
}

function renderRotation(): ControlRenderFn {
  return (ctx, left, top) => {
    ctx.save();
    ctx.translate(left, top);

    // White circle background with shadow
    ctx.shadowColor = "rgba(0,0,0,0.22)";
    ctx.shadowBlur = 6;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 2;
    ctx.beginPath();
    ctx.arc(0, 0, ICON_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = "#FFFFFF";
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;

    // Scale the 24x24 Figma SVG to fit inside the circle
    const s = 20 / 24;
    ctx.scale(s, s);
    ctx.translate(-12, -12);

    ctx.strokeStyle = ICON_STROKE;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Curved arrow path
    ctx.beginPath();
    ctx.moveTo(15, 4.55);
    ctx.bezierCurveTo(14.02, 4.156, 12.975, 3.959, 11.921, 3.969);
    ctx.bezierCurveTo(10.866, 3.979, 9.824, 4.198, 8.853, 4.611);
    ctx.bezierCurveTo(7.883, 5.024, 7.004, 5.624, 6.265, 6.377);
    ctx.bezierCurveTo(5.527, 7.13, 4.944, 8.022, 4.55, 9);
    ctx.bezierCurveTo(3.754, 10.976, 3.776, 13.187, 4.611, 15.147);
    ctx.bezierCurveTo(5.445, 17.106, 7.024, 18.654, 9, 19.45);
    ctx.stroke();

    // Arrowhead (L-shape)
    ctx.beginPath();
    ctx.moveTo(9, 15);
    ctx.lineTo(9, 20);
    ctx.lineTo(4, 20);
    ctx.stroke();

    // Dotted trail (round linecap makes these circular dots)
    const dots = [[18.37, 7.16], [13, 19.94], [16.84, 18.37], [19.37, 15.1], [19.94, 11]];
    for (const [dx, dy] of dots) {
      ctx.beginPath();
      ctx.moveTo(dx, dy);
      ctx.lineTo(dx, dy + 0.01);
      ctx.stroke();
    }

    ctx.restore();
  };
}

function drawIconCircleBg(ctx: CanvasRenderingContext2D) {
  ctx.shadowColor = "rgba(0,0,0,0.22)";
  ctx.shadowBlur = 6;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 2;
  ctx.beginPath();
  ctx.arc(0, 0, ICON_RADIUS, 0, Math.PI * 2);
  ctx.fillStyle = "#FFFFFF";
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
}

function renderResizeVertical(): ControlRenderFn {
  return (ctx, left, top) => {
    ctx.save();
    ctx.translate(left, top);
    drawIconCircleBg(ctx);

    ctx.strokeStyle = ICON_STROKE;
    ctx.lineWidth = 1.8;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const arm = 7;
    const arrow = 3;

    // Vertical line
    ctx.beginPath();
    ctx.moveTo(0, -arm);
    ctx.lineTo(0, arm);
    ctx.stroke();

    // Up arrowhead
    ctx.beginPath();
    ctx.moveTo(-arrow, -arm + arrow);
    ctx.lineTo(0, -arm);
    ctx.lineTo(arrow, -arm + arrow);
    ctx.stroke();

    // Down arrowhead
    ctx.beginPath();
    ctx.moveTo(-arrow, arm - arrow);
    ctx.lineTo(0, arm);
    ctx.lineTo(arrow, arm - arrow);
    ctx.stroke();

    ctx.restore();
  };
}

function renderResizeHorizontal(): ControlRenderFn {
  return (ctx, left, top) => {
    ctx.save();
    ctx.translate(left, top);
    drawIconCircleBg(ctx);

    ctx.strokeStyle = ICON_STROKE;
    ctx.lineWidth = 1.8;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const arm = 7;
    const arrow = 3;

    // Horizontal line
    ctx.beginPath();
    ctx.moveTo(-arm, 0);
    ctx.lineTo(arm, 0);
    ctx.stroke();

    // Left arrowhead
    ctx.beginPath();
    ctx.moveTo(-arm + arrow, -arrow);
    ctx.lineTo(-arm, 0);
    ctx.lineTo(-arm + arrow, arrow);
    ctx.stroke();

    // Right arrowhead
    ctx.beginPath();
    ctx.moveTo(arm - arrow, -arrow);
    ctx.lineTo(arm, 0);
    ctx.lineTo(arm - arrow, arrow);
    ctx.stroke();

    ctx.restore();
  };
}

function renderNothing(): ControlRenderFn {
  return () => {};
}

/**
 * Returns a map of Fabric control names to custom render functions.
 *
 * - Corners: clean white dots with subtle shadow
 * - Side handles (ml/mr): same white dots
 * - Rotation (mtr): rotation icon, positioned below the object
 * - Vertical resize (mb): up/down arrows icon, positioned below
 * - Horizontal resize (resizeH): left/right arrows icon, positioned below
 */
export function getCustomControlRenderers(): Record<string, ControlRenderFn> {
  return {
    tl: renderCornerDot(),
    tr: renderCornerDot(),
    bl: renderCornerDot(),
    br: renderCornerDot(),

    ml: renderCornerDot(),
    mr: renderCornerDot(),
    mt: renderNothing(),
    mb: renderResizeVertical(),

    mtr: renderRotation(),
    resizeH: renderResizeHorizontal(),
  };
}
