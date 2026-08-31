"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import StableMap from "./StableMap";
import styles from "./MapEditor.module.css";
import {
  parseStableMapDocument,
  type FenceObject,
  type Horse,
  type HorseObject,
  type MapPoint,
  type RoadObject,
  type StableMapDocument,
  type StableMapObject,
} from "@/types/stable-map";

type Tool = "select" | "pan" | "fenceLine" | "fenceRect" | "road";
type MobilePanel = "horses" | "draw" | "project";

type Props = {
  initialMap: StableMapDocument;
  horses: Horse[];
  publishedAt: string | null;
};

type DragState = {
  objectId: string;
  start: MapPoint;
  original: StableMapObject;
  before: StableMapDocument;
  moved: boolean;
};

type HandleDragState = {
  objectId: string;
  pointIndex: number;
  original: FenceObject | RoadObject;
  before: StableMapDocument;
  moved: boolean;
};

type PanState = {
  startX: number;
  startY: number;
  scrollLeft: number;
  scrollTop: number;
};

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const uid = () => globalThis.crypto?.randomUUID?.() ?? `map-${Date.now()}-${Math.random()}`;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function rectanglePoints(start: MapPoint, end: MapPoint): MapPoint[] {
  return [
    start,
    { x: end.x, y: start.y },
    end,
    { x: start.x, y: end.y },
    start,
  ];
}

function moveObject(object: StableMapObject, dx: number, dy: number, width: number, height: number): StableMapObject {
  if (object.type === "horse") {
    return { ...object, x: clamp(object.x + dx, 55, width - 55), y: clamp(object.y + dy, 28, height - 28) };
  }
  return {
    ...object,
    points: object.points.map((point) => ({
      x: clamp(point.x + dx, 0, width),
      y: clamp(point.y + dy, 0, height),
    })),
  };
}

function moveObjectPoint(
  object: FenceObject | RoadObject,
  pointIndex: number,
  target: MapPoint,
): FenceObject | RoadObject {
  const points = object.points.map((point) => ({ ...point }));
  if (object.type === "fence" && object.shape === "rect" && points.length >= 5) {
    if (pointIndex === 0) {
      points[0] = target;
      points[1].y = target.y;
      points[3].x = target.x;
    } else if (pointIndex === 1) {
      points[1] = target;
      points[0].y = target.y;
      points[2].x = target.x;
    } else if (pointIndex === 2) {
      points[2] = target;
      points[1].x = target.x;
      points[3].y = target.y;
    } else if (pointIndex === 3) {
      points[3] = target;
      points[0].x = target.x;
      points[2].y = target.y;
    }
    points[4] = { ...points[0] };
    return { ...object, points };
  }

  if (pointIndex >= 0 && pointIndex < points.length) points[pointIndex] = target;
  return { ...object, points };
}

function formatPublishedAt(value: string | null) {
  if (!value) return "Pole veel avaldatud";
  return `Avaldatud ${new Date(value).toLocaleString("et-EE", { dateStyle: "short", timeStyle: "short" })}`;
}

