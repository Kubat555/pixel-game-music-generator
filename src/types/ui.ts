export type UIMode = 'beginner' | 'advanced'

export type EditTool = 'pencil' | 'eraser' | 'select'

export interface GridCell {
  trackId: string
  beat: number
  pitch: number
}

export interface TutorialStep {
  id: string
  title: string
  description: string
  targetSelector?: string
  action?: 'click' | 'drag' | 'play'
  nextTrigger?: 'click' | 'play' | 'note-added'
}

export interface Notification {
  id: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  duration?: number
}
