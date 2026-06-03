import React, { useState, useEffect, useRef } from "react";
import { Play, Pause, RotateCcw, ChevronRight, Trash2, HelpCircle, Activity } from "lucide-react";

// 10x10 Grid Definitions
const GRID_SIZE = 10;
const START_POS: [number, number] = [1, 1];
const GOAL_POS: [number, number] = [8, 8];

const PRESETS = {
  default: [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 1, 0, 0, 0, 0, 1],
    [1, 0, 1, 0, 1, 0, 1, 1, 0, 1],
    [1, 0, 1, 0, 0, 0, 1, 0, 0, 1],
    [1, 0, 1, 1, 1, 1, 1, 0, 1, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 0, 1, 1, 0, 1],
    [1, 0, 0, 0, 1, 0, 1, 0, 0, 1],
    [1, 0, 1, 0, 0, 0, 1, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
  ],
  spiral: [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 1, 0, 1],
    [1, 0, 1, 1, 1, 1, 0, 1, 0, 1],
    [1, 0, 1, 0, 0, 1, 0, 1, 0, 1],
    [1, 0, 1, 1, 0, 1, 0, 1, 0, 1],
    [1, 0, 0, 0, 0, 1, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
  ],
  empty: [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
  ]
};

type Heading = 0 | 1 | 2 | 3; // 0: North, 1: East, 2: South, 3: West

interface TelemetryLog {
  timestamp: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
}

