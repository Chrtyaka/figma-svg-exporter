import type { ComponentNode, InstanceNode } from '@figma/rest-api-spec';

export type { CanvasNode, FrameNode } from '@figma/rest-api-spec';

export type FindCanvasFilter = string;

export type FindFrameFilter = string;

export type ExportableEntity = ComponentNode | InstanceNode;
