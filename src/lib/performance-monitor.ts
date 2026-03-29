/**
 * Performance monitoring system for CineMash AI
 * Tracks response times, error rates, and system health metrics
 */

import { NextRequest } from 'next/server';

export interface PerformanceMetrics {
  responseTime: number;
  endpoint: string;
  statusCode: number;
  error?: string;
  userId?: string;
  timestamp: number;
}

export interface SystemHealth {
  database: boolean;
  redis: boolean;
  ai: boolean;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  uptime: number;
  timestamp: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private maxMetrics = 1000; // Keep last 1000 metrics
  
  /**
   * Track a request performance metric
   */
  trackRequest(metric: PerformanceMetrics) {
    this.metrics.push(metric);
    
    // Keep only the latest metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
    
    // Alert on performance issues
    this.checkAlerts(metric);
  }
  
  /**
   * Check for performance alerts
   */
  private checkAlerts(metric: PerformanceMetrics) {
    // Slow response alert
    if (metric.responseTime > 5000) {
      console.warn(`🚨 Slow response alert: ${metric.endpoint} took ${metric.responseTime}ms`);
    }
    
    // Error rate alert
    if (metric.statusCode >= 500) {
      console.error(`🚨 Server error: ${metric.endpoint} returned ${metric.statusCode}`);
    }
    
    // Check overall error rate
    const recentMetrics = this.getRecentMetrics(60000); // Last minute
    const errorRate = recentMetrics.filter(m => m.statusCode >= 400).length / recentMetrics.length;
    
    if (errorRate > 0.05) { // 5% error rate
      console.warn(`🚨 High error rate: ${(errorRate * 100).toFixed(1)}% in last minute`);
    }
  }
  
  /**
   * Get recent metrics within a time window
   */
  getRecentMetrics(timeWindowMs: number): PerformanceMetrics[] {
    const cutoff = Date.now() - timeWindowMs;
    return this.metrics.filter(m => m.timestamp > cutoff);
  }
  
  /**
   * Calculate performance statistics
   */
  getStats(timeWindowMs: number = 300000) { // 5 minutes default
    const recentMetrics = this.getRecentMetrics(timeWindowMs);
    
    if (recentMetrics.length === 0) {
      return {
        totalRequests: 0,
        averageResponseTime: 0,
        errorRate: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
      };
    }
    
    const responseTimes = recentMetrics.map(m => m.responseTime).sort((a, b) => a - b);
    const errorCount = recentMetrics.filter(m => m.statusCode >= 400).length;
    
    return {
      totalRequests: recentMetrics.length,
      averageResponseTime: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
      errorRate: errorCount / recentMetrics.length,
      p95ResponseTime: responseTimes[Math.floor(responseTimes.length * 0.95)],
      p99ResponseTime: responseTimes[Math.floor(responseTimes.length * 0.99)],
    };
  }
  
  /**
   * Check system health
   */
  async checkSystemHealth(): Promise<SystemHealth> {
    const checks = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkAI(),
    ]);
    
    const memUsage = process.memoryUsage();
    
    return {
      database: checks[0].status === 'fulfilled' ? (checks[0].value as boolean) : false,
      redis: checks[1].status === 'fulfilled' ? (checks[1].value as boolean) : false,
      ai: checks[2].status === 'fulfilled' ? (checks[2].value as boolean) : false,
      memory: {
        used: memUsage.heapUsed,
        total: memUsage.heapTotal,
        percentage: (memUsage.heapUsed / memUsage.heapTotal) * 100,
      },
      uptime: process.uptime(),
      timestamp: Date.now(),
    };
  }
  
  /**
   * Check database connectivity
   */
  private async checkDatabase(): Promise<boolean> {
    try {
      // TODO: Implement actual database health check
      // For now, return true as placeholder
      return true;
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Check Redis connectivity
   */
  private async checkRedis(): Promise<boolean> {
    try {
      const { getRedisClient } = await import('@/lib/redis');
      const redis = getRedisClient();
      await redis.ping();
      return true;
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Check AI service connectivity
   */
  private async checkAI(): Promise<boolean> {
    try {
      // TODO: Implement actual AI service health check
      // For now, return true as placeholder
      return true;
    } catch (error) {
      return false;
    }
  }
}

// Global instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * Middleware to track performance
 */
export function withPerformanceTracking(
  handler: (req: NextRequest) => Promise<Response>,
  endpoint: string
) {
  return async (request: NextRequest) => {
    const startTime = Date.now();
    
    try {
      const response = await handler(request);
      
      performanceMonitor.trackRequest({
        responseTime: Date.now() - startTime,
        endpoint,
        statusCode: response.status,
        timestamp: Date.now(),
      });
      
      return response;
    } catch (error) {
      performanceMonitor.trackRequest({
        responseTime: Date.now() - startTime,
        endpoint,
        statusCode: 500,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
      });
      
      throw error;
    }
  };
}
