import React, { useEffect, useRef, useMemo } from 'react';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';
import { gameAudio } from '../utils/audio';
import robotImg from '../assets/robot.png';
import robotSideImg from '../assets/robot-side.png';
import robotUpImg from '../assets/robot-up.png';
import robotDownImg from '../assets/robot-down.png';

// 19x19 Maze Grid Layout (1 = Wall, 0 = Path)
const MAZE_GRID = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1], // TL Room (cols 1..3), TR Room (cols 15..17)
  [1, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1], // Room entry doors at col 4 and 14
  [1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1],
  [1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1],
  [1, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1],
  [1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], // Center Row (player starts at 9, 9)
  [1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1],
  [1, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1],
  [1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1],
  [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1], // BL Room (cols 1..3), BR Room (cols 15..17)
  [1, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 1],
  [1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1]
];

// Warp Portals (Top <-> Bottom)
const WARP_PORTALS = [
  { x: 9, y: 0, targetX: 9, targetY: 17, exitDir: 'up', color: '#00f0ff' },
  { x: 9, y: 18, targetX: 9, targetY: 1, exitDir: 'down', color: '#ff007f' }
];

// Room Centers & Colors
const ROOMS = [
  { id: 0, x: 2, y: 2, label: 'أعلى اليسار', color: '#39ff14', glow: 'rgba(57, 255, 20, 0.15)' }, // TL
  { id: 1, x: 16, y: 2, label: 'أعلى اليمين', color: '#bd00ff', glow: 'rgba(189, 0, 255, 0.15)' }, // TR
  { id: 2, x: 2, y: 16, label: 'أسفل اليسار', color: '#ff5f00', glow: 'rgba(255, 95, 0, 0.15)' }, // BL
  { id: 3, x: 16, y: 16, label: 'أسفل اليمين', color: '#ff007f', glow: 'rgba(255, 0, 127, 0.15)' } // BR
];



interface Monster {
  x: number;
  y: number;
  gridX: number;
  gridY: number;
  targetX: number;
  targetY: number;
  speed: number;
  color: string;
  personality: 'chaser' | 'ambusher' | 'wanderer';
  lastDir: 'up' | 'down' | 'left' | 'right' | 'none';
}

interface MazeCanvasProps {
  level: number;
  words: string[]; // 4 words distributed to the 4 rooms
  correctWord: string;
  onCorrect: () => void;
  onWrong: (word: string) => void;
  onLoseLife: () => void;
  lives: number;
  isPaused: boolean;
  externalDirection: string | null; // For on-screen controls
}

