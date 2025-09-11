// Enhanced Rate limiting and DDoS detection API
const rateLimitMap = new Map<
  string,
  { requests: number[]; blocked: boolean }
>();

interface Request {
  method: string;
  body?: { ip?: string; endpoint?: string };
  headers: Record<string, string>;
  connection: { remoteAddress?: string };
}

interface Response {
  status: (code: number) => Response;
  json: (data: unknown) => void;
}

const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 100; // per IP per minute

// Auto-clean old IP entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap.entries()) {
    if (!entry.requests.some((time) => now - time < WINDOW_MS)) {
      rateLimitMap.delete(ip);
    }
  }
}, 600_000);

function getClientIP(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0].trim();
  }
  return (
    req.body?.ip ||
    req.connection.remoteAddress ||
    "unknown"
  );
}

export default async function handler(req: Request, res: Response) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ success: false, message: "Method not allowed" });
  }

  try {
    const { endpoint } = req.body || {};
    const userIP = getClientIP(req);

    if (!endpoint) {
      return res
        .status(400)
        .json({ success: false, message: "Missing endpoint" });
    }

    const now = Date.now();

    let entry = rateLimitMap.get(userIP);
    if (!entry) {
      entry = { requests: [], blocked: false };
      rateLimitMap.set(userIP, entry);
    }

    // Remove requests older than the window
    entry.requests = entry.requests.filter((time) => now - time < WINDOW_MS);

    // Already blocked?
    if (entry.blocked) {
      const retryAfter = Math.ceil(
        (entry.requests[0] + WINDOW_MS - now) / 1000
      );
      return res.status(429).json({
        success: false,
        message: "Rate limit exceeded",
        blocked: true,
        retryAfter: retryAfter > 0 ? retryAfter : 60,
      });
    }

    // Record this request
    entry.requests.push(now);

    // Too many requests?
    if (entry.requests.length > MAX_REQUESTS) {
      entry.blocked = true;

      try {
        // Replace with proper logging / DB
        await fetch("http://localhost:3000/api/security-events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "DDoS Attack",
            ip: userIP,
            details: `High request rate: ${entry.requests.length} requests in 1 minute to ${endpoint}`,
          }),
        });
      } catch (err) {
        console.error("Failed to log DDoS attack:", err);
      }

      return res.status(429).json({
        success: false,
        message: "Rate limit exceeded - DDoS detected",
        blocked: true,
        retryAfter: 60,
      });
    }

    // Unblock if window is over
    if (entry.requests.length === 0) {
      entry.blocked = false;
    }

    return res.status(200).json({
      success: true,
      requests: entry.requests.length,
      remaining: MAX_REQUESTS - entry.requests.length,
      resetTime: entry.requests[0] + WINDOW_MS,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Rate limit error:", err);
    return res.status(500).json({
      success: false,
      message: err?.message || "Rate limit check failed",
    });
  }
}
