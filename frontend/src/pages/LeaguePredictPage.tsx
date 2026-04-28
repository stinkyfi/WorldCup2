import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PredictionProgressBar } from "@/components/PredictionProgressBar";
import { WORLD_CUP_GROUPS, type WorldCupGroupId } from "@/lib/worldCupGroups";
import { cn } from "@/lib/utils";

function isAddress(s: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(s);
}

type GroupOrderState = Record<WorldCupGroupId, string[]>;

function initState(): GroupOrderState {
  return WORLD_CUP_GROUPS.reduce((acc, g) => {
    acc[g.id] = g.teams.map((t) => t.id);
    return acc;
  }, {} as GroupOrderState);
}

function groupComplete(order: string[] | undefined) {
  return Boolean(order && order.length === 4 && new Set(order).size === 4);
}

function SortableTeamRow({
  id,
  label,
}: {
  id: string;
  label: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex min-h-11 items-center justify-between rounded-md border border-border bg-background/40 px-3 py-2 text-sm",
        isDragging ? "opacity-70" : "",
      )}
      {...attributes}
      {...listeners}
    >
      <span className="font-medium text-foreground">{label}</span>
      <span className="text-xs text-muted-foreground">Drag</span>
    </div>
  );
}

export function LeaguePredictPage() {
  const { address = "" } = useParams();
  const isValidAddress = useMemo(() => isAddress(address), [address]);

  const [orderByGroup, setOrderByGroup] = useState<GroupOrderState>(() => initState());
  const [tiebreaker, setTiebreaker] = useState<string>("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const completedGroups = useMemo(
    () => WORLD_CUP_GROUPS.reduce((n, g) => n + (groupComplete(orderByGroup[g.id]) ? 1 : 0), 0),
    [orderByGroup],
  );
  const tiebreakerFilled = /^\d+$/.test(tiebreaker.trim()) && Number(tiebreaker.trim()) >= 1 && Number(tiebreaker.trim()) <= 1000;

  if (!isValidAddress) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="mb-3 text-2xl font-semibold">Make predictions</h1>
        <p className="mb-8 text-muted-foreground">Invalid league address.</p>
        <Button type="button" variant="secondary" asChild className="min-h-11">
          <Link to="/browse">Browse leagues</Link>
        </Button>
      </div>
    );
  }

  return (
    <div>
      <PredictionProgressBar completedGroups={completedGroups} totalGroups={12} tiebreakerFilled={tiebreakerFilled} />

      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Predictions</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Desktop drag-and-drop (mobile flow ships in Story 4.4).
            </p>
          </div>
          <Button type="button" variant="secondary" asChild className="min-h-11">
            <Link to={`/league/${address}`}>Back to league</Link>
          </Button>
        </div>

        <div className="mb-6 rounded-lg border border-border bg-card/40 p-4 text-sm text-muted-foreground lg:block hidden">
          Drag teams within each group to set positions 1–4.
        </div>
        <div className="mb-6 rounded-lg border border-border bg-card/40 p-4 text-sm text-muted-foreground lg:hidden">
          Mobile prediction UI ships in Story 4.4. Use a desktop-sized window for drag-and-drop.
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={({ active, over }) => {
            if (!over) return;
            const activeId = String(active.id);
            const overId = String(over.id);
            if (activeId === overId) return;
            const group = WORLD_CUP_GROUPS.find((g) => orderByGroup[g.id].includes(activeId));
            if (!group) return;
            const ids = orderByGroup[group.id];
            const oldIndex = ids.indexOf(activeId);
            const newIndex = ids.indexOf(overId);
            if (oldIndex === -1 || newIndex === -1) return;
            setOrderByGroup((prev) => ({ ...prev, [group.id]: arrayMove(prev[group.id], oldIndex, newIndex) }));
          }}
        >
          <div className="grid gap-4 lg:grid-cols-2">
            {WORLD_CUP_GROUPS.map((g) => {
              const order = orderByGroup[g.id];
              const teamById = new Map(g.teams.map((t) => [t.id, t.name] as const));
              return (
                <Card key={g.id}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">{g.label}</CardTitle>
                    <CardDescription>Positions 1–4</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <SortableContext items={order} strategy={verticalListSortingStrategy}>
                      {order.map((id, idx) => (
                        <div key={id} className="flex items-center gap-2">
                          <span className="w-6 text-xs font-mono text-muted-foreground">{idx + 1}</span>
                          <div className="flex-1">
                            <SortableTeamRow id={id} label={teamById.get(id) ?? id} />
                          </div>
                        </div>
                      ))}
                    </SortableContext>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </DndContext>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">Tiebreaker</CardTitle>
            <CardDescription>Predict total goals across all group stage matches (1–1000).</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-end gap-3">
            <div className="min-w-[16rem]">
              <label className="text-sm font-medium text-foreground" htmlFor="tiebreaker">
                Total goals
              </label>
              <input
                id="tiebreaker"
                value={tiebreaker}
                onChange={(e) => setTiebreaker(e.target.value)}
                inputMode="numeric"
                className="mt-2 min-h-11 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                placeholder="e.g. 142"
              />
            </div>
            <Button type="button" className="min-h-11" disabled>
              Submit (ships in Story 4.5)
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

