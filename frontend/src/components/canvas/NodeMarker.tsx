// @ts-nocheck
import { memo, useRef, useMemo, useState, useLayoutEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Text, Billboard, Float, Line, Html } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore, type GalaxyNode } from '../../store/store';
import { getTerrainHeight, WATER_LEVEL } from '../../utils/terrain';

interface NodeMarkerProps {
  node: GalaxyNode;
  isActive: boolean;
  isRelated: boolean;
  onClick: () => void;
}

export default memo(function NodeMarker({ node, isActive, isRelated, onClick }: NodeMarkerProps) {
  const innerMesh = useRef<THREE.Mesh>(null);
  const outerMesh = useRef<THREE.Mesh>(null);
  const { scene } = useThree();

  const isHovered = useGameStore((state) => state.hoveredNodeId === node.id);
  const setHoveredNodeId = useGameStore((state) => state.setHoveredNodeId);

  const [x, , z] = node.position || [0, 0, 0];
  const mathY = useMemo(() => getTerrainHeight(x, z), [x, z]);
  const [terrainY, setTerrainY] = useState(mathY);
  const groundY = Math.max(terrainY, WATER_LEVEL);
  const isFloating = groundY === WATER_LEVEL;
  const crystalY = groundY + 6.0;

  // 射线检测
  useLayoutEffect(() => {
    const terrainMesh = scene.getObjectByName('ground-mesh');
    if (terrainMesh) {
      const raycaster = new THREE.Raycaster();
      raycaster.set(new THREE.Vector3(x, 100, z), new THREE.Vector3(0, -1, 0));
      const hits = raycaster.intersectObject(terrainMesh);
      if (hits.length > 0) setTerrainY(hits[0].point.y + 0.05);
    }
  }, [x, z, scene]);

  // 动画
  useFrame((state, delta) => {
    const speed = isActive || node.is_linked ? 2 : 0.5;
    const waveY = isFloating ? Math.sin(state.clock.elapsedTime * 1.5 + x) * 0.2 : 0;

    if (innerMesh.current) {
      innerMesh.current.rotation.y += delta * speed;
      innerMesh.current.rotation.z += delta * (speed * 0.5);
      innerMesh.current.position.y = waveY * 0.3;

      if (isHovered) {
        const pulse = (Math.sin(state.clock.elapsedTime * 10) + 1);
        innerMesh.current.material.emissiveIntensity = 3 + pulse * 2;
      } else {
        innerMesh.current.material.emissiveIntensity = isActive ? 5.0 : (node.is_linked ? 3.0 : 1.5);
      }
    }
    if (outerMesh.current) {
      outerMesh.current.rotation.y -= delta * (speed * 0.3);
      outerMesh.current.rotation.x += delta * (speed * 0.2);
    }
  });

  // 颜色
  let color = "#00f2ff";
  let glowIntensity = 1.5;
  if (isActive) { color = "#ffaa00"; glowIntensity = 5.0; }
  else if (node.is_linked) { color = "#FFD700"; glowIntensity = 3.0; }
  else if (node.is_mission_target) { color = "#FFFF00"; glowIntensity = 2.0; }

  const textColor = (isActive || node.is_linked) ? color : (isRelated ? "#00e0ff" : "#888");
  const textOpacity = isActive ? 1 : 0.8;
  const nodeOpacity = (isActive || node.is_linked) ? 1.0 : 0.6;

  // 解析
  const parsedInfo = useMemo(() => {
    const content = node.content || "";
    // 依然剥离 [DE] 标签，但不用于变色，只为了让文本干净
    const langMatch = content.match(/^\[([A-Z]{2})\]\s*(.*)/);
    if (langMatch) return { lang: langMatch[1], text: langMatch[2] };
    return { lang: "MEM", text: content }; // 默认标记改为 MEM (Memory)
  }, [node.content]);

  return (
    <group position={[x, 0, z]}>

      {/* 🔥 [关键修改]：把事件监听器移到 Float 容器上，这样所有子元素（晶体+文字）都能触发 */}
      <Float
        speed={2}
        rotationIntensity={0}
        floatIntensity={0.5}
        floatingRange={[-0.2, 0.2]}
        position={[0, crystalY, 0]}
        onPointerOver={(e) => { e.stopPropagation(); setHoveredNodeId(node.id); }}
        onPointerOut={() => setHoveredNodeId(null)}
        onClick={(e) => { e.stopPropagation(); onClick(node.id); }} // 点击也统管了
      >

        {/* 内核 */}
        <mesh ref={innerMesh} scale={isActive ? 1.0 : 0.6}>
          <octahedronGeometry args={[1, 0]} />
          <meshStandardMaterial
            color={color} emissive={color} emissiveIntensity={glowIntensity}
            toneMapped={false} transparent opacity={nodeOpacity}
          />
        </mesh>

        {/* 外壳 */}
        <mesh ref={outerMesh} scale={isActive ? 1.4 : 0.9}>
          <icosahedronGeometry args={[1, 0]} />
          <meshBasicMaterial color={color} wireframe={true} transparent opacity={isActive ? 0.8 : 0.2} toneMapped={false} />
        </mesh>

        {/* 🔥 [关键修改]：恒定大小全息浮窗 */}
        <Html
          position={[0, 4.0, 0]}
          center
          zIndexRange={[100, 0]}
          style={{
            pointerEvents: 'none',
            opacity: isHovered ? 1 : 0,
            transform: `scale(${isHovered ? 1 : 0.8}) translateY(${isHovered ? 0 : '20px'})`,
            transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
          }}
        >
          {isHovered && (
            <div
              className="w-64 bg-black/90 backdrop-blur-md border-l-4 border-cyan-500 p-4 shadow-[0_0_30px_rgba(0,242,255,0.2)] flex flex-col gap-2 rounded-r-sm"
            >
              <div className="flex justify-between items-start">
                <span className="text-white font-black text-2xl tracking-tighter uppercase font-mono">{node.id}</span>
                {/* 统一使用青色标签 */}
                <span className="text-[10px] px-2 py-0.5 border border-cyan-500 text-cyan-500 font-bold rounded bg-cyan-950/30">
                  {parsedInfo.lang}
                </span>
              </div>
              <div className="text-[9px] text-cyan-600 font-mono tracking-widest flex items-center gap-2 uppercase">
                <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse"></span>
                Type: {node.relation || 'SCAN'}
              </div>
              <div className="text-xs text-gray-300 leading-relaxed font-serif italic border-t border-cyan-900/50 pt-2 max-h-32 overflow-hidden text-ellipsis">
                {parsedInfo.text}
              </div>
            </div>
          )}
        </Html>

        {/* 文字 Billboard */}
        <Billboard position={[0, 2.2, 0]}>
          <Text
            fontSize={isActive ? 1.8 : 1.0}
            color={textColor}
            anchorX="center" anchorY="middle"
            fillOpacity={textOpacity}
            outlineWidth={0.05} outlineColor="#000000"
          >
            {node.id}
          </Text>
        </Billboard>
      </Float>

      {/* 能量束 */}
      <Line
        points={[[0, groundY, 0], [0, crystalY - 0.8, 0]]}
        color={color} lineWidth={1} dashed={true} dashScale={5} opacity={0.3} transparent toneMapped={false}
      />

      {/* 底座 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, groundY + 0.05, 0]}>
        <ringGeometry args={[0.3, 0.5, 32]} />
        <meshBasicMaterial color={color} transparent opacity={isActive ? 0.8 : 0.3} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
});
