import { Html, Line } from '@react-three/drei';
import { useShopStore } from '../store/shopStore';
import { computeClearances } from '../lib/clearance';
import { formatLength } from '../lib/units';

// Abstands-Linien vom ausgewählten Möbel zu Wänden / anderen Möbeln /
// Raumkanten — zum Ausmessen von Gängen und Fluren.
export function ClearanceMeasure() {
  const f = useShopStore((s) =>
    s.selectedType === 'furniture'
      ? s.furniture.find((x) => x.id === s.selectedId)
      : undefined
  );
  const walls = useShopStore((s) => s.walls);
  const furniture = useShopStore((s) => s.furniture);
  const dims = useShopStore((s) => s.floorDimensions);
  const unit = useShopStore((s) => s.unit);

  if (!f) return null;

  const clearances = computeClearances(f, walls, furniture, dims);

  return (
    <group>
      {clearances.map((c, i) => (
        <group key={i}>
          <Line
            points={[
              [c.origin.x, 0.12, c.origin.z],
              [c.end.x, 0.12, c.end.z],
            ]}
            color="#f59e0b"
            lineWidth={2}
            dashed
            dashSize={0.15}
            gapSize={0.08}
          />
          <Html
            position={[
              (c.origin.x + c.end.x) / 2,
              0.35,
              (c.origin.z + c.end.z) / 2,
            ]}
            center
            style={{ pointerEvents: 'none' }}
          >
            <div className="dim-label clearance">{formatLength(c.dist, unit)}</div>
          </Html>
        </group>
      ))}
    </group>
  );
}
