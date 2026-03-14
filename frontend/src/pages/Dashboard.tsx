// @ts-nocheck
import { useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import { useGameStore } from '../store/store';
import { useShallow } from 'zustand/react/shallow';

// Components (Canvas)
import Terrain from '../components/canvas/Terrain';
import NodeMarker from '../components/canvas/NodeMarker';
import NetworkLines from '../components/canvas/NetworkLines';
import CameraController from '../components/canvas/CameraController';
import Effects from '../components/canvas/Effects';

// UI Components (Overlay)
import HUD from '../components/ui/HUD';
import MissionBoard from '../components/ui/MissionBoard';
import DialogueBar from '../components/ui/DialogueBar';
import TargetHeader from '../components/ui/TargetHeader';

// ❌ 移除 DataUplink 引用
// import DataUplink from '../components/ui/DataUplink'; 

export default function Dashboard() {
  // ... (useGameStore, useEffect 保持不变) ...
  const { centerNode, neighbors, activeNodeId, initWorld, jumpTo, agentState } = useGameStore(
    useShallow((state) => ({
      centerNode: state.centerNode,
      neighbors: state.neighbors,
      activeNodeId: state.activeNodeId,
      initWorld: state.initWorld,
      jumpTo: state.jumpTo,
      agentState: state.agentState,
    })),
  );

  useEffect(() => {
    initWorld();
  }, [initWorld]);

  return (
    <div className="w-full h-screen bg-black overflow-hidden relative boot-enter">
      <Canvas shadows camera={{ position: [0, 60, 100], fov: 55 }} gl={{ antialias: false, preserveDrawingBuffer: true }}>

        {/* 🔥 1. 调亮环境色：背景由纯黑改为深灰色，防止对比度过激 */}
        <color attach="background" args={['#0a0a0c']} />

        {/* 🔥 2. 深度重构雾效：从 [40, 150] 扩展到 [100, 600] 
            这意味着 100米内完全清晰，600米外才彻底消失。 */}
        <fog attach="fog" args={['#0a0a0c', 100, 600]} />

        {/* 🔥 3. 增强环境光：从 0.1 提升到 0.5，让阴影处也能看清地形 */}
        <ambientLight intensity={0.5} />

        {/* 🔥 4. 增加顶置全局光：模拟天空的漫反射 */}
        <pointLight position={[0, 200, 0]} intensity={1.5} color="#00f2ff" />
        <pointLight position={[100, 100, 100]} intensity={1.0} color="#ffaa00" />

        <Stars radius={300} depth={60} count={8000} factor={7} saturation={0} />
        <Terrain />
        <NetworkLines />
        <CameraController />

        {centerNode && (
          <NodeMarker
            key={centerNode.id}
            node={centerNode}
            isActive={true}
            isRelated={false}
            onClick={() => { }}
          />
        )}

        {neighbors.map((node) => (
          <NodeMarker
            key={node.id}
            node={node}
            isActive={node.id === activeNodeId}
            isRelated={true}
            onClick={() => jumpTo(node.id)}
          />
        ))}

        <Effects />
      </Canvas>

      {/* 2. UI Overlay Layer */}
      <div className="absolute inset-0 pointer-events-none">
        <HUD />
        <TargetHeader /> {/* 现在这里包含了 Upload 按钮 */}
        <MissionBoard />
        <DialogueBar />
      </div>

      {/* 3. Vignette (保持不变) */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_50%,rgba(0,0,0,0.8)_100%)]"></div>

      {/* 4. 视觉扫描特效 (G5.9) */}
      {agentState === 'observing' && (
        <div className="absolute inset-0 pointer-events-none z-[100] animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-white/5 animate-pulse"></div>
          <div className="absolute top-0 left-0 w-full h-1 bg-cyan-400 shadow-[0_0_20px_#00ffff] animate-[scan_2s_linear_infinite]"></div>
          <div className="absolute inset-0 border-[40px] border-cyan-500/10 mix-blend-overlay"></div>
        </div>
      )}
    </div>
  );
}
