import React, { useState, useEffect } from 'react';

// --- TYPE DEFINITIONS ---
type Point = { x: number; y: number };
type CircleInfo = { x: number; y: number; radius: number };

// --- CONSTANTS ---
const CIRCLE_DIAMETER = 40;
const CIRCLE_RADIUS = CIRCLE_DIAMETER / 2;
const GAP_SIZE = 16;

// --- VECTOR MATH HELPERS ---
const subtract = (p1: Point, p2: Point): Point => ({ x: p1.x - p2.x, y: p1.y - p2.y });
const magnitude = (p: Point): number => Math.sqrt(p.x * p.x + p.y * p.y);
const distance = (p1: Point, p2: Point): number => magnitude(subtract(p1, p2));

/**
 * Converts an array of points into an SVG path data string.
 * @param points - The array of points to connect.
 * @returns An SVG path data string ('d' attribute).
 */
const pointsToPath = (points: Point[]): string => {
  if (points.length === 0) return '';
  const start = points[0];
  const rest = points.slice(1);
  return `M ${start.x} ${start.y} ${rest.map(p => `L ${p.x} ${p.y}`).join(' ')}`;
};

const App: React.FC = () => {
  const [grid, setGrid] = useState({ cols: 0, rows: 0 });
  const [circles, setCircles] = useState<CircleInfo[]>([]);
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<Point[]>([]);
  const [completedShapes, setCompletedShapes] = useState<Point[][]>([]);

  const totalCircles = grid.cols * grid.rows;

  useEffect(() => {
    const handleResize = () => {
      const totalCellSize = CIRCLE_DIAMETER + GAP_SIZE;
      const cols = Math.floor(window.innerWidth / totalCellSize);
      const rows = Math.floor(window.innerHeight / totalCellSize);
      setGrid({ cols, rows });
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (grid.cols > 0 && grid.rows > 0) {
      const gridPadding = 32;

      const contentWidth = grid.cols * CIRCLE_DIAMETER + (grid.cols - 1) * GAP_SIZE;
      const contentHeight = grid.rows * CIRCLE_DIAMETER + (grid.rows - 1) * GAP_SIZE;

      const gridContainerWidth = window.innerWidth - gridPadding * 2;
      const gridContainerHeight = window.innerHeight - gridPadding * 2;

      const offsetX = (gridContainerWidth - contentWidth) / 2;
      const offsetY = (gridContainerHeight - contentHeight) / 2;

      const newCircles: CircleInfo[] = [];
      for (let row = 0; row < grid.rows; row++) {
        for (let col = 0; col < grid.cols; col++) {
          const x = gridPadding + offsetX + col * (CIRCLE_DIAMETER + GAP_SIZE) + CIRCLE_RADIUS;
          const y = gridPadding + offsetY + row * (CIRCLE_DIAMETER + GAP_SIZE) + CIRCLE_RADIUS;
          newCircles.push({ x, y, radius: CIRCLE_RADIUS });
        }
      }
      setCircles(newCircles);

      // --- Draw "LÝCEUM" right after calculating circles to avoid race conditions ---
      const lyceumGridShapes = [
        // L
        [{c: 0, r: 0}, {c: 0, r: 1}, {c: 0, r: 2}, {c: 0, r: 3}, {c: 1, r: 3}, {c: 2, r: 3}],
        // Ý
        [{c: 4, r: 0}, {c: 5, r: 1}],
        [{c: 8, r: 0}, {c: 7, r: 1}],
        [{c: 6, r: 1}, {c: 6, r: 2}, {c: 6, r: 3}],
        [{c: 6, r: -1}],
        // C
        [{c: 11, r: 0}, {c: 10, r: 0}, {c: 9, r: 1}, {c: 9, r: 2}, {c: 10, r: 3}, {c: 11, r: 3}],
        // E
        [{c: 15, r: 0}, {c: 14, r: 0}, {c: 13, r: 0}, {c: 13, r: 1}, {c: 13, r: 2}, {c: 13, r: 3}, {c: 14, r: 3}, {c: 15, r: 3}],
        [{c: 13, r: 2}, {c: 14, r: 2}],
        // U
        [{c: 17, r: 0}, {c: 17, r: 1}, {c: 17, r: 2}, {c: 18, r: 3}, {c: 19, r: 3}, {c: 20, r: 2}, {c: 20, r: 1}, {c: 20, r: 0}],
        // M
        [{c: 22, r: 3}, {c: 22, r: 0}, {c: 23, r: 1}, {c: 24, r: 0}, {c: 24, r: 3}],
      ];

      const textWidthInCols = 25;
      const textHeightInRows = 5;

      if (grid.cols < textWidthInCols || grid.rows < textHeightInRows) {
        setCompletedShapes([]); // Not enough space
        return;
      }
      
      const getCircleCoords = (col: number, row: number): Point | null => {
        if (col < 0 || col >= grid.cols || row < 0 || row >= grid.rows) return null;
        const index = row * grid.cols + col;
        if (index >= 0 && index < newCircles.length) {
          return { x: newCircles[index].x, y: newCircles[index].y };
        }
        return null;
      };

      const startCol = Math.floor((grid.cols - textWidthInCols) / 2);
      const startRow = Math.floor((grid.rows - textHeightInRows) / 2) + 1; // +1 to better center visually

      const shapesToDraw: Point[][] = lyceumGridShapes.map(shape => 
        shape.map(point => getCircleCoords(point.c + startCol, point.r + startRow))
             .filter((p): p is Point => p !== null)
      ).filter(shape => shape.length > 0);
      
      setCompletedShapes(shapesToDraw);
    } else {
      setCircles([]);
      setCompletedShapes([]);
    }
  }, [grid.cols, grid.rows]);
  
  useEffect(() => {
    const handleUndo = (e: KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
            e.preventDefault();
            setCompletedShapes(prevShapes => prevShapes.slice(0, -1));
        }
    };
    window.addEventListener('keydown', handleUndo);
    return () => window.removeEventListener('keydown', handleUndo);
  }, []);

  const findClosestCircle = (point: Point): { index: number; info: CircleInfo } | null => {
    let closestCircle: { index: number; info: CircleInfo } | null = null;
    let minDistance = Infinity;
    circles.forEach((info, index) => {
      const d = distance(info, point);
      if (d < minDistance) {
        minDistance = d;
        closestCircle = { index, info };
      }
    });
    if (closestCircle && minDistance < closestCircle.info.radius + 20) {
        return closestCircle;
    }
    return null;
  };
  
  const handleMouseDown = (e: React.MouseEvent) => {
    const closest = findClosestCircle({ x: e.clientX, y: e.clientY });
    if (closest) {
      setIsDrawing(true);
      setCurrentPath([{ x: closest.info.x, y: closest.info.y }]);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing) return;
    const closest = findClosestCircle({ x: e.clientX, y: e.clientY });
    if (closest) {
        const lastPoint = currentPath[currentPath.length - 1];
        if (!lastPoint || closest.info.x !== lastPoint.x || closest.info.y !== lastPoint.y) {
            setCurrentPath(prevPath => [...prevPath, { x: closest.info.x, y: closest.info.y }]);
        }
    }
  };

  const handleMouseUp = () => {
    if (!isDrawing || currentPath.length === 0) {
        setIsDrawing(false);
        return;
    }

    const currentPathStr = JSON.stringify(currentPath);
    const reversedPathStr = JSON.stringify([...currentPath].reverse());
    let shapeExists = false;

    const newShapes = completedShapes.filter(shape => {
        const shapeStr = JSON.stringify(shape);
        if (shapeStr === currentPathStr || shapeStr === reversedPathStr) {
            shapeExists = true;
            return false;
        }
        return true;
    });

    if (shapeExists) {
        setCompletedShapes(newShapes);
    } else {
        setCompletedShapes(prevShapes => [...prevShapes, currentPath]);
    }

    setIsDrawing(false);
    setCurrentPath([]);
  };

  return (
    <main 
        className="fixed inset-0 bg-[#f4f4f2] cursor-crosshair overflow-hidden"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
    >
      <div
        className="grid p-8 box-border"
        style={{ 
            gridTemplateColumns: `repeat(${grid.cols}, 1fr)`,
            gap: `${GAP_SIZE}px`,
            justifyContent: 'center',
            alignContent: 'center',
            height: '100%',
            width: '100%',
        }}
        aria-hidden="true"
      >
        {Array.from({ length: totalCircles }).map((_, index) => (
          <div 
            key={index} 
            className="rounded-full border-2 border-stone-300"
            style={{ width: `${CIRCLE_DIAMETER}px`, height: `${CIRCLE_DIAMETER}px` }}
          ></div>
        ))}
      </div>

      <svg className="absolute top-0 left-0 w-full h-full pointer-events-none" style={{zIndex: 10}}>
          {/* Render completed shapes */}
          {completedShapes.map((shape, index) => {
              if (shape.length === 1) {
                  return <circle key={index} cx={shape[0].x} cy={shape[0].y} r={CIRCLE_RADIUS} fill="black" />;
              }
              return (
                  <path 
                      key={index}
                      d={pointsToPath(shape)}
                      fill="black"
                      stroke="black"
                      strokeWidth={CIRCLE_DIAMETER}
                      strokeLinejoin="round"
                      strokeLinecap="round"
                  />
              );
          })}

          {/* Render current drawing path as a preview */}
          {isDrawing && currentPath.length > 0 && (
              currentPath.length === 1 ?
              <circle cx={currentPath[0].x} cy={currentPath[0].y} r={CIRCLE_RADIUS} fill="rgba(0,0,0,0.5)" /> :
              <path 
                  d={pointsToPath(currentPath)}
                  fill="rgba(0,0,0,0.5)"
                  stroke="rgba(0,0,0,0.5)"
                  strokeWidth={CIRCLE_DIAMETER}
                  strokeLinejoin="round"
                  strokeLinecap="round"
              />
          )}
      </svg>
    </main>
  );
};

export default App;
