# FormData Body Size Limit Issue in Next.js 15

## Problem

Next.js 15 App Router has a **hardcoded 1MB limit** for FormData bodies in Route Handlers.

This affects Base64 image uploads when the Base64 string exceeds ~1,048,576 characters.

## Evidence

```
[External Flux Combine] Found Base64 image: imageBase640, length: 1048576 chars (1.00 MB)  ← TRUNCATED!
[External Flux Combine] Found Base64 image: imageBase641, length: 1035378 chars (0.99 MB) ← TRUNCATED!
```

Original Base64 strings are ~3.9M characters, but they get cut off at exactly 1MB.

## Why it happens

- `experimental.serverActions.bodySizeLimit` only applies to Server Actions (not Route Handlers)
- Route Handlers with FormData have a fixed 1MB limit in Next.js 15
- No configuration option available to increase this limit

## Solution

**Use JSON instead of FormData for Base64 images >1MB**

JSON bodies don't have the same strict limit as FormData multipart parsing.

## Implementation

1. Keep FormData for file uploads (works fine, no limit issues)
2. Add JSON endpoint variant for Base64-only requests
3. Frontend detects Base64 size and chooses appropriate method

## Workaround Status

- ✅ Logs added to detect truncation
- ✅ Validation to reject corrupted Base64
- ⏳ JSON endpoint implementation (pending)
- ⏳ Frontend auto-detection (pending)
