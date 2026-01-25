# Pixel Game Music Generator

A browser-based 8-bit chiptune music creator for pixel-art games. Create retro game soundtracks with no music experience required!

![Vue.js](https://img.shields.io/badge/Vue.js-3.x-4FC08D?style=flat-square&logo=vue.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.x-06B6D4?style=flat-square&logo=tailwindcss)
![Web Audio API](https://img.shields.io/badge/Web%20Audio-API-FF6B6B?style=flat-square)

## Features

### Audio Engine
- **Classic Waveforms**: Square, Triangle, Sawtooth, Pulse, and Noise
- **ADSR Envelopes**: Attack, Decay, Sustain, Release controls
- **Audio Effects**: Arpeggiator, Vibrato, Glide, Bitcrusher
- **Precise Timing**: Look-ahead scheduler for game-loop quality audio

### Sequencer
- **4-Track System**: Lead, Bass, Harmony, and Drums
- **Piano Roll Grid**: Click to add notes, visual feedback
- **Loop Controls**: Adjustable loop region with zoom
- **Real-time Playback**: Hear changes instantly

### User Experience
- **Beginner Mode**: Simplified controls for newcomers
- **Advanced Mode**: Full synthesis and effect controls
- **Pre-made Templates**: Adventure, Battle, Menu, Victory themes
- **Interactive Tutorial**: Step-by-step onboarding
- **Keyboard Shortcuts**: Fast workflow for power users

### Storage
- **Offline Support**: Works without internet
- **IndexedDB**: Save projects locally
- **Auto-save**: Never lose your work

## Quick Start

```bash
# Clone the repository
git clone https://github.com/Kubat555/pixel-game-music-generator.git

# Navigate to project
cd pixel-game-music-generator

# Install dependencies
npm install

# Start development server
npm run dev
```

Open http://localhost:3000 in your browser.

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` | Play / Pause |
| `Escape` | Stop |
| `1-4` | Select Track (Lead, Bass, Harmony, Drums) |
| `P` | Pencil Tool |
| `E` | Eraser Tool |
| `+` / `-` | Zoom In / Out |
| `Ctrl + ↑/↓` | Adjust Tempo |

## Tech Stack

- **Frontend**: Vue 3 (Composition API)
- **Audio**: Web Audio API
- **State Management**: Pinia
- **Styling**: Tailwind CSS
- **Build Tool**: Vite
- **Language**: TypeScript

## Project Structure

```
src/
├── audio/              # Web Audio API engine
│   ├── AudioEngine.ts  # Main audio singleton
│   ├── ChiptuneOscillator.ts  # Waveform generation
│   └── Scheduler.ts    # Precise timing
├── components/         # Vue components
│   ├── sequencer/      # Grid, cells, controls
│   ├── instruments/    # Waveform, ADSR, effects
│   ├── transport/      # Play/stop, tempo
│   ├── templates/      # Pre-made songs
│   └── tutorial/       # Onboarding
├── stores/             # Pinia state management
├── composables/        # Vue composables
├── data/               # Templates data
└── types/              # TypeScript definitions
```

## Templates

Start with pre-made templates to learn and remix:

| Template | BPM | Description |
|----------|-----|-------------|
| Adventure Theme | 140 | Upbeat exploration music |
| Battle Theme | 160 | Intense combat soundtrack |
| Menu Theme | 100 | Calm title screen music |
| Victory Fanfare | 130 | Triumphant winning jingle |

## Browser Support

Works in all modern browsers with Web Audio API support:
- Chrome 35+
- Firefox 25+
- Safari 14.1+
- Edge 79+

## Contributing

Contributions are welcome! Feel free to:
- Report bugs
- Suggest features
- Submit pull requests

## License

MIT License - feel free to use for personal and commercial projects.

## Acknowledgments

- Inspired by classic NES/Game Boy sound chips
- Built with Vue 3 and Web Audio API
- Pixel-art aesthetic inspired by retro games

---

Made with ♪ for indie game developers and chiptune enthusiasts