export default function MapEditor({ initialMap, horses, publishedAt: initialPublishedAt }: Props) {
  const [document, setDocument] = useState(() => clone(initialMap));
  const [history, setHistory] = useState<StableMapDocument[]>([]);
  const [future, setFuture] = useState<StableMapDocument[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tool, setTool] = useState<Tool>("select");
  const [zoom, setZoom] = useState(1);
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>("horses");
  const [pendingHorse, setPendingHorse] = useState<Horse | null>(null);
  const [fenceStyle, setFenceStyle] = useState<FenceObject["style"]>("wood");
  const [fenceWeight, setFenceWeight] = useState(100);
  const [roadStyle, setRoadStyle] = useState<RoadObject["style"]>("gravel");
  const [roadWidth, setRoadWidth] = useState(24);
  const [drawingStart, setDrawingStart] = useState<MapPoint | null>(null);
  const [pointerPoint, setPointerPoint] = useState<MapPoint | null>(null);
  const [roadPoints, setRoadPoints] = useState<MapPoint[]>([]);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [publishedAt, setPublishedAt] = useState(initialPublishedAt);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const handleDragRef = useRef<HandleDragState | null>(null);
  const panRef = useRef<PanState | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (window.matchMedia("(max-width: 680px)").matches) {
      setZoom(window.innerWidth < 500 ? 3 : 2);
    }
  }, []);

  const pointFromClient = useCallback((clientX: number, clientY: number): MapPoint => {
    const svg = svgRef.current;
    const matrix = svg?.getScreenCTM();
    if (!svg || !matrix) return { x: 0, y: 0 };
    const screenPoint = svg.createSVGPoint();
    screenPoint.x = clientX;
    screenPoint.y = clientY;
    const mapPoint = screenPoint.matrixTransform(matrix.inverse());
    return {
      x: clamp(mapPoint.x, 0, document.canvas.width),
      y: clamp(mapPoint.y, 0, document.canvas.height),
    };
  }, [document.canvas.height, document.canvas.width]);

  const commit = useCallback((next: StableMapDocument) => {
    setHistory((items) => [...items.slice(-49), clone(document)]);
    setFuture([]);
    setDocument(next);
    setDirty(true);
  }, [document]);

  const undo = useCallback(() => {
    const previous = history[history.length - 1];
    if (!previous) return;
    setHistory((items) => items.slice(0, -1));
    setFuture((items) => [...items, clone(document)]);
    setDocument(clone(previous));
    setSelectedId(null);
    setDirty(true);
  }, [document, history]);

  const redo = useCallback(() => {
    const next = future[future.length - 1];
    if (!next) return;
    setFuture((items) => items.slice(0, -1));
    setHistory((items) => [...items, clone(document)]);
    setDocument(clone(next));
    setSelectedId(null);
    setDirty(true);
  }, [document, future]);

  const deleteSelected = useCallback(() => {
    if (!selectedId) return;
    commit({ ...document, objects: document.objects.filter((object) => object.id !== selectedId) });
    setSelectedId(null);
  }, [commit, document, selectedId]);

  const duplicateSelected = useCallback(() => {
    const selected = document.objects.find((object) => object.id === selectedId);
    if (!selected || selected.type === "horse") return;
    const copy = moveObject({ ...clone(selected), id: uid() }, 18, 18, document.canvas.width, document.canvas.height);
    commit({ ...document, objects: [...document.objects, copy] });
    setSelectedId(copy.id);
  }, [commit, document, selectedId]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (["INPUT", "SELECT", "TEXTAREA"].includes(tag ?? "")) return;
      const modifier = event.ctrlKey || event.metaKey;
      if (modifier && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
      } else if (modifier && event.key.toLowerCase() === "y") {
        event.preventDefault();
        redo();
      } else if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        deleteSelected();
      } else if (event.key === "Escape") {
        setDrawingStart(null);
        setRoadPoints([]);
        setPointerPoint(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [deleteSelected, redo, undo]);

  const previewObject = useMemo<StableMapObject | null>(() => {
    if (drawingStart && pointerPoint && tool === "fenceLine") {
      return { id: "preview", type: "fence", shape: "line", points: [drawingStart, pointerPoint], style: fenceStyle, weight: fenceWeight };
    }
    if (drawingStart && pointerPoint && tool === "fenceRect") {
      return { id: "preview", type: "fence", shape: "rect", points: rectanglePoints(drawingStart, pointerPoint), style: fenceStyle, weight: fenceWeight };
    }
    if (tool === "road" && roadPoints.length) {
      return { id: "preview", type: "road", points: pointerPoint ? [...roadPoints, pointerPoint] : roadPoints, style: roadStyle, width: roadWidth };
    }
    return null;
  }, [drawingStart, fenceStyle, fenceWeight, pointerPoint, roadPoints, roadStyle, roadWidth, tool]);

  const renderedMap = useMemo(() => previewObject
    ? { ...document, objects: [...document.objects, previewObject] }
    : document, [document, previewObject]);

  const onMapPointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (event.button !== 0) return;
    if (tool === "pan") {
      const stage = stageRef.current;
      if (!stage) return;
      panRef.current = {
        startX: event.clientX,
        startY: event.clientY,
        scrollLeft: stage.scrollLeft,
        scrollTop: stage.scrollTop,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }
    const point = pointFromClient(event.clientX, event.clientY);
    if (tool === "select") {
      if (pendingHorse) {
        const horseName = pendingHorse.name;
        placeHorse(pendingHorse, point);
        setPendingHorse(null);
        setMessage(`${horseName} on kaardile paigutatud.`);
        return;
      }
      setSelectedId(null);
      return;
    }
    if (tool === "road") {
      setRoadPoints((points) => [...points, point]);
      setPointerPoint(point);
      return;
    }
    setDrawingStart(point);
    setPointerPoint(point);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onObjectPointerDown = (event: ReactPointerEvent<SVGGElement>, object: StableMapObject) => {
    if (tool === "pan") return;
    if (pendingHorse) {
      event.stopPropagation();
      const horseName = pendingHorse.name;
      placeHorse(pendingHorse, pointFromClient(event.clientX, event.clientY));
      setPendingHorse(null);
      setMessage(`${horseName} on kaardile paigutatud.`);
      return;
    }
    if (tool !== "select" || object.id === "preview") return;
    event.stopPropagation();
    setSelectedId(object.id);
    dragRef.current = {
      objectId: object.id,
      start: pointFromClient(event.clientX, event.clientY),
      original: clone(object),
      before: clone(document),
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onHandlePointerDown = (
    event: ReactPointerEvent<SVGCircleElement>,
    object: FenceObject | RoadObject,
    pointIndex: number,
  ) => {
    if (tool !== "select") return;
    event.stopPropagation();
    setSelectedId(object.id);
    handleDragRef.current = {
      objectId: object.id,
      pointIndex,
      original: clone(object),
      before: clone(document),
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onMapPointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    const pan = panRef.current;
    if (pan) {
      const stage = stageRef.current;
      if (stage) {
        stage.scrollLeft = pan.scrollLeft - (event.clientX - pan.startX);
        stage.scrollTop = pan.scrollTop - (event.clientY - pan.startY);
      }
      return;
    }
    const point = pointFromClient(event.clientX, event.clientY);
    if (drawingStart || roadPoints.length) setPointerPoint(point);
    const handleDrag = handleDragRef.current;
    if (handleDrag) {
      const originalPoint = handleDrag.original.points[handleDrag.pointIndex];
      if (originalPoint && Math.hypot(point.x - originalPoint.x, point.y - originalPoint.y) > 1.5) {
        handleDrag.moved = true;
      }
      const resized = moveObjectPoint(handleDrag.original, handleDrag.pointIndex, point);
      setDocument((current) => ({
        ...current,
        objects: current.objects.map((object) => object.id === handleDrag.objectId ? resized : object),
      }));
      return;
    }
    const drag = dragRef.current;
    if (!drag) return;
    const dx = point.x - drag.start.x;
    const dy = point.y - drag.start.y;
    if (Math.hypot(dx, dy) > 1.5) drag.moved = true;
    const moved = moveObject(drag.original, dx, dy, document.canvas.width, document.canvas.height);
    setDocument((current) => ({
      ...current,
      objects: current.objects.map((object) => object.id === drag.objectId ? moved : object),
    }));
  };

  const onMapPointerUp = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (panRef.current) {
      panRef.current = null;
      return;
    }
    const point = pointFromClient(event.clientX, event.clientY);
    const handleDrag = handleDragRef.current;
    if (handleDrag) {
      if (handleDrag.moved) {
        setHistory((items) => [...items.slice(-49), handleDrag.before]);
        setFuture([]);
        setDirty(true);
      }
      handleDragRef.current = null;
      return;
    }
    const drag = dragRef.current;
    if (drag) {
      if (drag.moved) {
        setHistory((items) => [...items.slice(-49), drag.before]);
        setFuture([]);
        setDirty(true);
      }
      dragRef.current = null;
      return;
    }
    if (!drawingStart || (tool !== "fenceLine" && tool !== "fenceRect")) return;
    if (Math.hypot(point.x - drawingStart.x, point.y - drawingStart.y) < 8) {
      setDrawingStart(null);
      setPointerPoint(null);
      return;
    }
    const object: FenceObject = {
      id: uid(),
      type: "fence",
      shape: tool === "fenceRect" ? "rect" : "line",
      points: tool === "fenceRect" ? rectanglePoints(drawingStart, point) : [drawingStart, point],
      style: fenceStyle,
      weight: fenceWeight,
    };
    commit({ ...document, objects: [...document.objects, object] });
    setSelectedId(object.id);
    setDrawingStart(null);
    setPointerPoint(null);
  };

  const finishRoad = () => {
    if (roadPoints.length < 2) return;
    const object: RoadObject = { id: uid(), type: "road", points: roadPoints, style: roadStyle, width: roadWidth };
    commit({ ...document, objects: [...document.objects, object] });
    setSelectedId(object.id);
    setRoadPoints([]);
    setPointerPoint(null);
  };

  const placeHorse = (horse: Horse, point?: MapPoint) => {
    const existing = document.objects.find((object): object is HorseObject => object.type === "horse" && (object.horseId === horse.id || object.name === horse.name));
    if (existing && !point) {
      setTool("select");
      setSelectedId(existing.id);
      return;
    }
    const target = point ?? { x: document.canvas.width * .62, y: document.canvas.height * .42 };
    if (existing) {
      const next = document.objects.map((object) => object.id === existing.id ? { ...existing, x: target.x, y: target.y } : object);
      commit({ ...document, objects: next });
      setSelectedId(existing.id);
    } else {
      const object: HorseObject = { id: uid(), type: "horse", horseId: horse.id, name: horse.name, x: target.x, y: target.y };
      commit({ ...document, objects: [...document.objects, object] });
      setSelectedId(object.id);
    }
    setTool("select");
  };

  const chooseHorse = (horse: Horse) => {
    const existing = document.objects.find((object): object is HorseObject => object.type === "horse" && (object.horseId === horse.id || object.name === horse.name));
    if (existing) {
      setPendingHorse(null);
      setTool("select");
      setSelectedId(existing.id);
      setMessage(`${horse.name} on kaardil valitud.`);
      return;
    }
    setPendingHorse(horse);
    setTool("select");
    setSelectedId(null);
    setMessage(`Puuduta kaardil kohta, kuhu ${horse.name} paigutada.`);
  };

  const onHorseDragStart = (event: DragEvent<HTMLButtonElement>, horse: Horse) => {
    setPendingHorse(null);
    event.dataTransfer.setData("application/x-ponimetsa-horse", JSON.stringify(horse));
    event.dataTransfer.effectAllowed = "move";
  };

  const onMapDrop = (event: DragEvent<SVGSVGElement>) => {
    event.preventDefault();
    const raw = event.dataTransfer.getData("application/x-ponimetsa-horse");
    if (!raw) return;
    try {
      placeHorse(JSON.parse(raw) as Horse, pointFromClient(event.clientX, event.clientY));
    } catch {
      setError("Hobuse kaardile lisamine ebaõnnestus.");
    }
  };

  const persist = async (action: "save" | "publish") => {
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch("/api/admin/stable-map", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, map: document }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Salvestamine ebaõnnestus");
      setDirty(false);
      if (result.publishedAt) setPublishedAt(result.publishedAt);
      setMessage(action === "publish" ? "Kaart on suurele ekraanile avaldatud." : "Mustand on salvestatud.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Salvestamine ebaõnnestus");
    } finally {
      setBusy(false);
    }
  };

  const exportProject = () => {
    const blob = new Blob([JSON.stringify(document, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = window.document.createElement("a");
    anchor.href = url;
    anchor.download = "ponimetsa-kopliplaan.json";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const importProject = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const imported = parseStableMapDocument(JSON.parse(await file.text()));
      commit(imported);
      setSelectedId(null);
      setMessage("Projektifail avati. Muudatuste säilitamiseks salvesta mustand.");
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Projektifaili avamine ebaõnnestus");
    }
  };

  const placedHorseIds = new Set(document.objects.filter((object): object is HorseObject => object.type === "horse").map((object) => object.horseId));
  const selectedObject = document.objects.find((object) => object.id === selectedId);
  const instruction = pendingHorse
    ? `Puuduta kaardil kohta, kuhu ${pendingHorse.name} paigutada.`
    : tool === "pan"
      ? "Lohista kaarti sobiva ala leidmiseks. See režiim ei liiguta objekte."
      : tool === "select"
    ? "Vali ja lohista objekti. Valitud aia või tee rohelisi punkte lohistades muudad selle pikkust, nurka või kuju."
    : tool === "road"
      ? "Klõpsa teeraja murdepunktid ning vajuta „Lõpeta tee“."
      : "Lohista kaardil alguspunktist lõpp-punkti.";

  return (
    <div className={styles.shell}>
      <header className={styles.topbar}>
        <div className={styles.title}><strong>Ponimetsa kopliplaan</strong><span>{formatPublishedAt(publishedAt)}</span></div>
        <div className={`${styles.tools} ${styles.editTools}`}>
          <button className={`${styles.button} ${tool === "select" && !pendingHorse ? styles.active : ""}`} onClick={() => { setTool("select"); setPendingHorse(null); }}>Vali</button>
          <button className={`${styles.button} ${tool === "pan" ? styles.active : ""}`} onClick={() => { setTool("pan"); setPendingHorse(null); }}>Nihuta kaarti</button>
          <button className={styles.button} onClick={undo} disabled={!history.length}>↶ Tagasi</button>
          <button className={styles.button} onClick={redo} disabled={!future.length}>↷ Uuesti</button>
          <button className={styles.button} onClick={duplicateSelected} disabled={!selectedObject || selectedObject.type === "horse"}>Kopeeri</button>
          <button className={styles.danger} onClick={deleteSelected} disabled={!selectedId}>Kustuta</button>
        </div>
        <div className={styles.spacer} />
        <Link className={`${styles.button} ${styles.secondaryNav}`} href="/admin">Admin</Link>
        <Link className={`${styles.button} ${styles.secondaryNav}`} href="/display/stable" target="_blank">TV eelvaade</Link>
        <button className={styles.primary} onClick={() => persist("save")} disabled={busy}>Salvesta mustand</button>
        <button className={styles.publish} onClick={() => persist("publish")} disabled={busy}>Avalda ekraanile</button>
      </header>

      <main className={styles.layout}>
        <aside className={styles.sidebar}>
          <nav className={styles.mobileTabs} aria-label="Kaardiredaktori tööriistad">
            <button className={mobilePanel === "horses" ? styles.mobileTabActive : ""} onClick={() => setMobilePanel("horses")}>Hobused</button>
            <button className={mobilePanel === "draw" ? styles.mobileTabActive : ""} onClick={() => setMobilePanel("draw")}>Joonista</button>
            <button className={mobilePanel === "project" ? styles.mobileTabActive : ""} onClick={() => setMobilePanel("project")}>Rohkem</button>
          </nav>
          {error || pendingHorse || message ? (
            <div className={`${styles.mobileNotice} ${error ? styles.mobileNoticeError : ""}`} role={error ? "alert" : "status"}>
              {error ?? (pendingHorse ? `Puuduta kaardil kohta, kuhu ${pendingHorse.name} paigutada.` : message)}
            </div>
          ) : null}

          <section className={`${styles.group} ${mobilePanel !== "draw" ? styles.mobilePanelHidden : ""}`}>
            <h2>Joonistamine</h2>
            <div className={styles.tools}>
              <button className={`${styles.button} ${tool === "fenceLine" ? styles.active : ""}`} onClick={() => { setTool("fenceLine"); setPendingHorse(null); }}>Aia joon</button>
              <button className={`${styles.button} ${tool === "fenceRect" ? styles.active : ""}`} onClick={() => { setTool("fenceRect"); setPendingHorse(null); }}>Aia ristkülik</button>
              <button className={`${styles.button} ${tool === "road" ? styles.active : ""}`} onClick={() => { setTool("road"); setPendingHorse(null); }}>Teerada</button>
              {roadPoints.length ? <button className={styles.primary} onClick={finishRoad} disabled={roadPoints.length < 2}>Lõpeta tee</button> : null}
            </div>
            <label className={styles.field}>Aia välimus
              <select value={fenceStyle} onChange={(event) => setFenceStyle(event.target.value as FenceObject["style"])}><option value="wood">Puitaed</option><option value="tape">Valge lint</option><option value="temporary">Ajutine koppel</option></select>
            </label>
            <label className={styles.field}>Aia jämedus: {fenceWeight}%
              <input type="range" min="30" max="180" step="10" value={fenceWeight} onChange={(event) => setFenceWeight(Number(event.target.value))} />
            </label>
            <label className={styles.field}>Tee välimus
              <select value={roadStyle} onChange={(event) => setRoadStyle(event.target.value as RoadObject["style"])}><option value="gravel">Kruusatee</option><option value="asphalt">Asfalt</option></select>
            </label>
            <label className={styles.field}>Tee laius: {roadWidth}
              <input type="range" min="12" max="54" step="2" value={roadWidth} onChange={(event) => setRoadWidth(Number(event.target.value))} />
            </label>
          </section>

          <section className={`${styles.group} ${mobilePanel !== "horses" ? styles.mobilePanelHidden : ""}`}>
            <h2>Hobused</h2>
            <p>Puuduta nime ja seejärel sobivat kohta kaardil. Arvutis saad nime ka lohistada.</p>
            <div className={styles.horseList}>
              {horses.map((horse) => {
                const placed = placedHorseIds.has(horse.id) || document.objects.some((object) => object.type === "horse" && object.name === horse.name);
                return (
                  <button key={horse.id} draggable onDragStart={(event) => onHorseDragStart(event, horse)} onClick={() => chooseHorse(horse)} className={`${styles.horse} ${placed ? styles.horsePlaced : ""} ${pendingHorse?.id === horse.id ? styles.horsePending : ""}`}>
                    <span className={styles.horseDot} /><span className={styles.horseName}>{horse.name}</span><span className={styles.horseState}>{placed ? "kaardil" : pendingHorse?.id === horse.id ? "vali koht" : "puuduta"}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className={`${styles.group} ${mobilePanel !== "project" ? styles.mobilePanelHidden : ""}`}>
            <h2>Projektifail</h2>
            <p>Impordiga saad avada prototüübist salvestatud JSON-projekti.</p>
            <div className={styles.tools}>
              <button className={styles.button} onClick={() => fileInputRef.current?.click()}>Ava JSON</button>
              <button className={styles.button} onClick={exportProject}>Laadi JSON</button>
            </div>
            <input ref={fileInputRef} className={styles.hiddenInput} type="file" accept="application/json,.json" onChange={importProject} />
          </section>
        </aside>

        <section className={styles.stage}>
          <div className={styles.mapViewport} ref={stageRef}>
            <div className={styles.mapSurface} style={{ width: `${zoom * 100}%` }}>
              <StableMap
                map={renderedMap}
                selectedId={selectedId}
                interactive
                onObjectPointerDown={onObjectPointerDown}
                onHandlePointerDown={onHandlePointerDown}
                svgRef={svgRef}
                className={tool === "pan" ? styles.mapPan : tool !== "select" ? styles.mapCrosshair : undefined}
                svgProps={{
                  onPointerDown: onMapPointerDown,
                  onPointerMove: onMapPointerMove,
                  onPointerUp: onMapPointerUp,
                  onPointerCancel: onMapPointerUp,
                  onDragOver: (event) => event.preventDefault(),
                  onDrop: onMapDrop,
                }}
              />
            </div>
          </div>
          <div className={styles.zoomControls} aria-label="Kaardi suurendus">
            <button onClick={() => setZoom((value) => Math.max(1, Number((value - .25).toFixed(2))))} aria-label="Vähenda kaarti">−</button>
            <span>{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom((value) => Math.min(3.5, Number((value + .25).toFixed(2))))} aria-label="Suurenda kaarti">+</button>
          </div>
          <div className={styles.status}>
            <span><strong>{pendingHorse ? "Paiguta hobune" : tool === "select" ? "Vali" : tool === "pan" ? "Nihuta" : tool === "road" ? "Teerada" : "Aed"}:</strong> {instruction}</span>
            <span>{dirty ? <><i className={styles.dirty} />Salvestamata</> : "Salvestatud"} · {document.objects.length} objekti</span>
            {message ? <span className={styles.message}>{message}</span> : null}
            {error ? <span className={styles.error}>{error}</span> : null}
          </div>
        </section>
      </main>
    </div>
  );
}