export default function MazeSolver({ color }: { color: string }) {
  const [grid, setGrid] = useState<number[][]>(() => JSON.parse(JSON.stringify(PRESETS.default)));
  const [robotPos, setRobotPos] = useState<[number, number]>(START_POS);
  const [heading, setHeading] = useState<Heading>(1); // Default pointing East
  const [mode, setMode] = useState<"explore" | "shortest">("explore");
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(300); // Ticks in ms
  const [stepCount, setStepCount] = useState<number>(0);
  const [trail, setTrail] = useState<[number, number][]>([START_POS]);
  const [status, setStatus] = useState<"idle" | "running" | "success" | "stuck">("idle");
  const [logs, setLogs] = useState<TelemetryLog[]>([]);
  const [decision, setDecision] = useState<string>("Ready to navigate");

  const [sensorReadings, setSensorReadings] = useState({
    front: { dist: 0, blocked: false },
    left: { dist: 0, blocked: false },
    right: { dist: 0, blocked: false },
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Reset function
  const handleReset = () => {
    setRobotPos(START_POS);
    setHeading(1);
    setStepCount(0);
    setTrail([START_POS]);
    setStatus("idle");
    setDecision("Reset complete. Ready.");
    setIsPlaying(false);
    addLog("System reset. Robot positioned at Start (1, 1).", "info");
  };

  // Clear all walls except boundary, start, and goal
  const handleClear = () => {
    const emptyGrid = Array.from({ length: GRID_SIZE }, (_, r) =>
      Array.from({ length: GRID_SIZE }, (_, c) => {
        if (r === 0 || r === GRID_SIZE - 1 || c === 0 || c === GRID_SIZE - 1) return 1;
        return 0;
      })
    );
    setGrid(emptyGrid);
    handleReset();
    addLog("Cleared all walls. Boundary remains active.", "warning");
  };

  // Load preset maze
  const handleLoadPreset = (key: keyof typeof PRESETS) => {
    setGrid(JSON.parse(JSON.stringify(PRESETS[key])));
    handleReset();
    addLog(`Loaded preset maze: ${key.toUpperCase()}`, "info");
  };

  // Toggle walls
  const handleCellClick = (r: number, c: number) => {
    // Cannot toggle boundaries, start, or goal
    if (r === 0 || r === GRID_SIZE - 1 || c === 0 || c === GRID_SIZE - 1) return;
    if ((r === START_POS[0] && c === START_POS[1]) || (r === GOAL_POS[0] && c === GOAL_POS[1])) return;

    const newGrid = grid.map((row, ri) =>
      row.map((val, ci) => {
        if (ri === r && ci === c) {
          return val === 1 ? 0 : 1;
        }
        return val;
      })
    );
    setGrid(newGrid);
    // If we changed walls, check if we need to reset the robot path to prevent weird physics
    setTrail([START_POS]);
    setRobotPos(START_POS);
    setHeading(1);
    setStepCount(0);
    setStatus("idle");
  };

  // Add telemetry logs
  const addLog = (message: string, type: TelemetryLog["type"] = "info") => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    setLogs((prev) => [...prev.slice(-30), { timestamp: time, message, type }]);
  };

  // Scroll logs to bottom
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  // Delta helpers for movement
  // 0: North, 1: East, 2: South, 3: West
  const deltas = [
    { dr: -1, dc: 0, name: "North" },
    { dr: 0, dc: 1, name: "East" },
    { dr: 1, dc: 0, name: "South" },
    { dr: 0, dc: -1, name: "West" },
  ];

  // Helper to calculate distance to nearest wall in a direction
  const getSensorDistance = (pos: [number, number], dir: Heading) => {
    const delta = deltas[dir];
    let r = pos[0];
    let c = pos[1];
    let distance = 0;

    while (true) {
      r += delta.dr;
      c += delta.dc;
      if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE || grid[r][c] === 1) {
        break;
      }
      distance++;
    }
    return { dist: distance, blocked: distance === 0 };
  };

  // Compute sensors relative to the current heading
  const updateSensors = (pos: [number, number], head: Heading) => {
    const leftHead = ((head - 1 + 4) % 4) as Heading;
    const rightHead = ((head + 1) % 4) as Heading;

    const frontSensor = getSensorDistance(pos, head);
    const leftSensor = getSensorDistance(pos, leftHead);
    const rightSensor = getSensorDistance(pos, rightHead);

    setSensorReadings({
      front: frontSensor,
      left: leftSensor,
      right: rightSensor,
    });
  };

  // Update sensors when position or heading changes
  useEffect(() => {
    updateSensors(robotPos, heading);
  }, [robotPos, heading, grid]);

  // BFS solver helper to find optimal path
  const solveBFS = (): [number, number][] | null => {
    const queue: [number, number][] = [START_POS];
    const visited = new Set<string>();
    visited.add(`${START_POS[0]},${START_POS[1]}`);
    const parent = new Map<string, string>();

    while (queue.length > 0) {
      const [r, c] = queue.shift()!;
      if (r === GOAL_POS[0] && c === GOAL_POS[1]) {
        const path: [number, number][] = [];
        let curr = `${r},${c}`;
        while (curr) {
          const [cr, cc] = curr.split(",").map(Number);
          path.push([cr, cc]);
          curr = parent.get(curr) || "";
        }
        return path.reverse();
      }

      for (const { dr, dc } of deltas) {
        const nr = r + dr;
        const nc = c + dc;
        if (
          nr >= 0 &&
          nr < GRID_SIZE &&
          nc >= 0 &&
          nc < GRID_SIZE &&
          grid[nr][nc] === 0 &&
          !visited.has(`${nr},${nc}`)
        ) {
          visited.add(`${nr},${nc}`);
          parent.set(`${nr},${nc}`, `${r},${c}`);
          queue.push([nr, nc]);
        }
      }
    }
    return null;
  };

  // Robot tick execution
  const executeTick = () => {
    if (robotPos[0] === GOAL_POS[0] && robotPos[1] === GOAL_POS[1]) {
      setStatus("success");
      setIsPlaying(false);
      setDecision("Goal Reached! Micro-mouse successful.");
      addLog("MAZE COMPLETED! Goal reached successfully.", "success");
      return;
    }

    setStatus("running");

    if (mode === "shortest") {
      // Shortest Path Mode (Vite BFS path follower)
      const path = solveBFS();
      if (!path) {
        setStatus("stuck");
        setIsPlaying(false);
        setDecision("No path found to Goal!");
        addLog("Shortest Path Solver failed: Goal is unreachable.", "error");
        return;
      }

      // Find where we are in the path
      const currentIdx = path.findIndex(([r, c]) => r === robotPos[0] && c === robotPos[1]);
      if (currentIdx === -1 || currentIdx === path.length - 1) {
        // Teleport to start or finish up
        return;
      }

      const nextNode = path[currentIdx + 1];
      const dr = nextNode[0] - robotPos[0];
      const dc = nextNode[1] - robotPos[1];

      // Determine heading to match nextNode direction
      let nextHeading: Heading = heading;
      if (dr === -1) nextHeading = 0; // North
      else if (dc === 1) nextHeading = 1; // East
      else if (dr === 1) nextHeading = 2; // South
      else if (dc === -1) nextHeading = 3; // West

      setHeading(nextHeading);
      setRobotPos(nextNode);
      setStepCount((s) => s + 1);
      setTrail((t) => [...t, nextNode]);
      setDecision(`Moving forward along shortest path towards Goal.`);
      addLog(`Robot moved to (${nextNode[0]}, ${nextNode[1]}) - Shortest Path.`, "info");
    } else {
      // Exploration Mode (Left-Hand Rule)
      const leftHead = ((heading - 1 + 4) % 4) as Heading;
      const rightHead = ((heading + 1) % 4) as Heading;
      const backHead = ((heading + 2) % 4) as Heading;

      const leftDelta = deltas[leftHead];
      const frontDelta = deltas[heading];
      const rightDelta = deltas[rightHead];
      const backDelta = deltas[backHead];

      const checkOpen = (r: number, c: number) => {
        return r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE && grid[r][c] === 0;
      };

      const cellLeft: [number, number] = [robotPos[0] + leftDelta.dr, robotPos[1] + leftDelta.dc];
      const cellFront: [number, number] = [robotPos[0] + frontDelta.dr, robotPos[1] + frontDelta.dc];
      const cellRight: [number, number] = [robotPos[0] + rightDelta.dr, robotPos[1] + rightDelta.dc];
      const cellBack: [number, number] = [robotPos[0] + backDelta.dr, robotPos[1] + backDelta.dc];

      if (checkOpen(cellLeft[0], cellLeft[1])) {
        // Left is open -> Turn Left and Move
        setHeading(leftHead);
        setRobotPos(cellLeft);
        setStepCount((s) => s + 1);
        setTrail((t) => [...t, cellLeft]);
        setDecision("Left wall open - turning left & moving forward.");
        addLog(`Left turn: moved to (${cellLeft[0]}, ${cellLeft[1]}) facing ${deltas[leftHead].name}.`, "info");
      } else if (checkOpen(cellFront[0], cellFront[1])) {
        // Front is open -> Move Straight
        setRobotPos(cellFront);
        setStepCount((s) => s + 1);
        setTrail((t) => [...t, cellFront]);
        setDecision("Left wall blocked, front open - moving forward.");
        addLog(`Straight: moved to (${cellFront[0]}, ${cellFront[1]}) facing ${deltas[heading].name}.`, "info");
      } else if (checkOpen(cellRight[0], cellRight[1])) {
        // Right is open -> Turn Right and Move
        setHeading(rightHead);
        setRobotPos(cellRight);
        setStepCount((s) => s + 1);
        setTrail((t) => [...t, cellRight]);
        setDecision("Front & Left blocked, right open - turning right & moving.");
        addLog(`Right turn: moved to (${cellRight[0]}, ${cellRight[1]}) facing ${deltas[rightHead].name}.`, "info");
      } else if (checkOpen(cellBack[0], cellBack[1])) {
        // Trapped -> Turn around (Back) and move
        setHeading(backHead);
        setRobotPos(cellBack);
        setStepCount((s) => s + 1);
        setTrail((t) => [...t, cellBack]);
        setDecision("Dead end - turning around & moving back.");
        addLog(`U-Turn: backing out to (${cellBack[0]}, ${cellBack[1]}) facing ${deltas[backHead].name}.`, "warning");
      } else {
        // Trapped completely (no exit)
        setStatus("stuck");
        setIsPlaying(false);
        setDecision("TRAPPED - Robot is completely enclosed by walls.");
        addLog("Robot is trapped! No valid movements possible.", "error");
      }
    }
  };

  // Playback timer handling
  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        executeTick();
      }, speed);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, robotPos, heading, mode, grid, speed]);

  // Compute laser lines endpoints for drawing in SVG
  const cellWidth = 36;
  const robotCenter = {
    x: robotPos[1] * cellWidth + cellWidth / 2,
    y: robotPos[0] * cellWidth + cellWidth / 2,
  };

  const getLaserCoords = (dir: Heading, readingDist: number) => {
    const delta = deltas[dir];
    // Center coordinate of target boundary cell
    const targetCellR = robotPos[0] + delta.dr * (readingDist + 1);
    const targetCellC = robotPos[1] + delta.dc * (readingDist + 1);

    let endX = robotCenter.x;
    let endY = robotCenter.y;

    if (dir === 0) {
      // North
      endY = targetCellR * cellWidth + cellWidth;
    } else if (dir === 2) {
      // South
      endY = targetCellR * cellWidth;
    } else if (dir === 1) {
      // East
      endX = targetCellC * cellWidth;
    } else if (dir === 3) {
      // West
      endX = targetCellC * cellWidth + cellWidth;
    }

    return { x2: endX, y2: endY };
  };

  // Render front, left, and right lasers
  const leftHead = ((heading - 1 + 4) % 4) as Heading;
  const rightHead = ((heading + 1) % 4) as Heading;

  const frontLaser = getLaserCoords(heading, sensorReadings.front.dist);
  const leftLaser = getLaserCoords(leftHead, sensorReadings.left.dist);
  const rightLaser = getLaserCoords(rightHead, sensorReadings.right.dist);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 24,
        width: "100%",
        height: "100%",
      }}
      className="maze-solver-layout"
    >
      {/* Maze Grid Display */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          background: "rgba(0,0,0,0.4)",
          borderRadius: 16,
          padding: 16,
          border: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 360,
            aspectRatio: "1/1",
            position: "relative",
            overflow: "hidden",
            borderRadius: 12,
            background: "#080c14",
            border: `1px solid ${color}30`,
          }}
        >
          <svg
            viewBox="0 0 360 360"
            style={{ width: "100%", height: "100%", cursor: "crosshair" }}
          >
            {/* Draw grid cells */}
            {grid.map((row, r) =>
              row.map((val, c) => {
                const isStart = r === START_POS[0] && c === START_POS[1];
                const isGoal = r === GOAL_POS[0] && c === GOAL_POS[1];
                const isBoundary = r === 0 || r === GRID_SIZE - 1 || c === 0 || c === GRID_SIZE - 1;

                let fill = "transparent";
                let stroke = "rgba(255,255,255,0.02)";

                if (val === 1) {
                  fill = isBoundary ? "#0b101d" : "#1e293b";
                  stroke = isBoundary ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.1)";
                } else if (isStart) {
                  fill = "rgba(16,185,129,0.1)";
                } else if (isGoal) {
                  fill = "rgba(239,68,68,0.1)";
                }

                return (
                  <rect
                    key={`${r}-${c}`}
                    x={c * cellWidth}
                    y={r * cellWidth}
                    width={cellWidth}
                    height={cellWidth}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={0.5}
                    onClick={() => handleCellClick(r, c)}
                    style={{
                      transition: "fill 0.2s",
                      pointerEvents: isBoundary ? "none" : "auto",
                    }}
                  />
                );
              })
            )}

            {/* Faint trail dots */}
            {trail.slice(0, -1).map(([r, c], idx) => (
              <circle
                key={idx}
                cx={c * cellWidth + cellWidth / 2}
                cy={r * cellWidth + cellWidth / 2}
                r={3}
                fill={color}
                opacity={0.3}
              />
            ))}

            {/* Start and Goal highlights */}
            <rect
              x={START_POS[1] * cellWidth + 2}
              y={START_POS[0] * cellWidth + 2}
              width={cellWidth - 4}
              height={cellWidth - 4}
              rx={4}
              fill="none"
              stroke="#10b981"
              strokeWidth={2}
              strokeDasharray="4 2"
            />
            <text
              x={START_POS[1] * cellWidth + cellWidth / 2}
              y={START_POS[0] * cellWidth + cellWidth / 2 + 4}
              fill="#10b981"
              fontSize={11}
              fontWeight={800}
              textAnchor="middle"
              pointerEvents="none"
            >
              S
            </text>

            <rect
              x={GOAL_POS[1] * cellWidth + 2}
              y={GOAL_POS[0] * cellWidth + 2}
              width={cellWidth - 4}
              height={cellWidth - 4}
              rx={4}
              fill="none"
              stroke="#ef4444"
              strokeWidth={2}
              strokeDasharray="4 2"
            />
            <text
              x={GOAL_POS[1] * cellWidth + cellWidth / 2}
              y={GOAL_POS[0] * cellWidth + cellWidth / 2 + 4}
              fill="#ef4444"
              fontSize={11}
              fontWeight={800}
              textAnchor="middle"
              pointerEvents="none"
            >
              G
            </text>

            {/* Glowing Sensor rays */}
            {isPlaying && (
              <>
                {/* Front laser: Blue-Green */}
                <line
                  x1={robotCenter.x}
                  y1={robotCenter.y}
                  x2={frontLaser.x2}
                  y2={frontLaser.y2}
                  stroke="#10b981"
                  strokeWidth={1.5}
                  strokeDasharray="3 3"
                  opacity={0.8}
                />
                <circle cx={frontLaser.x2} cy={frontLaser.y2} r={3} fill="#10b981" />

                {/* Left laser: Red-Orange */}
                <line
                  x1={robotCenter.x}
                  y1={robotCenter.y}
                  x2={leftLaser.x2}
                  y2={leftLaser.y2}
                  stroke="#f97316"
                  strokeWidth={1.2}
                  strokeDasharray="3 3"
                  opacity={0.7}
                />
                <circle cx={leftLaser.x2} cy={leftLaser.y2} r={2.5} fill="#f97316" />

                {/* Right laser: Yellow */}
                <line
                  x1={robotCenter.x}
                  y1={robotCenter.y}
                  x2={rightLaser.x2}
                  y2={rightLaser.y2}
                  stroke="#eab308"
                  strokeWidth={1.2}
                  strokeDasharray="3 3"
                  opacity={0.7}
                />
                <circle cx={rightLaser.x2} cy={rightLaser.y2} r={2.5} fill="#eab308" />
              </>
            )}

            {/* Micro Mouse Robot Character */}
            <g
              transform={`translate(${robotCenter.x}, ${robotCenter.y}) rotate(${heading * 90})`}
              style={{ transition: "transform 0.25s ease-in-out" }}
            >
              {/* Glowing back aura */}
              <circle cx={0} cy={0} r={14} fill={`${color}15`} />
              
              {/* Chassis */}
              <rect x={-8} y={-10} width={16} height={20} rx={4} fill="#0f172a" stroke={color} strokeWidth={2} />
              
              {/* Wheels */}
              <rect x={-10} y={-7} width={2} height={6} rx={1} fill="#ffffff" opacity={0.7} />
              <rect x={8} y={-7} width={2} height={6} rx={1} fill="#ffffff" opacity={0.7} />
              <rect x={-10} y={1} width={2} height={6} rx={1} fill="#ffffff" opacity={0.7} />
              <rect x={8} y={1} width={2} height={6} rx={1} fill="#ffffff" opacity={0.7} />
              
              {/* Headlights / LED Direction Indicator */}
              <polygon points="-4,-10 0,-14 4,-10" fill="#10b981" />
              <circle cx={0} cy={-2} r={3} fill={color} />
            </g>
          </svg>
        </div>

        {/* Dynamic click-to-draw hint */}
        <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)", marginTop: 10, display: "flex", alignItems: "center", gap: 4 }}>
          <HelpCircle size={12} /> Click cells on the grid above to add/remove custom walls!
        </p>
      </div>

      {/* Telemetry Control Panel */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          height: "100%",
          background: "rgba(0,0,0,0.2)",
          borderRadius: 16,
          padding: 20,
          border: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        {/* Panel Header */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h4 style={{ fontSize: "0.85rem", fontWeight: 700, color: "white", letterSpacing: "0.1em", display: "flex", alignItems: "center", gap: 8 }} className="font-mono text-muted-foreground">
              <Activity size={14} style={{ color }} /> ROBOT_TELEMETRY
            </h4>
            <span
              style={{
                fontSize: "0.7rem",
                padding: "2px 8px",
                borderRadius: 4,
                fontWeight: 600,
                background:
                  status === "success"
                    ? "rgba(16,185,129,0.15)"
                    : status === "stuck"
                    ? "rgba(239,68,68,0.15)"
                    : status === "running"
                    ? "rgba(59,130,246,0.15)"
                    : "rgba(255,255,255,0.05)",
                color:
                  status === "success"
                    ? "#10b981"
                    : status === "stuck"
                    ? "#ef4444"
                    : status === "running"
                    ? "#3b82f6"
                    : "rgba(255,255,255,0.5)",
                textTransform: "uppercase",
              }}
            >
              {status}
            </span>
          </div>

          {/* Telemetry Display */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "8px 16px",
              padding: 12,
              background: "rgba(255,255,255,0.02)",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.03)",
              fontSize: "0.8rem",
              fontFamily: "monospace",
              marginBottom: 16,
            }}
          >
            <div>POS: <span style={{ color: "#fff" }}>({robotPos[0]}, {robotPos[1]})</span></div>
            <div>HEADING: <span style={{ color: "#fff" }}>{deltas[heading].name}</span></div>
            <div>STEPS: <span style={{ color: "#fff" }}>{stepCount}</span></div>
            <div>MODE: <span style={{ color, textTransform: "uppercase" }}>{mode}</span></div>
            
            <div style={{ gridColumn: "span 2", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 8, marginTop: 4 }}>
              SENSORS (FRONT | LEFT | RIGHT):
              <div style={{ display: "flex", gap: 10, marginTop: 4, color: "rgba(255,255,255,0.6)" }}>
                <span>F: <b style={{ color: sensorReadings.front.blocked ? "#ef4444" : "#10b981" }}>{sensorReadings.front.blocked ? "BLKD" : `${sensorReadings.front.dist}cm`}</b></span>
                <span>L: <b style={{ color: sensorReadings.left.blocked ? "#ef4444" : "#10b981" }}>{sensorReadings.left.blocked ? "BLKD" : `${sensorReadings.left.dist}cm`}</b></span>
                <span>R: <b style={{ color: sensorReadings.right.blocked ? "#ef4444" : "#10b981" }}>{sensorReadings.right.blocked ? "BLKD" : `${sensorReadings.right.dist}cm`}</b></span>
              </div>
            </div>

            <div style={{ gridColumn: "span 2", marginTop: 4 }}>
              DECISION: <span style={{ color: "#fff", fontStyle: "italic" }}>{decision}</span>
            </div>
          </div>

          {/* Preset & Mode Controls */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.5)" }}>MAZE:</span>
              <button onClick={() => handleLoadPreset("default")} className="deck-nav-btn" style={{ padding: "4px 8px", fontSize: "0.7rem", borderRadius: 4 }}>PRESET</button>
              <button onClick={() => handleLoadPreset("spiral")} className="deck-nav-btn" style={{ padding: "4px 8px", fontSize: "0.7rem", borderRadius: 4 }}>SPIRAL</button>
              <button onClick={handleClear} className="deck-nav-btn" style={{ padding: "4px 8px", fontSize: "0.7rem", borderRadius: 4, display: "flex", alignItems: "center", gap: 4 }} title="Clear custom walls"><Trash2 size={10} /> CLEAR</button>
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.5)" }}>ALGO:</span>
              <button
                onClick={() => {
                  setMode("explore");
                  handleReset();
                }}
                className={`deck-nav-btn ${mode === "explore" ? "active" : ""}`}
                style={{
                  padding: "4px 10px",
                  fontSize: "0.7rem",
                  borderRadius: 4,
                  border: mode === "explore" ? `1px solid ${color}` : "1px solid rgba(255,255,255,0.08)",
                  background: mode === "explore" ? `${color}20` : "transparent",
                  color: mode === "explore" ? "#fff" : "rgba(255,255,255,0.6)",
                }}
              >
                LEFT-HAND RULE (Micromouse)
              </button>
              <button
                onClick={() => {
                  setMode("shortest");
                  handleReset();
                }}
                className={`deck-nav-btn ${mode === "shortest" ? "active" : ""}`}
                style={{
                  padding: "4px 10px",
                  fontSize: "0.7rem",
                  borderRadius: 4,
                  border: mode === "shortest" ? `1px solid ${color}` : "1px solid rgba(255,255,255,0.08)",
                  background: mode === "shortest" ? `${color}20` : "transparent",
                  color: mode === "shortest" ? "#fff" : "rgba(255,255,255,0.6)",
                }}
              >
                SHORTEST PATH (BFS)
              </button>
            </div>
          </div>
        </div>

        {/* Terminal logs panel */}
        <div
          ref={logContainerRef}
          style={{
            flex: 1,
            maxHeight: 100,
            overflowY: "auto",
            background: "rgba(0,0,0,0.5)",
            border: "1px solid rgba(255,255,255,0.05)",
            borderRadius: 6,
            padding: 8,
            fontSize: "0.7rem",
            fontFamily: "monospace",
            color: "rgba(255,255,255,0.6)",
            marginBottom: 16,
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
          className="telemetry-logs"
        >
          {logs.length === 0 ? (
            <div style={{ color: "rgba(255,255,255,0.3)" }}>&gt; Initializing log output...</div>
          ) : (
            logs.map((l, i) => (
              <div key={i} style={{ display: "flex", gap: 8 }}>
                <span style={{ color: "rgba(255,255,255,0.25)" }}>[{l.timestamp}]</span>
                <span
                  style={{
                    color:
                      l.type === "success"
                        ? "#10b981"
                        : l.type === "error"
                        ? "#ef4444"
                        : l.type === "warning"
                        ? "#f97316"
                        : "rgba(255,255,255,0.7)",
                  }}
                >
                  {l.type === "error" ? "CRIT" : l.type === "warning" ? "WARN" : "INFO"}: {l.message}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Speed Slider & Control Action Buttons */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.5)", whiteSpace: "nowrap" }}>SPEED:</span>
            <input
              type="range"
              min={100}
              max={1000}
              step={50}
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              style={{
                width: "100%",
                accentColor: color,
                cursor: "pointer",
              }}
            />
            <span style={{ fontSize: "0.75rem", color: "#fff", fontFamily: "monospace", width: 45, textAlign: "right" }}>{speed}ms</span>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="btn-primary"
              style={{
                flex: 1,
                background: color,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                padding: "10px 14px",
                fontSize: "0.85rem",
              }}
            >
              {isPlaying ? (
                <>
                  <Pause size={14} /> Pause
                </>
              ) : (
                <>
                  <Play size={14} fill="#fff" /> Auto Run
                </>
              )}
            </button>

            <button
              onClick={() => {
                setIsPlaying(false);
                executeTick();
              }}
              disabled={status === "success" || status === "stuck"}
              className="deck-nav-btn"
              style={{
                width: 44,
                height: 40,
                borderRadius: 8,
                padding: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: status === "success" || status === "stuck" ? 0.4 : 1,
                cursor: status === "success" || status === "stuck" ? "not-allowed" : "pointer",
              }}
              title="Manual Step"
            >
              <ChevronRight size={18} />
            </button>

            <button
              onClick={handleReset}
              className="deck-nav-btn"
              style={{
                width: 44,
                height: 40,
                borderRadius: 8,
                padding: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              title="Reset"
            >
              <RotateCcw size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
