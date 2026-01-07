// @ts-nocheck
import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber'; // 🔥 引入 useThree
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { easing } from 'maath'; 
import { useGameStore } from '../../store/store';
// 引入数学公式作为射线打不到时的“备用方案”
import { getTerrainHeight, WATER_LEVEL } from '../../utils/terrain';

export default function CameraController() {
  const { centerNode } = useGameStore();
  const { scene } = useThree(); // 🔥 获取场景实例，用于物理探测
  
  const controls = useRef(null);
  const lastTargetPos = useRef(new THREE.Vector3());
  const isFirstRun = useRef(true);

  // 复用一个 Raycaster 实例，避免每帧创建产生垃圾回收
  const raycaster = useRef(new THREE.Raycaster());
  const downVec = useRef(new THREE.Vector3(0, -1, 0));

  // --- 辅助函数：获取真实的物理高度 ---
  const getPhysicalHeight = (x: number, z: number) => {
    // 1. 尝试物理射线检测 (最精准)
    const terrainMesh = scene.getObjectByName('ground-mesh');
    if (terrainMesh) {
      // 从高空向下发射射线
      raycaster.current.set(new THREE.Vector3(x, 100, z), downVec.current);
      const hits = raycaster.current.intersectObject(terrainMesh);
      if (hits.length > 0) {
        // 击中地形网格，返回真实高度
        return hits[0].point.y;
      }
    }
    // 2. 兜底方案：如果地形未加载或射线偏离，使用数学公式
    return getTerrainHeight(x, z);
  };

  useFrame((state, delta) => {
    if (!centerNode || !controls.current) return;

    const [tx, , tz] = centerNode.position;
    
    // 🔥 [核心同步]：计算逻辑与 NodeMarker 完全一致
    // 1. 获取物理地面高度
    const rawGroundY = getPhysicalHeight(tx, tz);
    
    // 2. 应用浮力逻辑 (如果在水下，则以水面为基准)
    const effectiveGroundY = Math.max(rawGroundY, WATER_LEVEL);
    
    // 3. 晶体悬浮高度 (必须与 NodeMarker 保持一致)
    const crystalH = 6.0;

    // 4. 战术偏移 (Tactical Framing)
    // -5.0 让晶体处于屏幕中上部，避开底部 UI
    const VIEW_OFFSET_Y = -5.0; 
    
    const targetY = effectiveGroundY + crystalH + VIEW_OFFSET_Y;

    // 最终目标点
    const currentTargetPos = new THREE.Vector3(tx, targetY, tz);

    // --- A. 初始化瞬间 ---
    if (isFirstRun.current) {
      controls.current.target.copy(currentTargetPos);
      state.camera.position.set(tx + 30, targetY + 25, tz + 40);
      lastTargetPos.current.copy(currentTargetPos);
      isFirstRun.current = false;
      return;
    }

    // --- B. 智能跟随 ---
    easing.damp3(controls.current.target, currentTargetPos, 0.25, delta);

    const offset = new THREE.Vector3().subVectors(currentTargetPos, lastTargetPos.current);
    
    if (offset.lengthSq() > 0.00001) {
        const idealCameraPos = state.camera.position.clone().add(offset);
        easing.damp3(state.camera.position, idealCameraPos, 0.25, delta);
        
        if (controls.current.target.distanceTo(currentTargetPos) < 0.1) {
             lastTargetPos.current.copy(currentTargetPos);
        } else {
             lastTargetPos.current.add(offset);
        }
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