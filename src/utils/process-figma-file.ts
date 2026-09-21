import type { DocumentNode, Node } from '@figma/rest-api-spec';
import type { ExportableEntities } from '../types/config';
import {
  CanvasNode,
  ExportableEntity,
  FindCanvasFilter,
  FindFrameFilter,
  FrameNode,
} from '../types/figma-file';

const ENTITY_NODE_TYPES = {
  components: 'COMPONENT',
  instances: 'INSTANCE',
} as const;

// Pre-order traversal of all nested nodes, at any depth
function* walkDescendants(node: Node): Generator<Node> {
  if (!('children' in node)) return;

  for (const child of node.children) {
    yield child;
    yield* walkDescendants(child);
  }
}

export function findCanvas(
  document: DocumentNode,
  filter: FindCanvasFilter,
): CanvasNode | undefined {
  return document.children.find(item => item.name === filter);
}

export function findFrameInCanvas(
  canvas: CanvasNode | DocumentNode,
  filter: FindFrameFilter,
): FrameNode | undefined {
  for (const node of walkDescendants(canvas)) {
    if (node.type === 'FRAME' && node.name === filter) return node;
  }

  return undefined;
}

export function findEntities(root: Node, entityTypes: ExportableEntities[]): ExportableEntity[] {
  const descendants = [...walkDescendants(root)];

  return entityTypes.flatMap(entityType =>
    descendants.filter(
      (node): node is ExportableEntity => node.type === ENTITY_NODE_TYPES[entityType],
    ),
  );
}
