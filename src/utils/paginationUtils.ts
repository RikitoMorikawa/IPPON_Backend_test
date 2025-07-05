import crypto from 'crypto';

// Interface for token data
export interface TokenData {
  lastIndex: number;
  resourceId: string; // Generic resource ID definition
  [key: string]: any; // Allow additional custom data
}


// Example of actual Redis implementation:
// 
// import { createClient } from 'redis';
// 
// const redisClient = createClient({
//   url: process.env.REDIS_URL || 'redis://localhost:6379'
// });
// 
// redisClient.on('error', (err) => console.error('Redis Client Error', err));
// 
// (async () => {
//   await redisClient.connect();
// })();
//
// const saveTokenToRedis = async (tokenId: string, data: any, ttlSeconds = 3600): Promise<void> => {
//   await redisClient.set(`token:${tokenId}`, JSON.stringify(data), { EX: ttlSeconds });
// };
//
// const getTokenFromRedis = async (tokenId: string): Promise<any | null> => {
//   const data = await redisClient.get(`token:${tokenId}`);
//   return data ? JSON.parse(data) : null;
// };

// Memory store for mock implementation
const tokenStore: Record<string, TokenData> = {};

// Utility functions for token generation and decoding
export const generateToken = (data: TokenData): string => {
  const jsonData = JSON.stringify(data);
  return Buffer.from(jsonData).toString('base64');
};

export const decodeToken = (token: string): TokenData => {
  try {
    const jsonData = Buffer.from(token, 'base64').toString();
    return JSON.parse(jsonData);
  } catch (error) {
    throw new Error('Invalid pagination token');
  }
};

// Pagination utility functions
export const paginationUtils = {
  generateToken,
  decodeToken,
  
  // Function to save token (Redis would be used in actual implementation)
  saveToken: (tokenId: string, data: any, ttlSeconds = 3600): void => {
    tokenStore[tokenId] = data;
    // In actual Redis implementation:
    // await saveTokenToRedis(tokenId, data, ttlSeconds);
  },
  
  // Function to retrieve token
  getToken: (tokenId: string): any | null => {
    return tokenStore[tokenId] || null;
    // In actual Redis implementation:
    // return await getTokenFromRedis(tokenId);
  },
  
  // Generate new token and store it
  createAndStoreToken: (data: TokenData, ttlSeconds = 3600): string => {
    const token = generateToken(data);
    const tokenId = crypto.randomUUID();
    tokenStore[tokenId] = data;
    // In actual Redis implementation:
    // await saveTokenToRedis(tokenId, data, ttlSeconds);
    return token;
  },
  
  // Function to delete token (for Redis implementation)
  // deleteToken: async (tokenId: string): Promise<void> => {
  //   await redisClient.del(`token:${tokenId}`);
  // },
  
  // Function to cleanup expired tokens
  // While Redis TTL handles expiration automatically, this cleanup function is provided as an example
  // cleanupExpiredTokens: async (): Promise<void> => {
  //   // Not needed in actual implementation as Redis TTL settings handle automatic deletion
  //   // Implement here if custom cleanup is required
  // }
};

// Utility functions for token-based pagination
export interface PaginationOptions {
  limit: number;
  next_token?: string;
  prev_token?: string;
  allowedLimits?: number[]; // Allowed limit values
  defaultLimit?: number; // Default limit value
}

export interface PaginationResult<T> {
  items: T[];
  next_token?: string;
  prev_token?: string;
  limit: number;
}

// Collection pagination processing
export function paginateCollection<T>(
  collection: T[],
  options: PaginationOptions,
  resourceId: string
): PaginationResult<T> {
  const {
    limit = 5,
    next_token,
    prev_token,
    allowedLimits = [5, 10, 15, 20]
  } = options;
  
  // Check if limit is valid
  if (!allowedLimits.includes(limit)) {
    throw new Error('Invalid limit parameter');
  }
  
  let startIndex = 0;
  
  // Process next_token
  if (next_token) {
    try {
      const tokenData = decodeToken(next_token);
      if (tokenData.resourceId !== resourceId) {
        throw new Error('Invalid token');
      }
      startIndex = tokenData.lastIndex;
    } catch (error) {
      throw new Error('Invalid pagination token');
    }
  }
  
  // Process prev_token
  if (prev_token) {
    try {
      const tokenData = decodeToken(prev_token);
      if (tokenData.resourceId !== resourceId) {
        throw new Error('Invalid token');
      }
      // Calculate first index of previous page
      startIndex = Math.max(0, tokenData.lastIndex - limit);
    } catch (error) {
      throw new Error('Invalid pagination token');
    }
  }
  
  // Calculate pagination
  const endIndex = Math.min(startIndex + limit, collection.length);
  const paginatedItems = collection.slice(startIndex, endIndex);
  
  // Generate tokens for next and previous pages
  let nextToken: string | undefined;
  let prevToken: string | undefined;
  
  // If there is a next page
  if (endIndex < collection.length) {
    const nextTokenData: TokenData = {
      lastIndex: endIndex,
      resourceId
    };
    nextToken = paginationUtils.createAndStoreToken(nextTokenData);
  }
  
  // If there is a previous page
  if (startIndex > 0) {
    const prevTokenData: TokenData = {
      lastIndex: startIndex,
      resourceId
    };
    prevToken = paginationUtils.createAndStoreToken(prevTokenData);
  }
  
  return {
    items: paginatedItems,
    next_token: nextToken,
    prev_token: prevToken,
    limit
  };
}

// Important considerations for production environment:
// 1. Redis connection failover handling
// 2. Redis clustering across multiple servers
// 3. Memory usage monitoring and token TTL optimization
// 4. Security (data encryption and access control)