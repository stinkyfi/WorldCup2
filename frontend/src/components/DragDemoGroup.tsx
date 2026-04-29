import { DndContext, PointerSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, MousePointer2 } from "lucide-react";
import { useMemo, useState } from "react";
import { TeamNameWithFlag } from "@/components/TeamWithFlag";
import { WORLD_CUP_GROUPS } from "@/lib/worldCupGroups";
import { cn } from "@/lib/utils";

function DemoRow({ id, label }: { id: string; label: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex min-h-11 items-center gap-2 rounded-lg border border-border/70 bg-background/35 px-3 py-2 text-sm shadow-inner shadow-black/10 transition-colors",
        "hover:border-accent/30 hover:bg-background/45",
        "cursor-grab active:cursor-grabbing",
        isDragging ? "opacity-70 ring-1 ring-accent/35" : "",
      )}
      {...attributes}
      {...listeners}
      title="Drag to reorder"
    >
      <GripVertical className="size-4 text-muted-foreground opacity-75 transition-opacity group-hover:opacity-100" />
      <span className="font-medium text-foreground">
        <TeamNameWithFlag teamName={label} />
      </span>
      <span className="ml-auto hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
        <MousePointer2 className="size-3.5" />
        <span>Drag</span>
      </span>
    </div>
  );
}

export function DragDemoGroup(props: { className?: string }) {
  const { className } = props;
  const group = WORLD_CUP_GROUPS.find((g) => g.id === "F") ?? WORLD_CUP_GROUPS[0]!;
  const teamById = useMemo(() => new Map(group.teams.map((t) => [t.id, t.name] as const)), [group.teams]);
  const [order, setOrder] = useState<string[]>(() => group.teams.map((t) => t.id));
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  return (
    <div className={cn("rounded-xl border border-border bg-card/40 p-4", className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-base font-semibold text-foreground">Try it</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Drag these teams to rank them. This is just a demo (doesn’t submit anything).
          </p>
        </div>
        <span className="rounded-full border border-accent/25 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
          {group.label} demo
        </span>
      </div>

      <div className="mt-3 space-y-2">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={({ active, over }) => {
            if (!over) return;
            const activeId = String(active.id);
            const overId = String(over.id);
            if (activeId === overId) return;
            const oldIndex = order.indexOf(activeId);
            const newIndex = order.indexOf(overId);
            if (oldIndex === -1 || newIndex === -1) return;
            setOrder((prev) => arrayMove(prev, oldIndex, newIndex));
          }}
        >
          <SortableContext items={order} strategy={verticalListSortingStrategy}>
            {order.map((id) => (
              <DemoRow key={id} id={id} label={teamById.get(id) ?? id} />
            ))}
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}

