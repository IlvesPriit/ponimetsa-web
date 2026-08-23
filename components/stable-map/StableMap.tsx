"use client";

import type React from "react";
import type {
  FenceObject,
  HorseObject,
  RoadObject,
  StableMapDocument,
  StableMapObject,
} from "@/types/stable-map";
import styles from "./StableMap.module.css";

type Props = {
  map: StableMapDocument;
  className?: string;
  selectedId?: string | null;
  interactive?: boolean;
  onObjectPointerDown?: (
    event: React.PointerEvent<SVGGElement>,
    object: StableMapObject,
  ) => void;
  svgProps?: React.SVGProps<SVGSVGElement>;
  svgRef?: React.Ref<SVGSVGElement>;
};

function pathFromPoints(points: { x: number; y: number }[]) {
  return points.map((point, index) => `${index ? "L" : "M"} ${point.x} ${point.y}`).join(" ");
}

function horseSize(name: string) {
  return { width: Math.max(94, Math.min(230, name.length * 10 + 38)), height: 38 };
}

function Fence({ object }: { object: FenceObject }) {
  const path = pathFromPoints(object.points);
  const width = Math.max(5, object.weight / 14);
  if (object.style === "tape") {
    return (
      <>
        <path d={path} fill="none" stroke="rgba(21,31,23,.6)" strokeWidth={width + 4} strokeLinecap="round" strokeLinejoin="round" />
        <path d={path} fill="none" stroke="#f8faf5" strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" />
      </>
    );
  }
  return (
    <>
      <path d={path} fill="none" stroke="#3b2817" strokeWidth={width + 4} strokeLinecap="round" strokeLinejoin="round" />
      <path d={path} fill="none" stroke="#a86f35" strokeWidth={width} strokeDasharray="18 5" strokeLinecap="round" strokeLinejoin="round" />
    </>
  );
}

function Road({ object }: { object: RoadObject }) {
  const path = pathFromPoints(object.points);
  const isAsphalt = object.style === "asphalt";
  return (
    <>
      <path d={path} fill="none" stroke="rgba(30,35,31,.45)" strokeWidth={object.width + 7} strokeLinecap="round" strokeLinejoin="round" />
      <path d={path} fill="none" stroke={isAsphalt ? "#565b5d" : "#d0a668"} strokeWidth={object.width} strokeLinecap="round" strokeLinejoin="round" />
      <path d={path} fill="none" stroke={isAsphalt ? "#d8d7c4" : "rgba(255,244,210,.62)"} strokeWidth={2} strokeDasharray="14 12" strokeLinecap="round" strokeLinejoin="round" />
    </>
  );
}

function HorseLabel({ object }: { object: HorseObject }) {
  const size = horseSize(object.name);
  return (
    <g transform={`translate(${object.x} ${object.y})`}>
      <rect x={-size.width / 2 + 3} y={-size.height / 2 + 4} width={size.width} height={size.height} rx={size.height / 2} fill="rgba(20,28,21,.3)" />
      <rect x={-size.width / 2} y={-size.height / 2} width={size.width} height={size.height} rx={size.height / 2} fill="#fffdf7" stroke="#2f6f45" strokeWidth={3} />
      <circle cx={-size.width / 2 + 18} cy={0} r={5} fill="#2f6f45" />
      <text x={7} y={1} textAnchor="middle" dominantBaseline="middle" className={styles.horseText}>{object.name}</text>
    </g>
  );
}

function ObjectShape({ object }: { object: StableMapObject }) {
  if (object.type === "fence") return <Fence object={object} />;
  if (object.type === "road") return <Road object={object} />;
  return <HorseLabel object={object} />;
}

function objectBounds(object: StableMapObject) {
  if (object.type === "horse") {
    const size = horseSize(object.name);
    return { x: object.x - size.width / 2 - 6, y: object.y - size.height / 2 - 6, width: size.width + 12, height: size.height + 12 };
  }
  const xs = object.points.map((point) => point.x);
  const ys = object.points.map((point) => point.y);
  const pad = object.type === "road" ? object.width / 2 + 8 : 12;
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return { x: minX - pad, y: minY - pad, width: maxX - minX + pad * 2, height: maxY - minY + pad * 2 };
}

export default function StableMap({
  map,
  className,
  selectedId,
  interactive = false,
  onObjectPointerDown,
  svgProps,
  svgRef,
}: Props) {
  const selected = map.objects.find((object) => object.id === selectedId);
  const bounds = selected ? objectBounds(selected) : null;

  return (
    <svg
      {...svgProps}
      ref={svgRef}
      viewBox={`0 0 ${map.canvas.width} ${map.canvas.height}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={map.background.alt}
      className={`${styles.map} ${className ?? ""}`}
    >
      <image href={map.background.url} x={0} y={0} width={map.canvas.width} height={map.canvas.height} preserveAspectRatio="none" />
      {map.objects.map((object) => (
        <g
          key={object.id}
          data-object-id={object.id}
          className={interactive ? styles.interactiveObject : undefined}
          onPointerDown={interactive ? (event) => onObjectPointerDown?.(event, object) : undefined}
        >
          <ObjectShape object={object} />
          {interactive && object.type !== "horse" ? (
            <path d={pathFromPoints(object.points)} fill="none" stroke="transparent" strokeWidth={Math.max(28, object.type === "road" ? object.width + 18 : 28)} pointerEvents="stroke" />
          ) : null}
          {interactive && object.type === "horse" ? (() => {
            const size = horseSize(object.name);
            return <rect x={object.x - size.width / 2} y={object.y - size.height / 2} width={size.width} height={size.height} rx={size.height / 2} fill="transparent" pointerEvents="all" />;
          })() : null}
        </g>
      ))}
      {bounds ? <rect {...bounds} rx={8} className={styles.selection} /> : null}
    </svg>
  );
}
