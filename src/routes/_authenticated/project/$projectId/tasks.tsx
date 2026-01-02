import { convexQuery, useConvexMutation } from '@convex-dev/react-query';
import { Button } from '@/components/ui/button';
import { api } from '@convex/_generated/api';
import { createFileRoute, useBlocker } from '@tanstack/react-router';
import type { Id } from '@convex/_generated/dataModel';
import { useSuspenseQuery, useQueryClient } from '@tanstack/react-query';
import { memo, useCallback, useMemo, useEffect, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  type Node,
  type Edge,
  type Connection,
  type NodeTypes,
  type OnNodesChange,
  type OnEdgesChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import xyFlow from '@xyflow/react/dist/base.css?url';
import { TaskNode } from '@/components/dashboard/sidebar/TaskNode';
import type { TaskNodeData } from '@/components/dashboard/sidebar/TaskNode';
import { useDashboardContext } from '@/components/dashboard/context';
import { toast } from 'sonner';

export const Route = createFileRoute('/_authenticated/project/$projectId/tasks')({
  loader: async ({ context, params }) => {
    const projectId = params.projectId as Id<'projects'>;
    await Promise.all([
      context.queryClient.ensureQueryData(convexQuery(api.projects.get, { projectId })),
      context.queryClient.ensureQueryData(convexQuery(api.tasks.listForProject, { projectId })),
      context.queryClient.ensureQueryData(convexQuery(api.edges.listForProject, { projectId })),
    ]);
  },
  head: () => ({
    links: [{ rel: 'stylesheet', href: xyFlow }],
  }),
  component: RouteComponent,
});

const nodeTypes: NodeTypes = {
  task: TaskNode,
  default: TaskNode,
};

function RouteComponent() {
  const projectId = Route.useParams().projectId as Id<'projects'>;
  const queryClient = useQueryClient();
  const { userRole } = useDashboardContext();

  const [isDirty, setIsDirty] = useState(false);
  const { data: project } = useSuspenseQuery(convexQuery(api.projects.get, { projectId }));
  const { data: convexNodes } = useSuspenseQuery(convexQuery(api.tasks.listForProject, { projectId }));
  const { data: convexEdges } = useSuspenseQuery(convexQuery(api.edges.listForProject, { projectId }));

  const replaceGraph = useConvexMutation(api.graph.replaceProjectGraph);

  useBlocker({
    shouldBlockFn: () => {
      if (!isDirty) return false

      const shouldLeave = confirm('You have unsaved changes. Are you sure you want to leave?')
      return !shouldLeave
    },
  });
  
  const initialNodes = useMemo(() => (convexNodes || []) as Node[], [convexNodes]);
  const initialEdges = useMemo(() => (convexEdges || []) as Edge[], [convexEdges]);

  
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);


  
  useEffect(() => {
    if (convexNodes) {
      setNodes(convexNodes as Node[]);
    }
  }, [convexNodes, setNodes]);

  useEffect(() => {
    if (convexEdges) {
      setEdges(convexEdges as Edge[]);
    }
  }, [convexEdges, setEdges]);

  
  const onConnect = useCallback(
    (connection: Connection) => {
      setIsDirty(true);
      if (connection.source && connection.target) {
        setEdges((eds) => addEdge(connection, eds));
      }
    },
    [setEdges],
  );

  const onNodeDragStop = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      
      setIsDirty(true);
      setNodes((nds) =>
        nds.map((n) => (n.id === node.id ? { ...n, position: node.position } : n))
      );
    },
    [setNodes],
  );

  const addNewTask = useCallback(() => {
    const position = {
      x: Math.random() * 500,
      y: Math.random() * 500,
    };

    const newNode: Node = {
      id: crypto.randomUUID(),
      type: 'task',
      position,
      data: {
        label: `Task ${nodes.length + 1}`,
        status: 'todo',
        priority: 'medium',
      } as TaskNodeData,
    };

    setNodes((nds) => [...nds, newNode]);
    setIsDirty(true);
  }, [nodes.length, setNodes]);

  
  const handleSave = useCallback(async () => {
    await replaceGraph({
      projectId,
      nodes: nodes.map(({ id, type, position, data, width, height }) => ({
        id,
        type: type || 'task',
        position,
        data: data as TaskNodeData,
        width,
        height,
      })),
      edges: edges.map(({ source, target, type, sourceHandle, targetHandle, label, animated }) => ({
        source,
        target,
        type: type || 'default',
        sourceHandle: sourceHandle ?? undefined,
        targetHandle: targetHandle ?? undefined,
        label: typeof label === 'string' ? label : undefined,
        animated,
      })),
    });

    setIsDirty(false);
    toast.success('Graph saved successfully');
  }, [nodes, edges, projectId, replaceGraph]);

  
  const nodesForRender = useMemo(
    () =>
      nodes.map((n) => ({
        ...n,
        data: {
          ...(n.data as TaskNodeData),
          onUpdate: (nextData: TaskNodeData) => {
            setIsDirty(true);
            setNodes((nds) =>
              nds.map((x) => (x.id === n.id ? { ...x, data: nextData } : x))
            );
          },
        },
      })),
    [nodes, setNodes],
  );

  
  const layoutStyle = useMemo(
    () => ({ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column' as const }),
    [],
  );

  return (
    <div style={layoutStyle}>
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <h1 className="text-2xl font-bold">{project?.name ?? 'Project'}</h1>
        {userRole && (
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={addNewTask}
              className="px-4 py-2 "
              variant="outline"
            >
              Add Task
            </Button>
            <Button
              type="button"
              disabled={!isDirty}
              onClick={handleSave}
              className="px-4 py-2 "
            >
              Save
            </Button>
          </div>
        )}
      </div>
      <TasksGraph
        nodes={nodesForRender}
        edges={edges}
        onConnect={onConnect}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={onNodeDragStop}
      />
    </div>
  );
}

type TasksGraphProps = {
  nodes: Node[];
  edges: Edge[];
  onConnect: (connection: Connection) => void;
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onNodeDragStop: (_event: React.MouseEvent, node: Node) => void;
};

const TasksGraph = memo(function TasksGraph({
  nodes,
  edges,
  onConnect,
  onNodesChange,
  onEdgesChange,
  onNodeDragStop,
}: TasksGraphProps) {
  const layoutStyle = useMemo(
    () => ({ flex: 1, width: '100%', height: '100%', backgroundColor: '#ffffff' }),
    [],
  );
  const fitViewOptions = useMemo(() => ({ padding: 2 }), []);
  const defaultEdgeOptions = useMemo(() => ({ type: 'default' as const }), []);
  const proOptions = useMemo(() => ({ hideAttribution: true }), []);
  const snapGrid = useMemo(() => [15, 15] as [number, number], []);

  return (
    <div style={layoutStyle}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        zoomOnScroll={true}
        onlyRenderVisibleElements
        onConnect={onConnect}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={onNodeDragStop}
        fitView
        fitViewOptions={fitViewOptions}
        defaultEdgeOptions={defaultEdgeOptions}
        proOptions={proOptions}
        snapToGrid
        snapGrid={snapGrid}
        colorMode='dark'
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
});
