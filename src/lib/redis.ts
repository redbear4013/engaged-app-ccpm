import Redis, { type RedisOptions } from 'ioredis'
import { SCRAPING_CONFIG } from '@/config/scraping'

class RedisConnection {
  private static instance: Redis | null = null
  private static connecting = false

  static async getInstance(): Promise<Redis> {
    if (this.instance && this.instance.status === 'ready') {
      return this.instance
    }

    if (this.connecting) {
      // Wait for connection to complete
      while (this.connecting) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      if (this.instance) return this.instance
    }

    this.connecting = true

    try {
      const config: RedisOptions = {
        host: SCRAPING_CONFIG.queue.redis.host,
        port: SCRAPING_CONFIG.queue.redis.port,
        password: SCRAPING_CONFIG.queue.redis.password,
        db: SCRAPING_CONFIG.queue.redis.db,
        maxRetriesPerRequest: 3,
        retryDelayOnFailover: 100,
        enableReadyCheck: true,
        connectTimeout: 10000,
        lazyConnect: true,
      }

      this.instance = new Redis(config)

      // Handle connection events
      this.instance.on('connect', () => {
        console.log('Redis connected')
      })

      this.instance.on('ready', () => {
        console.log('Redis ready')
        this.connecting = false
      })

      this.instance.on('error', (error) => {
        console.error('Redis connection error:', error)
        this.connecting = false
      })

      this.instance.on('close', () => {
        console.log('Redis connection closed')
      })

      this.instance.on('reconnecting', () => {
        console.log('Redis reconnecting...')
      })

      // Connect explicitly
      await this.instance.connect()

      return this.instance
    } catch (error) {
      this.connecting = false
      console.error('Failed to connect to Redis:', error)
      throw error
    }
  }

  static async disconnect(): Promise<void> {
    if (this.instance) {
      await this.instance.quit()
      this.instance = null
    }
  }

  static isConnected(): boolean {
    return this.instance?.status === 'ready'
  }
}

export default RedisConnection

// Export a singleton instance for use across the app
export const getRedis = () => RedisConnection.getInstance()
export const disconnectRedis = () => RedisConnection.disconnect()
export const isRedisConnected = () => RedisConnection.isConnected()