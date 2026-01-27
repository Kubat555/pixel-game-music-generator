<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useTransportStore } from '@/stores/useTransportStore'
import { AudioEngine } from '@/audio/AudioEngine'

const props = defineProps<{
  type?: 'waveform' | 'bars'
  height?: number
}>()

const transportStore = useTransportStore()
const { isPlaying } = storeToRefs(transportStore)

const canvas = ref<HTMLCanvasElement | null>(null)
const analyser = ref<AnalyserNode | null>(null)
const dataArray = ref<Uint8Array | null>(null)
const animationId = ref<number | null>(null)

const canvasHeight = props.height || 60
const visualType = props.type || 'bars'

// Colors for pixel art style
const colors = {
  background: '#0F0F0F',
  bars: ['#00A800', '#80D010', '#FCC400', '#FC7400', '#D82800'],
  waveform: '#00A8A8',
  grid: '#323232',
}

function initAnalyser() {
  try {
    const engine = AudioEngine.getInstance()
    const context = engine.getContext()
    if (!context || !engine.getIsInitialized()) return

    analyser.value = context.createAnalyser()
    analyser.value.fftSize = 256
    analyser.value.smoothingTimeConstant = 0.7

    const bufferLength = analyser.value.frequencyBinCount
    dataArray.value = new Uint8Array(bufferLength)

    // Connect analyser to audio chain via proper accessor
    const connectionPoint = engine.getAnalyserConnectionPoint()
    if (connectionPoint) {
      connectionPoint.connect(analyser.value)
    }
  } catch (e) {
    console.error('Failed to initialize analyser:', e)
  }
}

function drawWaveform() {
  if (!canvas.value || !analyser.value || !dataArray.value) return

  const ctx = canvas.value.getContext('2d')
  if (!ctx) return

  analyser.value.getByteTimeDomainData(dataArray.value)

  const width = canvas.value.width
  const height = canvas.value.height

  // Clear
  ctx.fillStyle = colors.background
  ctx.fillRect(0, 0, width, height)

  // Draw center line
  ctx.strokeStyle = colors.grid
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(0, height / 2)
  ctx.lineTo(width, height / 2)
  ctx.stroke()

  // Draw waveform
  ctx.strokeStyle = colors.waveform
  ctx.lineWidth = 2
  ctx.beginPath()

  const sliceWidth = width / dataArray.value.length
  let x = 0

  for (let i = 0; i < dataArray.value.length; i++) {
    const v = dataArray.value[i] / 128.0
    const y = (v * height) / 2

    if (i === 0) {
      ctx.moveTo(x, y)
    } else {
      ctx.lineTo(x, y)
    }

    x += sliceWidth
  }

  ctx.lineTo(width, height / 2)
  ctx.stroke()
}

function drawBars() {
  if (!canvas.value || !analyser.value || !dataArray.value) return

  const ctx = canvas.value.getContext('2d')
  if (!ctx) return

  analyser.value.getByteFrequencyData(dataArray.value)

  const width = canvas.value.width
  const height = canvas.value.height

  // Clear
  ctx.fillStyle = colors.background
  ctx.fillRect(0, 0, width, height)

  // Calculate bar dimensions
  const barCount = 16 // Pixel-style with fewer bars
  const barWidth = Math.floor(width / barCount) - 2
  const gap = 2

  for (let i = 0; i < barCount; i++) {
    // Sample from frequency data
    const dataIndex = Math.floor((i / barCount) * dataArray.value.length * 0.5)
    const value = dataArray.value[dataIndex]
    const barHeight = (value / 255) * height

    // Choose color based on height
    const colorIndex = Math.min(Math.floor((value / 255) * colors.bars.length), colors.bars.length - 1)
    ctx.fillStyle = colors.bars[colorIndex]

    // Draw pixelated bar (multiple rectangles)
    const x = i * (barWidth + gap)
    const segments = Math.floor(barHeight / 4)

    for (let s = 0; s < segments; s++) {
      const segmentY = height - (s + 1) * 4
      const segmentColorIndex = Math.min(Math.floor((s / (height / 4)) * colors.bars.length), colors.bars.length - 1)
      ctx.fillStyle = colors.bars[segmentColorIndex]
      ctx.fillRect(x, segmentY, barWidth, 3)
    }
  }
}

function draw() {
  if (visualType === 'waveform') {
    drawWaveform()
  } else {
    drawBars()
  }

  if (isPlaying.value) {
    animationId.value = requestAnimationFrame(draw)
  }
}

function startVisualization() {
  if (!analyser.value) {
    initAnalyser()
  }
  draw()
}

function stopVisualization() {
  if (animationId.value) {
    cancelAnimationFrame(animationId.value)
    animationId.value = null
  }

  // Draw empty state
  if (canvas.value) {
    const ctx = canvas.value.getContext('2d')
    if (ctx) {
      ctx.fillStyle = colors.background
      ctx.fillRect(0, 0, canvas.value.width, canvas.value.height)

      // Draw center line for waveform
      if (visualType === 'waveform') {
        ctx.strokeStyle = colors.grid
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(0, canvas.value.height / 2)
        ctx.lineTo(canvas.value.width, canvas.value.height / 2)
        ctx.stroke()
      }
    }
  }
}

watch(isPlaying, (playing) => {
  if (playing) {
    startVisualization()
  } else {
    stopVisualization()
  }
})

onMounted(() => {
  if (canvas.value) {
    // Set canvas size
    canvas.value.width = canvas.value.offsetWidth
    canvas.value.height = canvasHeight
  }
  stopVisualization() // Draw initial state
})

onUnmounted(() => {
  if (animationId.value) {
    cancelAnimationFrame(animationId.value)
  }
})
</script>

<template>
  <div class="visualizer-container">
    <canvas
      ref="canvas"
      class="w-full border-2 border-chip-gray"
      :style="{ height: `${canvasHeight}px` }"
    />
  </div>
</template>

<style scoped>
.visualizer-container {
  image-rendering: pixelated;
  image-rendering: crisp-edges;
}

canvas {
  image-rendering: pixelated;
  image-rendering: crisp-edges;
}
</style>
