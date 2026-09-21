import { describe, it, expect } from 'vitest';
import type { DocumentNode } from '@figma/rest-api-spec';
import { findCanvas, findEntities, findFrameInCanvas } from '../process-figma-file';

// Only the fields the traversal relies on — full nodes carry dozens of required layout props
const MOCKED_DOCUMENT = {
  id: '0:0',
  name: 'Document',
  type: 'DOCUMENT',
  children: [
    {
      id: 'someId',
      name: 'TEST_CANVAS',
      type: 'CANVAS',
      children: [
        {
          id: 'someFrameId1',
          name: 'TEST_FRAME_1',
          type: 'FRAME',
          children: [{ id: 'component1', name: 'icon-1', type: 'COMPONENT', children: [] }],
        },
      ],
    },
    {
      id: 'someId2',
      name: 'TEST_CANVAS_2',
      type: 'CANVAS',
      children: [
        {
          id: 'group1',
          name: 'GROUP',
          type: 'GROUP',
          children: [
            {
              id: 'someFrameId2',
              name: 'TEST_FRAME_2',
              type: 'FRAME',
              children: [
                { id: 'instance1', name: 'instance-1', type: 'INSTANCE', children: [] },
                { id: 'component2', name: 'icon-2', type: 'COMPONENT', children: [] },
                {
                  id: 'group2',
                  name: 'NESTED_GROUP',
                  type: 'GROUP',
                  children: [{ id: 'component3', name: 'icon-3', type: 'COMPONENT' }],
                },
                { id: 'vector1', name: 'vector', type: 'VECTOR' },
              ],
            },
          ],
        },
      ],
    },
  ],
} as unknown as DocumentNode;

describe('process-figma-file.ts', () => {
  describe('findCanvas', () => {
    it('should find canvas', () => {
      const result = findCanvas(MOCKED_DOCUMENT, 'TEST_CANVAS_2');

      expect(result?.id).toBe('someId2');
      expect(result?.type).toBe('CANVAS');
    });

    it('should return undefined when canvas is missing', () => {
      expect(findCanvas(MOCKED_DOCUMENT, 'UNKNOWN')).toBeUndefined();
    });
  });

  describe('findFrameInCanvas', () => {
    it('should find nested frame in the whole document', () => {
      const result = findFrameInCanvas(MOCKED_DOCUMENT, 'TEST_FRAME_2');

      expect(result?.id).toEqual('someFrameId2');
      expect(result?.type).toEqual('FRAME');
    });

    it('should not find frame from another canvas', () => {
      const canvas = findCanvas(MOCKED_DOCUMENT, 'TEST_CANVAS');

      expect(canvas && findFrameInCanvas(canvas, 'TEST_FRAME_2')).toBeUndefined();
    });
  });

  describe('findEntities', () => {
    it('should collect components at any depth', () => {
      const result = findEntities(MOCKED_DOCUMENT, ['components']);

      expect(result.map(item => item.id)).toEqual(['component1', 'component2', 'component3']);
    });

    it('should scope entities to the given frame', () => {
      const frame = findFrameInCanvas(MOCKED_DOCUMENT, 'TEST_FRAME_2');
      const result = frame ? findEntities(frame, ['components', 'instances']) : [];

      expect(result.map(item => item.id)).toEqual(['component2', 'component3', 'instance1']);
    });
  });
});
