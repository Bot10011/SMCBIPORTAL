// Rate limiting and DDoS detection API
const rateLimitMap = new Map<string, { requests: number[]; blocked: boolean }>();

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

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { ip, endpoint } = req.body || {};
    const userIP = ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
    
    if (!endpoint) {
      return res.status(400).json({ success: false, message: 'Missing endpoint' });
    }

    const now = Date.now();
    const windowMs = 60000; // 1 minute
    const maxRequests = 100; // Max requests per minute
    
    // Get or create rate limit entry
    let entry = rateLimitMap.get(userIP);
    if (!entry) {
      entry = { requests: [], blocked: false };
      rateLimitMap.set(userIP, entry);
    }

    // Clean old requests outside the window
    entry.requests = entry.requests.filter(time => now - time < windowMs);

    // Check if already blocked
    if (entry.blocked) {
      return res.status(429).json({ 
        success: false, 
        message: 'Rate limit exceeded', 
        blocked: true,
        retryAfter: Math.ceil((entry.requests[0] + windowMs - now) / 1000)
      });
    }

    // Add current request
    entry.requests.push(now);

    // Check if rate limit exceeded
    if (entry.requests.length > maxRequests) {
      entry.blocked = true;
      
      // Log DDoS attack
      try {
        await fetch('/api/security-events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'DDoS Attack',
            ip: userIP,
            details: `High request rate detected: ${entry.requests.length} requests in 1 minute to ${endpoint}`
          })
        });
      } catch (error) {
        console.error('Failed to log DDoS attack:', error);
      }

      return res.status(429).json({ 
        success: false, 
        message: 'Rate limit exceeded - DDoS attack detected', 
        blocked: true,
        retryAfter: 60
      });
    }

    // Reset blocked status if requests are within limit
    if (entry.requests.length <= maxRequests * 0.8) {
      entry.blocked = false;
    }

    return res.status(200).json({ 
      success: true, 
      requests: entry.requests.length,
      remaining: maxRequests - entry.requests.length,
      resetTime: entry.requests[0] + windowMs
    });

  } catch (error: unknown) {
    const err = error as Error;
    console.error('Rate limit error:', err);
    return res.status(500).json({ 
      success: false, 
      message: err?.message || 'Rate limit check failed' 
    });
  }
}
