// @ts-nocheck
import { useRef, useMemo, useState, useLayoutEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber'; // 引入 useThree 获取场景
import { Text, Billboard, Float, Line } from '@react-three/drei';
import * as THREE from 'three';
import { getTerrainHeight } from '../../utils/terrain';

export default function NodeMarker({ node, isActive, isRelated, onClick }) {
  const innerMesh = useRef(null);
  const outerMesh = useRef(null);
  const { scene } = useThree(); // 获取 3D 场景实例

  const [x, , z] = node.position || [0, 0, 0];
  
  // 1. 数学高度 (作为兜底初始值)
  const mathY = useMemo(() => getTerrainHeight(x, z), [x, z]);
  
  // 2. 真实高度 (通过物理检测更新)
  const [groundY, setGroundY] = useState(mathY);

  // 🔥 [核心修复]：物理射线检测 (Raycasting)
  // 就像无人机着陆一样，发射激光探测真实地面高度
  useLayoutEffect(() => {
    const terrainMesh = scene.getObjectByName('ground-mesh');
    if (terrainMesh) {
      // 创建射线：从高空 (y=100) 向下 (y=-1) 发射
      const raycaster = new THREE.Raycaster();
      const origin = new THREE.Vector3(x, 100, z);
      const direction = new THREE.Vector3(0, -1, 0);
      
      raycaster.set(origin, direction);
      
      // 检测碰撞
      const hits = raycaster.intersectObject(terrainMesh);
      if (hits.length > 0) {
        // 击中点就是绝对精准的地面
        // 稍微加 0.05 防止 Z-Fighting (贴图闪烁)
        setGroundY(hits[0].point.y + 0.05); 
      }
    }
  }, [x, z, scene]); // 当坐标改变时重新探测

  // 3. 晶体悬浮参数
  const hoverHeight = 6.0;
  const crystalY = groundY + hoverHeight;

  useFrame((state, delta) => {
    const speed = isActive || node.is_linked ? 2 : 0.5;
    if (innerMesh.current) {
        innerMesh.current.rotation.y += delta * speed;
        innerMesh.current.rotation.z += delta * (speed * 0.5);
    }
    if (outerMesh.current) {
        outerMesh.current.rotation.y -= delta * (speed * 0.3);
        outerMesh.current.rotation.x += delta * (speed * 0.2);
    }
  });

  let color = "#00f2ff";       
  let glowIntensity = 1.5;     

  if (isActive) {
    color = "#ffaa00";         
    glowIntensity = 5.0;       
  } else if (node.is_linked) {
    color = "#FFD700";         
    glowIntensity = 3.0;       
  } else if (node.is_mission_target) {
    color = "#FFFF00";         
    glowIntensity = 2.0;
  }

  const textColor = (isActive || node.is_linked) ? color : (isRelated ? "#00e0ff" : "#888");
  const textOpacity = isActive ? 1 : 0.8;
  const nodeOpacity = (isActive || node.is_linked) ? 1.0 : 0.6;

  return (
    <group position={[x, 0, z]}>
      
      {/* 悬浮晶体 */}
      <Float speed={2} rotationIntensity={0} floatIntensity={0.5} floatingRange={[-0.2, 0.2]} position={[0, crystalY, 0]}>
        <mesh 
          ref={innerMesh} 
          onClick={(e) => { e.stopPropagation(); onClick(node.id); }}
          scale={isActive ? 1.0 : 0.6}
        >
          <octahedronGeometry args={[1, 0]} />
          <meshStandardMaterial 
            color={color} 
            emissive={color} 
            emissiveIntensity={glowIntensity}
            toneMapped={false}
            transparent
            opacity={nodeOpacity}
          />
        </mesh>

        <mesh ref={outerMesh} scale={isActive ? 1.4 : 0.9}>
          <icosahedronGeometry args={[1, 0]} />
          <meshBasicMaterial 
            color={color} 
            wireframe={true} 
            transparent
            opacity={isActive ? 0.8 : 0.2}
            toneMapped={false}
          />
        </mesh>
        
        <Billboard position={[0, 2.2, 0]}>
            <Text 
              fontSize={isActive ? 1.8 : 1.0} 
              color={textColor} 
              anchorX="center" 
              anchorY="middle" 
              fillOpacity={textOpacity} 
              outlineWidth={0.05} 
              outlineColor="#000000"
            >
              {node.id}
            </Text>
        </Billboard>
      </Float>
      
      {/* 能量束连接 */}
      <Line
        points={[[0, groundY, 0], [0, crystalY - 0.8, 0]]} 
        color={color}
        lineWidth={1}
        dashed={true}
        dashScale={5}
        dashSize={0.2}
        gapSize={0.1}
        opacity={0.3}
        transparent
        toneMapped={false}
      />
      
      {/* 地面底座 (现在使用的是 Raycast 算出来的真实 groundY) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, groundY, 0]}>
        <ringGeometry args={[0.3, 0.5, 32]} />
        <meshBasicMaterial color={color} transparent opacity={isActive ? 0.8 : 0.3} side={THREE.DoubleSide} />
      </mesh>

      {/* --- DEBUG PROBE (红球) --- */}
      {/* 如果红球和底座重合，说明修复成功；如果红球悬空，说明 groundY 算得准 */}
      {/* <mesh position={[0, groundY, 0]}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshBasicMaterial color="red" depthTest={false} />
      </mesh> */}
    </group>
  );
}