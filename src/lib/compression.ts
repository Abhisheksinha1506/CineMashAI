import { NextRequest, NextResponse } from 'next/server';
import { gzip, gunzip } from 'node:zlib';
import { promisify } from 'util';

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

interface CompressionConfig {
  enabled: boolean;
  threshold: number; // Minimum response size to compress (bytes)
  level: number; // Compression level (1-9)
  contentType: string[]; // Content types to compress
}

const COMPRESSION_CONFIG: CompressionConfig = {
  enabled: process.env.NODE_ENV === 'production',
  threshold: 1024, // Compress responses larger than 1KB
  level: 6, // Balanced compression level
  contentType: [
    'application/json',
    'text/plain',
    'text/html',
    'text/css',
    'text/javascript',
    'application/javascript',
  ],
};

/**
 * Check if response should be compressed
 */
function shouldCompress(contentType: string, size: number): boolean {
  if (!COMPRESSION_CONFIG.enabled) return false;
  if (size < COMPRESSION_CONFIG.threshold) return false;
  
  return COMPRESSION_CONFIG.contentType.some(type => 
    contentType.toLowerCase().includes(type.toLowerCase())
  );
}

/**
 * Compress response data
 */
async function compressResponse(data: string): Promise<Buffer> {
  try {
    return await gzipAsync(Buffer.from(data), { level: COMPRESSION_CONFIG.level });
  } catch (error) {
    console.warn('[Compression] Failed to compress response:', error);
    throw error;
  }
}

/**
 * Create compressed response
 */
function createCompressedResponse(
  compressedData: Buffer,
  originalResponse: NextResponse,
  originalSize: number
): NextResponse {
  const compressedSize = compressedData.length;
  const compressionRatio = ((originalSize - compressedSize) / originalSize * 100).toFixed(1);
  
  // Convert Buffer to Uint8Array for NextResponse
  const body = new Uint8Array(compressedData);
  
  // Clone the original response
  const response = new NextResponse(body, {
    status: originalResponse.status,
    statusText: originalResponse.statusText,
    headers: originalResponse.headers,
  });
  
  // Set compression headers
  response.headers.set('Content-Encoding', 'gzip');
  response.headers.set('Content-Length', compressedSize.toString());
  response.headers.set('X-Compression-Ratio', compressionRatio);
  response.headers.set('X-Original-Size', originalSize.toString());
  response.headers.set('X-Compressed-Size', compressedSize.toString());
  response.headers.set('Vary', 'Accept-Encoding');
  
  return response;
}

/**
 * Middleware to compress API responses
 */
export async function withCompression(
  handler: (request: NextRequest) => Promise<NextResponse>
): Promise<(request: NextRequest) => Promise<NextResponse>> {
  return async (request: NextRequest): Promise<NextResponse> => {
    const startTime = Date.now();
    
    try {
      // Execute the original handler
      const response = await handler(request);
      
      // Check if client supports gzip
      const acceptEncoding = request.headers.get('accept-encoding') || '';
      if (!acceptEncoding.includes('gzip')) {
        return response;
      }
      
      // Get response data
      const responseClone = response.clone();
      const contentType = response.headers.get('content-type') || '';
      const contentLength = response.headers.get('content-length');
      
      // Only compress if we can determine the size
      if (!contentLength) {
        return response;
      }
      
      const size = parseInt(contentLength, 10);
      
      // Check if response should be compressed
      if (!shouldCompress(contentType, size)) {
        return response;
      }
      
      try {
        // Get response body as text
        const responseText = await responseClone.text();
        
        // Compress the response
        const compressedData = await compressResponse(responseText);
        
        // Create compressed response
        const compressedResponse = createCompressedResponse(
          compressedData,
          response,
          size
        );
        
        const compressionTime = Date.now() - startTime;
        console.log(`[Compression] Compressed ${size} bytes to ${compressedData.length} bytes (${((size - compressedData.length) / size * 100).toFixed(1)}% reduction) in ${compressionTime}ms`);
        
        return compressedResponse;
      } catch (compressionError) {
        console.warn('[Compression] Failed to compress response, returning original:', compressionError);
        return response;
      }
    } catch (error) {
      console.error('[Compression] Middleware error:', error);
      throw error;
    }
  };
}

/**
 * Helper function to manually compress large JSON responses
 */
export async function compressJSON(data: any): Promise<NextResponse> {
  const jsonString = JSON.stringify(data);
  const buffer = Buffer.from(jsonString);
  
  if (buffer.length < COMPRESSION_CONFIG.threshold) {
    return NextResponse.json(data);
  }
  
  try {
    const compressed = await gzipAsync(buffer, { level: COMPRESSION_CONFIG.level });
    const response = new NextResponse(new Uint8Array(compressed));
    
    response.headers.set('Content-Encoding', 'gzip');
    response.headers.set('Content-Type', 'application/json');
    response.headers.set('Content-Length', compressed.length.toString());
    response.headers.set('X-Compression-Ratio', ((buffer.length - compressed.length) / buffer.length * 100).toFixed(1));
    response.headers.set('Vary', 'Accept-Encoding');
    
    return response;
  } catch (error) {
    console.warn('[Compression] Failed to compress JSON, falling back to regular response:', error);
    return NextResponse.json(data);
  }
}

/**
 * Check if request supports compression
 */
export function supportsCompression(request: NextRequest): boolean {
  const acceptEncoding = request.headers.get('accept-encoding') || '';
  return acceptEncoding.includes('gzip');
}

/**
 * Get compression statistics
 */
export function getCompressionStats(): {
  enabled: boolean;
  threshold: number;
  level: number;
  supportedTypes: string[];
} {
  return {
    enabled: COMPRESSION_CONFIG.enabled,
    threshold: COMPRESSION_CONFIG.threshold,
    level: COMPRESSION_CONFIG.level,
    supportedTypes: COMPRESSION_CONFIG.contentType,
  };
}
