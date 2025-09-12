/**
 * Worker pool for CPU-intensive operations
 * Manages a pool of worker threads for parallel processing
 */
export class WorkerPool {
  private maxWorkers: number;
  private availableWorkers: number;
  private queue: Array<() => void> = [];

  constructor(maxWorkers: number) {
    this.maxWorkers = maxWorkers;
    this.availableWorkers = maxWorkers;
  }

  /**
   * Execute a task when a worker becomes available
   */
  async execute<T>(task: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const wrappedTask = async () => {
        try {
          this.availableWorkers--;
          const result = await task();
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          this.availableWorkers++;
          this.processQueue();
        }
      };

      if (this.availableWorkers > 0) {
        wrappedTask();
      } else {
        this.queue.push(wrappedTask);
      }
    });
  }

  /**
   * Process queued tasks
   */
  private processQueue(): void {
    if (this.queue.length > 0 && this.availableWorkers > 0) {
      const task = this.queue.shift();
      if (task) {
        task();
      }
    }
  }

  /**
   * Get current worker status
   */
  getStatus(): { available: number; busy: number; queued: number } {
    return {
      available: this.availableWorkers,
      busy: this.maxWorkers - this.availableWorkers,
      queued: this.queue.length
    };
  }

  /**
   * Terminate all workers
   */
  async terminate(): Promise<void> {
    // Wait for all current tasks to complete
    while (this.availableWorkers < this.maxWorkers) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Clear any remaining queue
    this.queue.length = 0;
  }
}