interface SecurityLogEntry {
  timestamp: string;
  eventType: 'unauthorized_access' | 'suspicious_behavior' | 'access_denied' | 'route_manipulation';
  userId?: string;
  userRole?: string;
  attemptedPath: string;
  userAgent: string;
  referrer: string;
  ipAddress?: string;
  details: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  sessionId?: string;
  browserFingerprint?: string;
}

class SecurityLogger {
  private static instance: SecurityLogger;
  private logs: SecurityLogEntry[] = [];
  private maxLogs = 500; // Reduced for better performance
  private suspiciousPatterns: Map<string, number> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private isInitialized = false;

  private constructor() {
    this.initialize();
  }

  public static getInstance(): SecurityLogger {
    if (!SecurityLogger.instance) {
      SecurityLogger.instance = new SecurityLogger();
    }
    return SecurityLogger.instance;
  }

  private initialize(): void {
    if (this.isInitialized) return;
    
    // Setup periodic cleanup
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldLogs();
    }, 30 * 60 * 1000); // Every 30 minutes instead of every hour
    
    this.isInitialized = true;
  }

  /**
   * Optimized unauthorized access logging
   */
  public logUnauthorizedAccess(data: {
    userId?: string;
    userRole?: string;
    attemptedPath: string;
    details: string;
    severity?: 'low' | 'medium' | 'high' | 'critical';
  }): void {
    const logEntry: SecurityLogEntry = {
      timestamp: new Date().toISOString(),
      eventType: 'unauthorized_access',
      userId: data.userId,
      userRole: data.userRole,
      attemptedPath: data.attemptedPath,
      userAgent: navigator.userAgent,
      referrer: document.referrer,
      details: data.details,
      severity: data.severity || 'medium',
      sessionId: this.getSessionId(),
      browserFingerprint: this.generateBrowserFingerprint()
    };

    this.addLog(logEntry);
    this.checkForSuspiciousPatterns(logEntry);
  }

  /**
   * Optimized suspicious behavior logging
   */
  public logSuspiciousBehavior(data: {
    userId?: string;
    userRole?: string;
    attemptedPath: string;
    details: string;
    behaviorType: string;
    severity?: 'low' | 'medium' | 'high' | 'critical';
  }): void {
    const logEntry: SecurityLogEntry = {
      timestamp: new Date().toISOString(),
      eventType: 'suspicious_behavior',
      userId: data.userId,
      userRole: data.userRole,
      attemptedPath: data.attemptedPath,
      userAgent: navigator.userAgent,
      referrer: document.referrer,
      details: `${data.behaviorType}: ${data.details}`,
      severity: data.severity || 'high',
      sessionId: this.getSessionId(),
      browserFingerprint: this.generateBrowserFingerprint()
    };

    this.addLog(logEntry);
    this.checkForSuspiciousPatterns(logEntry);
  }

  /**
   * Optimized route manipulation logging
   */
  public logRouteManipulation(data: {
    userId?: string;
    userRole?: string;
    fromPath: string;
    toPath: string;
    details: string;
  }): void {
    const logEntry: SecurityLogEntry = {
      timestamp: new Date().toISOString(),
      eventType: 'route_manipulation',
      userId: data.userId,
      userRole: data.userRole,
      attemptedPath: `${data.fromPath} -> ${data.toPath}`,
      userAgent: navigator.userAgent,
      referrer: document.referrer,
      details: data.details,
      severity: 'high',
      sessionId: this.getSessionId(),
      browserFingerprint: this.generateBrowserFingerprint()
    };

    this.addLog(logEntry);
  }

  /**
   * Get recent security logs with optimized filtering
   */
  public getRecentLogs(limit: number = 50): SecurityLogEntry[] {
    return this.logs.slice(-Math.min(limit, this.logs.length));
  }

  /**
   * Get logs by severity with optimized filtering
   */
  public getLogsBySeverity(severity: 'low' | 'medium' | 'high' | 'critical'): SecurityLogEntry[] {
    return this.logs.filter(log => log.severity === severity);
  }

  /**
   * Optimized suspicious activity summary
   */
  public getSuspiciousActivitySummary(): {
    totalAttempts: number;
    highSeverityAttempts: number;
    uniqueUsers: number;
    uniqueIPs: number;
    recentActivity: SecurityLogEntry[];
  } {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    
    // Use more efficient filtering
    const recentLogs = this.logs.filter(log => {
      const logTime = new Date(log.timestamp).getTime();
      return logTime > oneHourAgo;
    });

    // Use Set for unique counting (more efficient)
    const uniqueUsers = new Set(recentLogs.map(log => log.userId).filter(Boolean)).size;
    const highSeverityAttempts = recentLogs.filter(log => 
      log.severity === 'high' || log.severity === 'critical'
    ).length;

    return {
      totalAttempts: recentLogs.length,
      highSeverityAttempts,
      uniqueUsers,
      uniqueIPs: 0, // Would be calculated server-side
      recentActivity: recentLogs.slice(-10)
    };
  }

  /**
   * Export logs for analysis
   */
  public exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * Clear logs (for testing purposes)
   */
  public clearLogs(): void {
    this.logs = [];
    this.suspiciousPatterns.clear();
  }

  /**
   * Optimized log addition with better memory management
   */
  private addLog(logEntry: SecurityLogEntry): void {
    this.logs.push(logEntry);
    
    // Keep only the last maxLogs entries (more efficient than slice)
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Only log to console in development and for high severity events
    if (process.env.NODE_ENV === 'development' && logEntry.severity === 'high') {
      console.group(`🔒 Security Log: ${logEntry.eventType}`);
      console.log('Timestamp:', logEntry.timestamp);
      console.log('Severity:', logEntry.severity);
      console.log('User:', logEntry.userId || 'Anonymous');
      console.log('Role:', logEntry.userRole || 'None');
      console.log('Path:', logEntry.attemptedPath);
      console.log('Details:', logEntry.details);
      console.groupEnd();
    }

    // In production, you would send this to your logging service
    // Example: this.sendToLoggingService(logEntry);
  }

  /**
   * Optimized suspicious pattern detection
   */
  private checkForSuspiciousPatterns(logEntry: SecurityLogEntry): void {
    const key = `${logEntry.userId || 'anonymous'}-${logEntry.attemptedPath}`;
    const currentCount = this.suspiciousPatterns.get(key) || 0;
    this.suspiciousPatterns.set(key, currentCount + 1);

    // If the same user attempts the same path multiple times, it's suspicious
    if (currentCount + 1 >= 3) { // Reduced threshold for better accuracy
      this.logSuspiciousBehavior({
        userId: logEntry.userId,
        userRole: logEntry.userRole,
        attemptedPath: logEntry.attemptedPath,
        details: `Repeated access attempts (${currentCount + 1} times)`,
        behaviorType: 'repeated_attempts',
        severity: 'high'
      });
    }
  }

  /**
   * Optimized session ID generation
   */
  private getSessionId(): string {
    // Use a more efficient session ID generation
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }

  /**
   * Optimized browser fingerprint generation
   */
  private generateBrowserFingerprint(): string {
    // Simplified fingerprint for better performance
    const fingerprint = [
      navigator.userAgent.substring(0, 50), // Truncate for performance
      navigator.language,
      screen.width,
      screen.height
    ].join('|');
    
    return btoa(fingerprint).substr(0, 12); // Shorter fingerprint
  }

  /**
   * Optimized cleanup with better memory management
   */
  private cleanupOldLogs(): void {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    
    // More efficient filtering
    this.logs = this.logs.filter(log => {
      const logTime = new Date(log.timestamp).getTime();
      return logTime > oneHourAgo;
    });
    
    // Clean up suspicious patterns
    this.suspiciousPatterns.clear();
  }

  /**
   * Cleanup method for proper resource management
   */
  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.logs = [];
    this.suspiciousPatterns.clear();
    this.isInitialized = false;
  }

  // Placeholder for production logging service
  private async sendToLoggingService(logEntry: SecurityLogEntry): Promise<void> {
    try {
      // In production, you would send this to your logging service
      // Example: await fetch('/api/security/log', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(logEntry)
      // });
      
      console.log('Security log sent to service:', logEntry);
    } catch (error) {
      console.error('Failed to send security log:', error);
    }
  }
}

export default SecurityLogger; 