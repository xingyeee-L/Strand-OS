// @ts-nocheck
import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber'; 
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { easing } from 'maath'; 
import { useGameStore } from '../../store/store';
import { getTerrainHeight, WATER_LEVEL } from '../../utils/terrain';

export default function CameraController() {
  const { centerNode } = useGameStore();
  const { scene } = useThree(); 
  
  const controls = useRef(null);
  
  // 记录上一次的节点 ID，用于检测是否发生了 jumpTo
  const lastNodeId = useRef<string | null>(null);

  // 物理探测高度
  const raycaster = useRef(new THREE.Raycaster());
  const downVec = useRef(new THREE.Vector3(0, -1, 0));

  const getPhysicalHeight = (x: number, z: number) => {
    const terrainMesh = scene.getObjectByName('ground-mesh');
    if (terrainMesh) {
      raycaster.current.set(new THREE.Vector3(x, 100, z), downVec.current);
      const hits = raycaster.current.intersectObject(terrainMesh);
      if (hits.length > 0) return hits[0].point.y;
    }
    return getTerrainHeight(x, z);
  };

  useFrame((state, delta) => {
    if (!centerNode || !controls.current) return;

    // --- 1. 计算目标点 (LookAt) ---
    const [tx, , tz] = centerNode.position;
    const rawGroundY = getPhysicalHeight(tx, tz);
    const effectiveGroundY = Math.max(rawGroundY, WATER_LEVEL);
    const crystalH = 6.0;
    const VIEW_OFFSET_Y = -5.0; 
    const targetY = effectiveGroundY + crystalH + VIEW_OFFSET_Y;
    const targetPos = new THREE.Vector3(tx, targetY, tz);

    // --- 2. 镜头逻辑 (Cut vs Follow) ---
    
    // 情况 A: 刚初始化
    if (!lastNodeId.current) {
        controls.current.target.copy(targetPos);
        state.camera.position.set(tx + 30, targetY + 25, tz + 40);
        lastNodeId.current = centerNode.id;
        return;
    }

    // 情况 B: 发生了节点切换 (Jump)
    // 我们需要计算“理想机位”
    
    // 当前相机相对于旧目标的偏移量
    const currentOffset = new THREE.Vector3().subVectors(state.camera.position, controls.current.target);
    
    // 理想的新相机位置 = 新目标 + 偏移量
    const idealCameraPos = targetPos.clone().add(currentOffset);

    // 平滑移动 Target (视线焦点)
    // 0.25s 阻尼，快速响应
    easing.damp3(controls.current.target, targetPos, 0.25, delta);

    // 平滑移动 Camera (机位)
    // 这里是关键：即使 target 还没到，camera 也要开始往那边飞
    easing.damp3(state.camera.position, idealCameraPos, 0.25, delta);

    // 更新 ID 记录
    // 注意：这里不需要手动重置 lastNodeId，因为每一帧我们都在逼近新的 idealPos
    if (centerNode.id !== lastNodeId.current) {
        lastNodeId.current = centerNode.id;
        // 可选：如果距离太远（>200），可以直接瞬移或者加速阻尼
        // 但 0.25s 的阻尼通常足够处理大部分跳转
    }

    controls.current.update();
  });

  return (
    <OrbitControls 
      ref={controls}
      enableRotate={true}
      enableZoom={true}
      enablePan={false} 
      maxPolarAngle={Math.PI / 2 - 0.1}
      minDistance={10}
      maxDistance={150}
      rotateSpeed={0.6}
      dampingFactor={0.05}
    />
  );
}