export const MazeCanvas: React.FC<MazeCanvasProps> = ({
  level,
  words,
  correctWord,
  onCorrect,
  onWrong,
  onLoseLife,
  lives,
  isPaused,
  externalDirection
}) => {
  const numWords = words.length;

  const activeRooms = useMemo(() => ROOMS.filter(r => r.id < numWords), [numWords]);
  const cagedRooms = useMemo(() => ROOMS.filter(r => r.id >= numWords), [numWords]);


  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const robotImageRef = useRef<HTMLImageElement | null>(null);
  const robotSideRef = useRef<HTMLImageElement | null>(null);
  const robotUpRef = useRef<HTMLImageElement | null>(null);
  const robotDownRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const img = new Image();
    img.src = robotImg;
    img.onload = () => robotImageRef.current = img;

    const sideImg = new Image();
    sideImg.src = robotSideImg;
    sideImg.onload = () => robotSideRef.current = sideImg;

    const upImg = new Image();
    upImg.src = robotUpImg;
    upImg.onload = () => robotUpRef.current = upImg;

    const downImg = new Image();
    downImg.src = robotDownImg;
    downImg.onload = () => robotDownRef.current = downImg;
  }, []);

  // Player state
  const playerRef = useRef({
    x: 9 * 32 + 16,
    y: 9 * 32 + 16,
    gridX: 9,
    gridY: 9,
    targetX: 9,
    targetY: 9,
    speed: 2,
    dir: 'none',
    nextDir: 'none',
    invincibleFrames: 0,
    facingDir: 'left',
  });

  // Monsters state
  const monstersRef = useRef<Monster[]>([]);

  // Ghost AI mode: alternates between scatter and chase
  const ghostModeRef = useRef<'scatter' | 'chase'>('scatter');
  const ghostTimerRef = useRef<number>(0);

  // Local state for wrong room cooldowns to prevent double triggers
  const lastRoomVisitedRef = useRef<{ id: number; time: number } | null>(null);
  const cameraRef = useRef({ x: 9 * 32 + 16, y: 9 * 32 + 16, zoom: 1.8 });
  const celebrationRef = useRef<{ active: boolean, progress: number } | null>(null);
  const frameCountRef = useRef(0);

  // BFS pathfinding — returns the first direction to move toward target
  const bfsFirstStep = (
    startX: number, startY: number,
    goalX: number, goalY: number,
    walkableCheck: (gx: number, gy: number) => boolean
  ): { dx: number; dy: number; dir: string } | null => {
    // Clamp goal to grid bounds
    const gx = Math.max(0, Math.min(18, goalX));
    const gy = Math.max(0, Math.min(18, goalY));

    if (startX === gx && startY === gy) return null;

    const visited = new Set<string>();
    const queue: { x: number; y: number; firstStep: { dx: number; dy: number; dir: string } }[] = [];

    const dirs = [
      { dx: 0, dy: -1, dir: 'up' },
      { dx: 0, dy: 1, dir: 'down' },
      { dx: -1, dy: 0, dir: 'left' },
      { dx: 1, dy: 0, dir: 'right' }
    ];

    visited.add(`${startX},${startY}`);

    for (const d of dirs) {
      const nx = startX + d.dx;
      const ny = startY + d.dy;
      if (walkableCheck(nx, ny) && !visited.has(`${nx},${ny}`)) {
        if (nx === gx && ny === gy) return d;
        visited.add(`${nx},${ny}`);
        queue.push({ x: nx, y: ny, firstStep: d });
      }
    }

    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const d of dirs) {
        const nx = current.x + d.dx;
        const ny = current.y + d.dy;
        const key = `${nx},${ny}`;
        if (!visited.has(key) && walkableCheck(nx, ny)) {
          if (nx === gx && ny === gy) return current.firstStep;
          visited.add(key);
          queue.push({ x: nx, y: ny, firstStep: current.firstStep });
        }
      }
    }

    // No path found — fallback: pick any walkable adjacent tile
    for (const d of dirs) {
      if (walkableCheck(startX + d.dx, startY + d.dy)) return d;
    }
    return null;
  };

  // Background Cache Canvas
  const bgCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Re-render the static background whenever cagedRooms changes
  useEffect(() => {
    if (!bgCanvasRef.current) {
      bgCanvasRef.current = document.createElement('canvas');
    }
    const bgCanvas = bgCanvasRef.current;
    const bCtx = bgCanvas.getContext('2d');
    if (!bCtx) return;

    bgCanvas.width = 19 * cellSize;
    bgCanvas.height = 19 * cellSize;

    bCtx.fillStyle = '#020617';
    bCtx.fillRect(0, 0, bgCanvas.width, bgCanvas.height);

    // 0.5 Draw Sci-Fi Floor Grid
    bCtx.strokeStyle = 'rgba(255, 150, 0, 0.15)';
    bCtx.lineWidth = 1;
    for (let i = 0; i <= 19; i++) {
      bCtx.beginPath();
      bCtx.moveTo(i * cellSize, 0);
      bCtx.lineTo(i * cellSize, 19 * cellSize);
      bCtx.stroke();

      bCtx.beginPath();
      bCtx.moveTo(0, i * cellSize);
      bCtx.lineTo(19 * cellSize, i * cellSize);
      bCtx.stroke();
    }

    bCtx.fillStyle = 'rgba(255, 150, 0, 0.8)';
    bCtx.shadowColor = '#ff9600';
    bCtx.shadowBlur = 4;
    for (let r = 0; r <= 19; r++) {
      for (let c = 0; c <= 19; c++) {
        bCtx.beginPath();
        bCtx.arc(c * cellSize, r * cellSize, 1.5, 0, Math.PI * 2);
        bCtx.fill();
      }
    }
    bCtx.shadowBlur = 0;

    // 1. Draw Room Glow zones
    ROOMS.forEach((room) => {
      bCtx.fillStyle = room.glow;
      bCtx.fillRect((room.x - 1) * cellSize, (room.y - 1) * cellSize, cellSize * 3, cellSize * 3);

      // Neon Room Borders
      bCtx.strokeStyle = room.color;
      bCtx.lineWidth = 2;
      bCtx.shadowColor = room.color;
      bCtx.shadowBlur = 10;
      bCtx.strokeRect((room.x - 1) * cellSize, (room.y - 1) * cellSize, cellSize * 3, cellSize * 3);
    });
    bCtx.shadowBlur = 0; // Reset shadows

    // 2. Draw Maze Walls
    for (let r = 0; r < 19; r++) {
      for (let c = 0; c < 19; c++) {
        let isWall = MAZE_GRID[r][c] === 1;

        // Dynamically turn caged rooms into walls
        for (const room of cagedRooms) {
          if (Math.abs(c - room.x) <= 1 && Math.abs(r - room.y) <= 1) isWall = true;
        }

        if (isWall) {
          const x = c * cellSize;
          const y = r * cellSize;

          // Base wall (dark blue metallic)
          bCtx.fillStyle = '#0a192f';
          bCtx.fillRect(x, y, cellSize, cellSize);

          // Inner raised panel
          bCtx.fillStyle = '#112240';
          bCtx.fillRect(x + 3, y + 3, cellSize - 6, cellSize - 6);

          // Sci-fi borders
          bCtx.strokeStyle = '#1e3a8a';
          bCtx.lineWidth = 1;
          bCtx.strokeRect(x, y, cellSize, cellSize);

          // Neon blue corner highlights
          bCtx.strokeStyle = '#00f0ff';
          bCtx.shadowColor = '#00f0ff';
          bCtx.shadowBlur = 5;

          bCtx.beginPath();
          bCtx.moveTo(x + 6, y + 1);
          bCtx.lineTo(x + 1, y + 1);
          bCtx.lineTo(x + 1, y + 6);
          bCtx.stroke();

          bCtx.beginPath();
          bCtx.moveTo(x + cellSize - 6, y + cellSize - 1);
          bCtx.lineTo(x + cellSize - 1, y + cellSize - 1);
          bCtx.lineTo(x + cellSize - 1, y + cellSize - 6);
          bCtx.stroke();

          // Occasional bright neon accents on panels
          if ((r * 13 + c * 7) % 11 === 0) {
            bCtx.shadowBlur = 8;
            bCtx.fillStyle = '#00f0ff';
            bCtx.fillRect(x + cellSize / 2 - 3, y + 3, 6, 2);
          }

          bCtx.shadowBlur = 0; // Reset
        }
      }
    }
  }, [cagedRooms]);

  const activeDPadDirRef = useRef<string | null>(null);

  // D-Pad handlers
  const handleDPadStart = (dir: string) => {
    if (isPaused || lives <= 0) return;
    activeDPadDirRef.current = dir;
  };

  const handleDPadEnd = () => {
    activeDPadDirRef.current = null;
  };

  const cellSize = 32;

  // Initialize monsters
  const resetEntities = () => {
    // Reset player
    playerRef.current = {
      x: 9 * cellSize + cellSize / 2,
      y: 9 * cellSize + cellSize / 2,
      gridX: 9,
      gridY: 9,
      targetX: 9,
      targetY: 9,
      speed: 2.5,
      dir: 'none',
      nextDir: 'none',
      invincibleFrames: 120, // 2 seconds safety on level start
      facingDir: 'left',
    };

    cameraRef.current = {
      x: 9 * cellSize + cellSize / 2,
      y: 9 * cellSize + cellSize / 2,
      zoom: 1.8
    };

    // Reset monsters based on current level — distinct speeds per personality
    let chaserSpeed = 1.3;
    let ambusherSpeed = 1.1;
    let wandererSpeed = 0.9;
    if (level >= 2 && level <= 4) {
      chaserSpeed = 1.4;
      ambusherSpeed = 1.2;
      wandererSpeed = 1.0;
    } else if (level >= 5) {
      chaserSpeed = 1.5;
      ambusherSpeed = 1.3;
      wandererSpeed = 1.1;
    }

    ghostModeRef.current = 'scatter';
    ghostTimerRef.current = Date.now();

    monstersRef.current = [
      {
        x: 5 * cellSize + cellSize / 2,
        y: 5 * cellSize + cellSize / 2,
        gridX: 5,
        gridY: 5,
        targetX: 5,
        targetY: 5,
        speed: chaserSpeed,
        color: '#ff0000', // Red: Chaser (Blinky)
        personality: 'chaser',
        lastDir: 'none'
      },
      {
        x: 13 * cellSize + cellSize / 2,
        y: 5 * cellSize + cellSize / 2,
        gridX: 13,
        gridY: 5,
        targetX: 13,
        targetY: 5,
        speed: ambusherSpeed,
        color: '#00f0ff', // Cyan: Ambusher (Inky)
        personality: 'ambusher',
        lastDir: 'none'
      },
      {
        x: 5 * cellSize + cellSize / 2,
        y: 13 * cellSize + cellSize / 2,
        gridX: 5,
        gridY: 13,
        targetX: 5,
        targetY: 13,
        speed: wandererSpeed,
        color: '#ffaa00', // Orange: Wanderer (Clyde)
        personality: 'wanderer',
        lastDir: 'none'
      }
    ];

    lastRoomVisitedRef.current = null;
  };

  // Reset when words/level changes
  useEffect(() => {
    resetEntities();
  }, [words]);

  const externalDirectionRef = useRef<string | null>(null);
  const keysPressedRef = useRef<{ [key: string]: boolean }>({});

  // Sync external direction (touch/mouse hold)
  useEffect(() => {
    externalDirectionRef.current = externalDirection;
  }, [externalDirection]);

  // Handle keyboard inputs with held down tracking
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isPaused || lives <= 0) return;

      const trackedKeys = ['ArrowUp', 'w', 'W', 'ArrowDown', 's', 'S', 'ArrowLeft', 'a', 'A', 'ArrowRight', 'd', 'D'];
      if (trackedKeys.includes(e.key)) {
        e.preventDefault();
      }

      keysPressedRef.current[e.key] = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressedRef.current[e.key] = false;
    };

    const handleBlur = () => {
      keysPressedRef.current = {};
      externalDirectionRef.current = null;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [isPaused, lives]);

  const getDesiredDirection = (): string | null => {
    if (activeDPadDirRef.current) {
      return activeDPadDirRef.current;
    }
    if (externalDirectionRef.current) {
      return externalDirectionRef.current;
    }
    const keys = keysPressedRef.current;
    if (keys['ArrowUp'] || keys['w'] || keys['W']) return 'up';
    if (keys['ArrowDown'] || keys['s'] || keys['S']) return 'down';
    if (keys['ArrowLeft'] || keys['a'] || keys['A']) return 'left';
    if (keys['ArrowRight'] || keys['d'] || keys['D']) return 'right';
    return null;
  };



  const isWalkable = (gx: number, gy: number, isMonster: boolean = false): boolean => {
    if (gx < 0 || gx >= 19 || gy < 0 || gy >= 19) return false;

    if (isMonster) {
      // Monsters cannot enter any room
      for (const room of ROOMS) {
        if (Math.abs(gx - room.x) <= 1 && Math.abs(gy - room.y) <= 1) return false;
      }
    } else {
      // Player cannot enter caged rooms
      for (const room of cagedRooms) {
        if (Math.abs(gx - room.x) <= 1 && Math.abs(gy - room.y) <= 1) return false;
      }
    }


    return MAZE_GRID[gy][gx] !== 1;
  };

  // Main game loop inside requestAnimationFrame
  useEffect(() => {
    let animationId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const updateGame = () => {
      if (isPaused || lives <= 0) return;

      const player = playerRef.current;

      // 1. Move Player
      const targetPx = player.targetX * cellSize + cellSize / 2;
      const targetPy = player.targetY * cellSize + cellSize / 2;

      // Interpolate position
      if (player.x < targetPx) player.x = Math.min(player.x + player.speed, targetPx);
      else if (player.x > targetPx) player.x = Math.max(player.x - player.speed, targetPx);

      if (player.y < targetPy) player.y = Math.min(player.y + player.speed, targetPy);
      else if (player.y > targetPy) player.y = Math.max(player.y - player.speed, targetPy);

      // Decrement invincibility
      if (player.invincibleFrames > 0) {
        player.invincibleFrames--;
      }

      // Check if player has arrived at target tile
      if (player.x === targetPx && player.y === targetPy) {
        player.gridX = player.targetX;
        player.gridY = player.targetY;

        // Check if player stepped on a warp portal
        const steppedPortal = WARP_PORTALS.find(p => p.x === player.gridX && p.y === player.gridY);
        if (steppedPortal) {
          gameAudio.playTeleport();
          player.x = steppedPortal.targetX * cellSize + cellSize / 2;
          player.y = steppedPortal.targetY * cellSize + cellSize / 2;
          player.gridX = steppedPortal.targetX;
          player.gridY = steppedPortal.targetY;
          player.targetX = steppedPortal.targetX;
          player.targetY = steppedPortal.targetY;
          player.dir = steppedPortal.exitDir as any;
          player.nextDir = steppedPortal.exitDir as any;
          player.invincibleFrames = Math.max(player.invincibleFrames, 30);
        }

        const desiredDir = getDesiredDirection();
        let dX = 0;
        let dY = 0;

        if (desiredDir) {
          if (desiredDir === 'up' && isWalkable(player.gridX, player.gridY - 1)) {
            dY = -1;
            player.facingDir = 'up';
          }
          else if (desiredDir === 'down' && isWalkable(player.gridX, player.gridY + 1)) {
            dY = 1;
            player.facingDir = 'down';
          }
          else if (desiredDir === 'left' && isWalkable(player.gridX - 1, player.gridY)) {
            dX = -1;
            player.facingDir = 'left';
          }
          else if (desiredDir === 'right' && isWalkable(player.gridX + 1, player.gridY)) {
            dX = 1;
            player.facingDir = 'right';
          }

          if (dX !== 0 || dY !== 0) {
            player.dir = desiredDir;
            player.targetX = player.gridX + dX;
            player.targetY = player.gridY + dY;
            gameAudio.playMove();
          } else {
            player.dir = 'none';
          }
        } else {
          player.dir = 'none';
        }
      }

      // Update camera smooth follow with boundary clamping
      const camera = cameraRef.current;
      const camLerp = 0.1;
      camera.x += (player.x - camera.x) * camLerp;
      camera.y += (player.y - camera.y) * camLerp;

      const zoom = camera.zoom;
      const visibleWidth = (19 * cellSize) / zoom;
      const visibleHeight = (19 * cellSize) / zoom;
      const minX = visibleWidth / 2;
      const maxX = (19 * cellSize) - minX;
      const minY = visibleHeight / 2;
      const maxY = (19 * cellSize) - minY;

      camera.x = Math.max(minX, Math.min(maxX, camera.x));
      camera.y = Math.max(minY, Math.min(maxY, camera.y));

      // Ghost Mode Timer (Scatter / Chase)
      const now = Date.now();
      const modeElapsed = now - ghostTimerRef.current;
      if (ghostModeRef.current === 'scatter' && modeElapsed > 7000) {
        ghostModeRef.current = 'chase';
        ghostTimerRef.current = now;
      } else if (ghostModeRef.current === 'chase' && modeElapsed > 20000) {
        ghostModeRef.current = 'scatter';
        ghostTimerRef.current = now;
      }

      // 2. Move Monsters (BFS pathfinding + Pac-Man personality system)
      const monsters = monstersRef.current;
      frameCountRef.current++;

      monsters.forEach((monster) => {
        const mTargetPx = monster.targetX * cellSize + cellSize / 2;
        const mTargetPy = monster.targetY * cellSize + cellSize / 2;

        // Interpolate position smoothly toward target tile
        if (monster.x < mTargetPx) monster.x = Math.min(monster.x + monster.speed, mTargetPx);
        else if (monster.x > mTargetPx) monster.x = Math.max(monster.x - monster.speed, mTargetPx);

        if (monster.y < mTargetPy) monster.y = Math.min(monster.y + monster.speed, mTargetPy);
        else if (monster.y > mTargetPy) monster.y = Math.max(monster.y - monster.speed, mTargetPy);

        // Arrived at target tile — pick the next tile to move to
        if (monster.x === mTargetPx && monster.y === mTargetPy) {
          monster.gridX = monster.targetX;
          monster.gridY = monster.targetY;

          // Determine the target cell based on mode + personality
          let goalCell = { x: player.gridX, y: player.gridY };

          if (ghostModeRef.current === 'scatter') {
            // Scatter: each monster retreats to its own corner
            if (monster.personality === 'chaser') goalCell = { x: 17, y: 1 };
            else if (monster.personality === 'ambusher') goalCell = { x: 1, y: 1 };
            else if (monster.personality === 'wanderer') goalCell = { x: 1, y: 17 };
          } else {
            // Chase: personality-driven targeting
            if (monster.personality === 'chaser') {
              // Blinky: directly targets the player
              goalCell = { x: player.gridX, y: player.gridY };
            } else if (monster.personality === 'ambusher') {
              // Inky: targets 4 tiles ahead of where the player is facing
              let pDx = 0, pDy = 0;
              if (player.facingDir === 'up') pDy = -4;
              if (player.facingDir === 'down') pDy = 4;
              if (player.facingDir === 'left') pDx = -4;
              if (player.facingDir === 'right') pDx = 4;
              goalCell = {
                x: Math.max(0, Math.min(18, player.gridX + pDx)),
                y: Math.max(0, Math.min(18, player.gridY + pDy))
              };
            } else if (monster.personality === 'wanderer') {
              // Clyde: chases most of the time, flanks when close
              const dist = Math.abs(monster.gridX - player.gridX) + Math.abs(monster.gridY - player.gridY);
              if (dist > 4) {
                // Far away: hunt the player directly
                goalCell = { x: player.gridX, y: player.gridY };
              } else {
                // Close: flank from the opposite side of the player
                const flankX = Math.max(0, Math.min(18, player.gridX + (player.gridX - monster.gridX)));
                const flankY = Math.max(0, Math.min(18, player.gridY + (player.gridY - monster.gridY)));
                goalCell = { x: flankX, y: flankY };
              }
            }
          }

          // Use BFS to find the best first step toward the goal
          const bfsResult = bfsFirstStep(
            monster.gridX, monster.gridY,
            goalCell.x, goalCell.y,
            (x, y) => isWalkable(x, y, true)
          );

          if (bfsResult) {
            // Prevent reversing direction unless it's the only option (dead end)
            const opposites: Record<string, string> = { up: 'down', down: 'up', left: 'right', right: 'left' };
            const isReverse = monster.lastDir !== 'none' && bfsResult.dir === opposites[monster.lastDir];

            if (!isReverse) {
              monster.targetX = monster.gridX + bfsResult.dx;
              monster.targetY = monster.gridY + bfsResult.dy;
              monster.lastDir = bfsResult.dir as Monster['lastDir'];
            } else {
              // BFS wants to reverse — check if there are other walkable options
              const dirs = [
                { dx: 0, dy: -1, dir: 'up' },
                { dx: 0, dy: 1, dir: 'down' },
                { dx: -1, dy: 0, dir: 'left' },
                { dx: 1, dy: 0, dir: 'right' }
              ];
              const alternatives = dirs.filter(d =>
                d.dir !== opposites[monster.lastDir] &&
                isWalkable(monster.gridX + d.dx, monster.gridY + d.dy, true)
              );

              if (alternatives.length > 0) {
                // Pick a random alternative to avoid predictability
                const alt = alternatives[Math.floor(Math.random() * alternatives.length)];
                monster.targetX = monster.gridX + alt.dx;
                monster.targetY = monster.gridY + alt.dy;
                monster.lastDir = alt.dir as Monster['lastDir'];
              } else {
                // True dead end — must reverse
                monster.targetX = monster.gridX + bfsResult.dx;
                monster.targetY = monster.gridY + bfsResult.dy;
                monster.lastDir = bfsResult.dir as Monster['lastDir'];
              }
            }
          }
          // If no BFS result, monster stays put (shouldn't happen in practice)
        }
      });

      // 3. Collision Checks (Player vs Monsters)
      if (player.invincibleFrames === 0) {
        monsters.forEach((monster) => {
          const dx = player.x - monster.x;
          const dy = player.y - monster.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          // Overlap check (hitbox 16px)
          if (dist < 16) {
            gameAudio.playHit();
            onLoseLife();

            // Flash and reset positions with extra invincibility (3s)
            player.invincibleFrames = 180;
            player.x = 9 * cellSize + cellSize / 2;
            player.y = 9 * cellSize + cellSize / 2;
            player.gridX = 9;
            player.gridY = 9;
            player.targetX = 9;
            player.targetY = 9;
            player.dir = 'none';
            player.nextDir = 'none';
            player.facingDir = 'left';

            // Reset monsters positions
            const spawnPositions = [
              { gx: 5, gy: 5 },
              { gx: 13, gy: 5 },
              { gx: 5, gy: 13 }
            ];
            monsters.forEach((m, i) => {
              const sp = spawnPositions[i];
              m.x = sp.gx * cellSize + cellSize / 2;
              m.y = sp.gy * cellSize + cellSize / 2;
              m.gridX = sp.gx;
              m.gridY = sp.gy;
              m.targetX = sp.gx;
              m.targetY = sp.gy;
              m.lastDir = 'none';
            });
          }
        });
      }

      // 4. Room Detection (Player inside corner rooms)
      activeRooms.forEach((room) => {
        // If player enters any tile within the 3x3 room
        if (Math.abs(player.gridX - room.x) <= 1 && Math.abs(player.gridY - room.y) <= 1) {
          const now = Date.now();
          const lastVisited = lastRoomVisitedRef.current;

          // Prevent immediate duplicate triggering
          if (lastVisited && lastVisited.id === room.id && now - lastVisited.time < 3000) {
            return;
          }

          const wordInRoom = words[room.id];
          lastRoomVisitedRef.current = { id: room.id, time: now };

          if (wordInRoom === correctWord) {
            if (!celebrationRef.current) {
              celebrationRef.current = { active: true, progress: 0 };
              gameAudio.playTeleport(); // Play some sound for success
            }
          } else {
            gameAudio.playWrong();
            onWrong(wordInRoom);

            // Teleport back to center on wrong answer
            player.x = 9 * cellSize + cellSize / 2;
            player.y = 9 * cellSize + cellSize / 2;
            player.gridX = 9;
            player.gridY = 9;
            player.targetX = 9;
            player.targetY = 9;
            player.dir = 'down';
            player.nextDir = 'down';

            // Give some invincibility frames so they aren't instantly killed if a monster is at the center
            player.invincibleFrames = Math.max(player.invincibleFrames, 60);
          }
        }
      });


    };

    const drawGame = () => {
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      ctx.scale(2, 2);
      const zoom = cameraRef.current.zoom;
      ctx.translate((19 * cellSize) / 2, (19 * cellSize) / 2);
      ctx.scale(zoom, zoom);
      ctx.translate(-cameraRef.current.x, -cameraRef.current.y);

      const player = playerRef.current;
      const monsters = monstersRef.current;

      // Draw cached static background
      if (bgCanvasRef.current) {
        ctx.drawImage(bgCanvasRef.current, 0, 0);
      }

      // 2.5 Draw Warp Portals
      const now = Date.now();
      WARP_PORTALS.forEach((portal) => {
        const px = portal.x * cellSize + cellSize / 2;
        const py = portal.y * cellSize + cellSize / 2;
        const baseAngle = (now / 600) % (Math.PI * 2);
        const radius = cellSize / 2;

        ctx.save();
        ctx.beginPath();
        ctx.arc(px, py, radius, 0, Math.PI * 2);
        ctx.clip();

        ctx.fillStyle = '#050a1f';
        ctx.fillRect(px - radius, py - radius, radius * 2, radius * 2);

        for (let layer = 1; layer <= 2; layer++) {
          const layerAngle = baseAngle * (layer % 2 === 0 ? 1 : -1) / layer;
          const nebulaGrad = ctx.createRadialGradient(
            px + Math.cos(layerAngle) * radius * 0.25,
            py + Math.sin(layerAngle) * radius * 0.25,
            0,
            px, py, radius * 0.9
          );
          const alpha = 0.15 + Math.sin(now / 400 + layer) * 0.05;
          nebulaGrad.addColorStop(0, portal.color + Math.floor(alpha * 255).toString(16).padStart(2, '0'));
          nebulaGrad.addColorStop(1, 'transparent');
          ctx.fillStyle = nebulaGrad;
          ctx.fillRect(px - radius, py - radius, radius * 2, radius * 2);
        }

        ctx.strokeStyle = portal.color;
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.6;
        for (let arm = 0; arm < 2; arm++) {
          ctx.beginPath();
          for (let t = 0; t < 40; t++) {
            const angle = baseAngle * 2 + (arm * Math.PI) + (t * 0.15);
            const r = (t / 40) * radius;
            const x = px + Math.cos(angle) * r;
            const y = py + Math.sin(angle) * r;
            if (t === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }

        ctx.restore();

        ctx.save();
        ctx.shadowColor = portal.color;
        ctx.shadowBlur = 10;
        ctx.strokeStyle = portal.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(px, py, radius - 1, 0, Math.PI * 2);
        ctx.stroke();

        const pulse = 0.5 + Math.sin(now / 300) * 0.3;
        ctx.strokeStyle = portal.color + Math.floor(pulse * 255).toString(16).padStart(2, '0');
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(px, py, radius + 2 + Math.sin(now / 200) * 1.5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      });

      // 3. Draw Room Words (Arabic connected text support)
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 18px FontGame';

      // Room colored floor glow
      activeRooms.forEach((room) => {
        const textX = room.x * cellSize + cellSize / 2;
        const textY = room.y * cellSize + cellSize / 2;

        // Draw shadow/glow behind word
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 19px FontGame';
        ctx.fillText(words[room.id] || '', textX + 1, textY + 1);

        // Draw word text
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 18px FontGame';
        ctx.fillText(words[room.id] || '', textX, textY);
      });

      // 4. Draw Player
      const isInvincible = player.invincibleFrames > 0;
      // Flashing effect during invincibility
      if (!isInvincible || Math.floor(player.invincibleFrames / 5) % 2 === 0) {

        // Select the correct image based on direction
        let currentImg = robotDownRef.current; // Default to facing camera
        let flipHorizontal = false;

        if (player.facingDir === 'up') {
          currentImg = robotUpRef.current;
        } else if (player.facingDir === 'down') {
          currentImg = robotDownRef.current;
        } else if (player.facingDir === 'left') {
          currentImg = robotSideRef.current;
          flipHorizontal = true; // Side image faces right by default
        } else if (player.facingDir === 'right') {
          currentImg = robotSideRef.current;
        }

        // Fallback to original image if directional ones didn't load
        if (!currentImg) currentImg = robotImageRef.current;

        if (currentImg) {
          ctx.save();
          ctx.shadowColor = '#00f0ff';
          ctx.shadowBlur = isInvincible ? 15 : 6;
          const size = 26; // Fits nicely in 32x32 cell

          if (flipHorizontal) {
            ctx.translate(player.x, player.y);
            ctx.scale(-1, 1);
            ctx.drawImage(
              currentImg,
              -size / 2,
              -size / 2,
              size,
              size
            );
          } else {
            ctx.drawImage(
              currentImg,
              player.x - size / 2,
              player.y - size / 2,
              size,
              size
            );
          }
          ctx.restore();
        } else {
          ctx.beginPath();
          ctx.arc(player.x, player.y, 11, 0, Math.PI * 2);
          ctx.fillStyle = '#fff01f';
          ctx.fill();
        }
      }

      // 5. Draw Monsters (animated ghost with wavy skirt)
      const frame = frameCountRef.current;
      monsters.forEach((monster) => {
        const mx = monster.x;
        const my = monster.y;
        const waveOffset = Math.sin(frame * 0.15) * 2; // Animate skirt wave

        // Draw ghost dome body
        ctx.beginPath();
        ctx.arc(mx, my - 2, 10, Math.PI, 0, false); // top dome
        ctx.lineTo(mx + 10, my + 10);

        // Animated wavy bottom skirt
        ctx.lineTo(mx + 7, my + 7 + waveOffset);
        ctx.lineTo(mx + 4, my + 10);
        ctx.lineTo(mx + 1, my + 7 - waveOffset);
        ctx.lineTo(mx - 2, my + 10);
        ctx.lineTo(mx - 5, my + 7 + waveOffset);
        ctx.lineTo(mx - 8, my + 10);
        ctx.lineTo(mx - 10, my + 7 - waveOffset);

        ctx.closePath();
        ctx.fillStyle = monster.color;
        ctx.shadowColor = monster.color;
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Draw white eyes
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(mx - 4, my - 2, 3, 0, Math.PI * 2);
        ctx.arc(mx + 4, my - 2, 3, 0, Math.PI * 2);
        ctx.fill();

        // Draw pupils looking in movement direction (using lastDir)
        ctx.fillStyle = '#1a1a6e';
        let pupilDx = 0;
        let pupilDy = 0;

        const mDir = monster.lastDir || 'none';

        if (mDir === 'up') pupilDy = -1.5;
        else if (mDir === 'down') pupilDy = 1.5;
        else if (mDir === 'left') pupilDx = -1.5;
        else if (mDir === 'right') pupilDx = 1.5;

        ctx.beginPath();
        ctx.arc(mx - 4 + pupilDx, my - 2 + pupilDy, 1.5, 0, Math.PI * 2);
        ctx.arc(mx + 4 + pupilDx, my - 2 + pupilDy, 1.5, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.restore();
    };

    const runFrame = () => {
      if (celebrationRef.current) {
        celebrationRef.current.progress++;
        const p = celebrationRef.current.progress;
        const maxFrames = 75; // 1.25 seconds of celebration zoom
        const ratio = Math.min(p / maxFrames, 1);

        // Easing cubic out
        const easeRatio = 1 - Math.pow(1 - ratio, 3);
        cameraRef.current.zoom = 1.8 + (6.0 - 1.8) * easeRatio;

        // Pull camera heavily towards player during zoom
        const player = playerRef.current;
        cameraRef.current.x += (player.x - cameraRef.current.x) * 0.15;
        cameraRef.current.y += (player.y - cameraRef.current.y) * 0.15;

        if (p >= maxFrames) {
          celebrationRef.current = null;
          cameraRef.current.zoom = 1.8; // reset
          onCorrect();
        }
      } else {
        updateGame();
      }

      drawGame();
      animationId = requestAnimationFrame(runFrame);
    };

    runFrame();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [isPaused, lives, words, correctWord]);

  const pointerStartRef = useRef<{ x: number, y: number } | null>(null);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!e.isPrimary) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    pointerStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!e.isPrimary || !pointerStartRef.current) return;
    
    const dx = e.clientX - pointerStartRef.current.x;
    const dy = e.clientY - pointerStartRef.current.y;
    
    if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
      if (Math.abs(dx) > Math.abs(dy)) {
        activeDPadDirRef.current = dx > 0 ? 'right' : 'left';
      } else {
        activeDPadDirRef.current = dy > 0 ? 'down' : 'up';
      }
      pointerStartRef.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!e.isPrimary) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    pointerStartRef.current = null;
    activeDPadDirRef.current = null;
  };

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{ touchAction: 'none' }}
      className="relative flex justify-center items-center rounded-2xl overflow-hidden shadow-[0_0_40px_rgba(0,240,255,0.15)] bg-[#030712] border-2 border-[#1e3a8a]/50 touch-none select-none w-full h-auto lg:w-auto lg:h-full aspect-square max-w-full max-h-full cursor-crosshair"
    >
      <canvas
        ref={canvasRef}
        width={19 * cellSize * 2}
        height={19 * cellSize * 2}
        className="block max-w-full max-h-full h-auto"
        style={{ imageRendering: 'pixelated' }}
      />
    </div>
  );
};
