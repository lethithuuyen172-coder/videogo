import { Panel } from "@/components/Panel";
import { CanvasToolbar } from "../components/CanvasToolbar";
import { CanvasWorkspace } from "../components/CanvasWorkspace";
import { ComponentPanel } from "../components/ComponentPanel";
import { LayerPanel } from "../components/LayerPanel";

export default async function CanvasEditorPage({ params }: { params: Promise<{ canvasId: string }> }) {
  const { canvasId } = await params;
  return (
    <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
      <Panel title="图层与组件">
        <LayerPanel />
        <div className="mt-4">
          <ComponentPanel />
        </div>
      </Panel>
      <section className="overflow-hidden rounded-md border border-line bg-white">
        <CanvasToolbar title={`画布 ${canvasId}`} />
        <CanvasWorkspace />
      </section>
    </div>
  );
}
