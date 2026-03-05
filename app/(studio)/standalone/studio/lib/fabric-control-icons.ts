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

function renderMove(): ControlRenderFn {
  return (ctx, left, top) => {
    ctx.save();
    ctx.translate(left, top);
    drawIconCircleBg(ctx);

    // Scale the 24x24 Figma SVG to fit inside the circle
    const s = 20 / 24;
    ctx.scale(s, s);
    ctx.translate(-12, -12);

    ctx.fillStyle = ICON_STROKE;
    ctx.beginPath();
    ctx.moveTo(18.21, 7.79);
    ctx.lineTo(16.8, 9.2);
    ctx.lineTo(18.59, 10.99);
    ctx.lineTo(13, 10.99);
    ctx.lineTo(13, 5.4);
    ctx.lineTo(14.79, 7.19);
    ctx.lineTo(16.2, 5.78);
    ctx.lineTo(12.7, 2.28);
    ctx.bezierCurveTo(12.6075, 2.1873, 12.4976, 2.1137, 12.3766, 2.0636);
    ctx.bezierCurveTo(12.2556, 2.0134, 12.126, 1.9876, 11.995, 1.9876);
    ctx.bezierCurveTo(11.864, 1.9876, 11.7343, 2.0134, 11.6134, 2.0636);
    ctx.bezierCurveTo(11.4924, 2.1137, 11.3825, 2.1873, 11.29, 2.28);
    ctx.lineTo(7.79, 5.78);
    ctx.lineTo(9.2, 7.19);
    ctx.lineTo(10.99, 5.4);
    ctx.lineTo(10.99, 10.99);
    ctx.lineTo(5.4, 10.99);
    ctx.lineTo(7.19, 9.2);
    ctx.lineTo(5.78, 7.79);
    ctx.lineTo(2.28, 11.29);
    ctx.bezierCurveTo(2.1873, 11.3825, 2.1137, 11.4924, 2.0636, 11.6134);
    ctx.bezierCurveTo(2.0134, 11.7343, 1.9876, 11.864, 1.9876, 11.995);
    ctx.bezierCurveTo(1.9876, 12.126, 2.0134, 12.2556, 2.0636, 12.3766);
    ctx.bezierCurveTo(2.1137, 12.4976, 2.1873, 12.6075, 2.28, 12.7);
    ctx.lineTo(5.78, 16.2);
    ctx.lineTo(7.19, 14.79);
    ctx.lineTo(5.4, 13);
    ctx.lineTo(10.99, 13);
    ctx.lineTo(10.99, 18.59);
    ctx.lineTo(9.2, 16.8);
    ctx.lineTo(7.79, 18.21);
    ctx.lineTo(11.29, 21.71);
    ctx.bezierCurveTo(11.49, 21.91, 11.74, 22, 12, 22);
    ctx.bezierCurveTo(12.26, 22, 12.51, 21.9, 12.71, 21.71);
    ctx.lineTo(16.21, 18.21);
    ctx.lineTo(14.8, 16.8);
    ctx.lineTo(13.01, 18.59);
    ctx.lineTo(13.01, 13);
    ctx.lineTo(18.6, 13);
    ctx.lineTo(16.81, 14.79);
    ctx.lineTo(18.22, 16.2);
    ctx.lineTo(21.72, 12.7);
    ctx.bezierCurveTo(21.8127, 12.6075, 21.8862, 12.4976, 21.9364, 12.3766);
    ctx.bezierCurveTo(21.9866, 12.2556, 22.0124, 12.126, 22.0124, 11.995);
    ctx.bezierCurveTo(22.0124, 11.864, 21.9866, 11.7343, 21.9364, 11.6134);
    ctx.bezierCurveTo(21.8862, 11.4924, 21.8127, 11.3825, 21.72, 11.29);
    ctx.lineTo(18.22, 7.79);
    ctx.lineTo(18.21, 7.79);
    ctx.closePath();
    ctx.fill();

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
 * - Move (moveCtrl): 4-way arrow icon, positioned below
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
    moveCtrl: renderMove(),
  };
}
