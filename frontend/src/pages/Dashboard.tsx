// @ts-nocheck
import { useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import { useGameStore } from '../store/store';

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
  const { centerNode, neighbors, activeNodeId, initWorld, jumpTo } = useGameStore();

  useEffect(() => {
    initWorld();
  }, [initWorld]);

  return (
    <div className="w-full h-screen bg-black overflow-hidden relative selection:bg-cyan-500/30 font-mono">
      
      {/* 1. 3D World Layer (保持不变，含 Stars) */}
      <Canvas shadows camera={{ position: [0, 60, 100], fov: 55 }} gl={{ antialias: false }}>
        <fog attach="fog" args={['#000', 40, 150]} />
        <ambientLight intensity={0.1} />
        <pointLight position={[10, 50, 10]} intensity={1} color="#00f2ff" />
        <pointLight position={[-20, 50, -20]} intensity={0.5} color="#ffaa00" />
        <Stars radius={200} depth={50} count={5000} factor={4} saturation={0} />
        
        <Terrain />
        <NetworkLines onHoverLink={() => {}} />
        <CameraController />

        {centerNode && (
          <NodeMarker 
            key={centerNode.id} 
            node={centerNode} 
            isActive={true} 
            isRelated={false} 
            onClick={() => {}} 
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
    </div>
  );
}