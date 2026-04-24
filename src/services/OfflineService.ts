import { openDB } from "idb";

const DB_NAME = 'solaris_offline_db';
const DB_VERSION = 1;

interface SyncTask {
  id: string;
  type: 'avanzar' | 'agendar' | 'cancelar' | 'incidente' | 'upload_file';
  payload: any;
  timestamp: number;
}

class OfflineService {
  private dbPromise: Promise<any> | null = null;

  init() {
    if (!this.dbPromise) {
      this.dbPromise = openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
          if (!db.objectStoreNames.contains('cache')) {
            db.createObjectStore('cache');
          }
          if (!db.objectStoreNames.contains('sync_queue')) {
            db.createObjectStore('sync_queue', { keyPath: 'id' });
          }
        },
      });
    }
    return this.dbPromise;
  }

  // --- CACHE HANDLING ---
  async setCache(key: string, data: any) {
    const db = await this.init();
    await db.put('cache', data, key);
  }

  async getCache(key: string) {
    const db = await this.init();
    return await db.get('cache', key);
  }

  // --- SYNC QUEUE HANDLING ---
  async addSyncTask(type: SyncTask['type'], payload: any) {
    const db = await this.init();
    const task: SyncTask = {
      id: `${Date.now()}_${Math.random().toString(36).substring(7)}`,
      type,
      payload,
      timestamp: Date.now()
    };
    await db.add('sync_queue', task);
    return task.id;
  }

  async getPendingTasks(): Promise<SyncTask[]> {
    const db = await this.init();
    const tasks = await db.getAll('sync_queue');
    return tasks.sort((a: SyncTask, b: SyncTask) => a.timestamp - b.timestamp);
  }

  async removeTask(id: string) {
    const db = await this.init();
    await db.delete('sync_queue', id);
  }

  // --- UTILS ---
  isOnline() {
    return navigator.onLine;
  }
}

export const offlineService = new OfflineService();
