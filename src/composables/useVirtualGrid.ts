/**
 * PHASE 3 OPTIMIZATION: Virtual Grid Scrolling
 *
 * Only renders cells visible in viewport + buffer.
 * Reduces DOM nodes from ~16,000 to ~300-400.
 */

import { ref, computed, onMounted, onUnmounted, type Ref } from 'vue'

interface VirtualGridConfig {
  cellWidth: number
  cellHeight: number
  totalRows: number
  totalCols: number
  bufferRows?: number
  bufferCols?: number
}

export interface VirtualCell {
  row: number
  col: number
  key: string
}

export function useVirtualGrid(
  containerRef: Ref<HTMLElement | null>,
  config: Ref<VirtualGridConfig>
) {
  const scrollLeft = ref(0)
  const scrollTop = ref(0)
  const containerWidth = ref(800)
  const containerHeight = ref(600)

  // Calculate visible range with buffer
  const visibleRange = computed(() => {
    const {
      cellWidth,
      cellHeight,
      totalRows,
      totalCols,
      bufferRows = 3,
      bufferCols = 5
    } = config.value

    if (cellWidth === 0 || cellHeight === 0) {
      return { startRow: 0, endRow: 0, startCol: 0, endCol: 0 }
    }

    const startCol = Math.max(0, Math.floor(scrollLeft.value / cellWidth) - bufferCols)
    const endCol = Math.min(totalCols, Math.ceil((scrollLeft.value + containerWidth.value) / cellWidth) + bufferCols)
    const startRow = Math.max(0, Math.floor(scrollTop.value / cellHeight) - bufferRows)
    const endRow = Math.min(totalRows, Math.ceil((scrollTop.value + containerHeight.value) / cellHeight) + bufferRows)

    return { startRow, endRow, startCol, endCol }
  })

  // Generate visible cells array
  const visibleCells = computed((): VirtualCell[] => {
    const { startRow, endRow, startCol, endCol } = visibleRange.value
    const cells: VirtualCell[] = []

    for (let row = startRow; row < endRow; row++) {
      for (let col = startCol; col < endCol; col++) {
        cells.push({ row, col, key: `${row}-${col}` })
      }
    }

    return cells
  })

  // Total content size for scroll area
  const totalSize = computed(() => ({
    width: config.value.totalCols * config.value.cellWidth,
    height: config.value.totalRows * config.value.cellHeight,
  }))

  // Scroll handler with throttling via rAF
  let rafId: number | null = null

  const handleScroll = () => {
    if (rafId !== null) return

    rafId = requestAnimationFrame(() => {
      const el = containerRef.value
      if (el) {
        scrollLeft.value = el.scrollLeft
        scrollTop.value = el.scrollTop
      }
      rafId = null
    })
  }

  // Resize observer for container dimensions
  let resizeObserver: ResizeObserver | null = null

  onMounted(() => {
    const el = containerRef.value
    if (el) {
      containerWidth.value = el.clientWidth
      containerHeight.value = el.clientHeight
      scrollLeft.value = el.scrollLeft
      scrollTop.value = el.scrollTop

      el.addEventListener('scroll', handleScroll, { passive: true })

      resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          containerWidth.value = entry.contentRect.width
          containerHeight.value = entry.contentRect.height
        }
      })
      resizeObserver.observe(el)
    }
  })

  onUnmounted(() => {
    const el = containerRef.value
    if (el) {
      el.removeEventListener('scroll', handleScroll)
    }
    resizeObserver?.disconnect()
    if (rafId !== null) cancelAnimationFrame(rafId)
  })

  return {
    visibleRange,
    visibleCells,
    totalSize,
    scrollLeft,
    scrollTop,
    containerWidth,
    containerHeight,
  }
}
