// FiS Academy - Interactive Learning Components
// Export all components for easy importing

// Skill Tree Components
export {
  SkillTreeVisualizer,
  SkillTreeEditor,
  type SkillNode,
  type SkillTree,
  type SkillTreeVisualizerProps,
} from './skill-tree/SkillTreeVisualizer';

// Code Editor Components
export {
  LiveCodeEditor,
  type SupportedLanguage,
  type CodeExecutionResult,
  type CodeEditorProps,
} from './code-editor/LiveCodeEditor';

export {
  DebugMode,
  type DebugState,
  type DebugStep,
  type DebugModeProps,
} from './code-editor/DebugMode';

export {
  CodeComparison,
  type CodeComparisonProps,
} from './code-editor/CodeComparison';

// ZegoCloud Streaming Components
export {
  ZegoStreamingRoom,
  StreamingRoomPage,
  type ZegoStreamConfig,
  type ZegoStreamingRoomProps,
} from './streaming/ZegoStreamingRoom';
