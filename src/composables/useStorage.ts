import { ref } from 'vue'
import type { Project, ProjectMeta } from '@/types/project'

const DB_NAME = 'PixelMusicDB'
const DB_VERSION = 1
const PROJECTS_STORE = 'projects'

export function useStorage() {
  const isReady = ref(false)
  const error = ref<Error | null>(null)
  let db: IDBDatabase | null = null

  /**
   * Open the IndexedDB database
   */
  async function openDB(): Promise<IDBDatabase> {
    if (db) return db

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => {
        error.value = request.error
        reject(request.error)
      }

      request.onsuccess = () => {
        db = request.result
        isReady.value = true
        resolve(db)
      }

      request.onupgradeneeded = (event) => {
        const database = (event.target as IDBOpenDBRequest).result

        // Create projects store
        if (!database.objectStoreNames.contains(PROJECTS_STORE)) {
          const store = database.createObjectStore(PROJECTS_STORE, { keyPath: 'id' })
          store.createIndex('name', 'name', { unique: false })
          store.createIndex('updatedAt', 'updatedAt', { unique: false })
        }
      }
    })
  }

  /**
   * Save a project to IndexedDB
   */
  async function saveProject(project: Project): Promise<void> {
    const database = await openDB()

    return new Promise((resolve, reject) => {
      const transaction = database.transaction([PROJECTS_STORE], 'readwrite')
      const store = transaction.objectStore(PROJECTS_STORE)

      const projectWithMeta = {
        ...project,
        updatedAt: new Date().toISOString(),
      }

      const request = store.put(projectWithMeta)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Load a project from IndexedDB
   */
  async function loadProject(id: string): Promise<Project | null> {
    const database = await openDB()

    return new Promise((resolve, reject) => {
      const transaction = database.transaction([PROJECTS_STORE], 'readonly')
      const store = transaction.objectStore(PROJECTS_STORE)
      const request = store.get(id)

      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * List all projects (metadata only)
   */
  async function listProjects(): Promise<ProjectMeta[]> {
    const database = await openDB()

    return new Promise((resolve, reject) => {
      const transaction = database.transaction([PROJECTS_STORE], 'readonly')
      const store = transaction.objectStore(PROJECTS_STORE)
      const request = store.getAll()

      request.onsuccess = () => {
        const projects = request.result.map((p: Project & { updatedAt: string }) => ({
          id: p.id,
          name: p.name,
          tempo: p.tempo,
          updatedAt: p.updatedAt,
        }))
        // Sort by most recent first
        projects.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        resolve(projects)
      }
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Delete a project from IndexedDB
   */
  async function deleteProject(id: string): Promise<void> {
    const database = await openDB()

    return new Promise((resolve, reject) => {
      const transaction = database.transaction([PROJECTS_STORE], 'readwrite')
      const store = transaction.objectStore(PROJECTS_STORE)
      const request = store.delete(id)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Save project to localStorage for quick access
   */
  function saveToLocalStorage(key: string, data: unknown): void {
    try {
      localStorage.setItem(key, JSON.stringify(data))
    } catch (e) {
      console.error('Failed to save to localStorage:', e)
    }
  }

  /**
   * Load from localStorage
   */
  function loadFromLocalStorage<T>(key: string): T | null {
    try {
      const data = localStorage.getItem(key)
      return data ? JSON.parse(data) : null
    } catch (e) {
      console.error('Failed to load from localStorage:', e)
      return null
    }
  }

  /**
   * Save user preferences
   */
  function savePreferences(prefs: Record<string, unknown>): void {
    saveToLocalStorage('pixelmusic_prefs', prefs)
  }

  /**
   * Load user preferences
   */
  function loadPreferences(): Record<string, unknown> {
    return loadFromLocalStorage('pixelmusic_prefs') || {}
  }

  return {
    isReady,
    error,
    openDB,
    saveProject,
    loadProject,
    listProjects,
    deleteProject,
    saveToLocalStorage,
    loadFromLocalStorage,
    savePreferences,
    loadPreferences,
  }
}
