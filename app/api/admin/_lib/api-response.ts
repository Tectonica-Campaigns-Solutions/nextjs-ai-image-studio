import { NextResponse } from "next/server";

/** Consistent error response for admin API routes */
export function errorResponse(
  message: string,
  status: 400 | 401 | 403 | 404 | 409 | 500 = 500
) {
  return NextResponse.json({ error: message }, { status });
}

/** Validate UUID param; returns 400 response if invalid */
export function validateIdParam(
  id: string,
  paramName = "id"
): NextResponse | null {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!id || !uuidRegex.test(id)) {
    return NextResponse.json(
      { error: `Invalid ${paramName} format` },
      { status: 400 }
    );
  }
  return null;
}
