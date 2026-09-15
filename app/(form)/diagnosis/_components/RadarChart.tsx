// 売上導線レーダーチャート（純SVG・依存追加なし・レスポンシブ）。
// N軸（既定5）の 0〜100 スコアを多角形で描画。各頂点にラベル＋点数を表示する。

const ACCENT = "#1e3f8f"; // ロイヤルブルー

interface RadarAxis {
  label: string;
  score: number; // 0〜100
}

export function RadarChart({
  axes,
  size = 300,
}: {
  axes: RadarAxis[];
  size?: number;
}) {
  const n = axes.length;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 52; // ラベル＋点数の余白
  const levels = [0.25, 0.5, 0.75, 1];

  const angleAt = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n;
  const point = (i: number, ratio: number) => {
    const a = angleAt(i);
    return [cx + r * ratio * Math.cos(a), cy + r * ratio * Math.sin(a)];
  };

  const gridPolygon = (ratio: number) =>
    axes
      .map((_, i) => {
        const [x, y] = point(i, ratio);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");

  const dataPolygon = axes
    .map((ax, i) => {
      const [x, y] = point(i, Math.max(0, Math.min(100, ax.score)) / 100);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className="mx-auto"
      style={{ width: "100%", maxWidth: size, height: "auto" }}
    >
      {levels.map((lv) => (
        <polygon
          key={lv}
          points={gridPolygon(lv)}
          fill="none"
          stroke="#dbe1ea"
          strokeWidth={1}
        />
      ))}
      {axes.map((_, i) => {
        const [x, y] = point(i, 1);
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={x.toFixed(1)}
            y2={y.toFixed(1)}
            stroke="#e6ebf0"
            strokeWidth={1}
          />
        );
      })}
      <polygon
        points={dataPolygon}
        fill="rgba(30,63,143,0.13)"
        stroke={ACCENT}
        strokeWidth={2}
      />
      {axes.map((ax, i) => {
        const [x, y] = point(i, Math.max(0, Math.min(100, ax.score)) / 100);
        return <circle key={i} cx={x} cy={y} r={3.5} fill={ACCENT} />;
      })}
      {axes.map((ax, i) => {
        const [x, y] = point(i, 1.2);
        const a = angleAt(i);
        const anchor =
          Math.abs(Math.cos(a)) < 0.3
            ? "middle"
            : Math.cos(a) > 0
              ? "start"
              : "end";
        return (
          <text key={i} x={x.toFixed(1)} y={y.toFixed(1)} textAnchor={anchor}>
            <tspan
              x={x.toFixed(1)}
              dy="-1"
              className="fill-[#1e3f8f]"
              style={{ fontSize: 10.5, fontWeight: 600 }}
            >
              {ax.label}
            </tspan>
            <tspan
              x={x.toFixed(1)}
              dy="13"
              className="fill-gray-400"
              style={{ fontSize: 9.5, fontWeight: 700 }}
            >
              {ax.score}点
            </tspan>
          </text>
        );
      })}
    </svg>
  );
}
