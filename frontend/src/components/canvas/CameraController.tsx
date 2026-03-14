// @ts-nocheck
import { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { easing } from 'maath';
import { useGameStore } from '../../store/store';
import { getTerrainHeight, WATER_LEVEL } from '../../utils/terrain';

export default function CameraController() {
  const centerNode = useGameStore((state) => state.centerNode);
  const { scene } = useThree();

  const controls = useRef(null);
  const lastNodeId = useRef<string | null>(null);

  // 战术数据记录
  const flightState = useRef({
    isFlying: false,
    distance: 0,
    initialFov: 20 // 对应 Dashboard 里的初始 FOV
  });

  // 物理探测射线
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const downVec = useMemo(() => new THREE.Vector3(0, -1, 0), []);

  const getPhysicalHeight = (x: number, z: number) => {
    const terrainMesh = scene.getObjectByName('ground-mesh');
    if (terrainMesh) {
      raycaster.set(new THREE.Vector3(x, 100, z), downVec);
      const hits = raycaster.intersectObject(terrainMesh);
      if (hits.length > 0) return hits[0].point.y;
    }
    return getTerrainHeight(x, z);
  };

  useFrame((state, delta) => {
    if (!centerNode || !controls.current) return;

    // --- 1. 目标点精确计算 ---
    const [tx, , tz] = centerNode.position;
    const rawGroundY = getPhysicalHeight(tx, tz);
    const effectiveGroundY = Math.max(rawGroundY, WATER_LEVEL);

    // 战术偏移：维持在晶体(6.0)下方 5 米，确保构图在屏幕中上部
    const VIEW_OFFSET_Y = -5.0;
    const targetY = effectiveGroundY + 6.0 + VIEW_OFFSET_Y;
    const targetPos = new THREE.Vector3(tx, targetY, tz);

    // --- 2. 飞行状态判定 ---
    if (centerNode.id !== lastNodeId.current) {
      // 信号同步：检测到大距离跳跃
      const dist = state.camera.position.distanceTo(targetPos);
      flightState.current.isFlying = true;
      flightState.current.distance = dist;
      lastNodeId.current = centerNode.id;

      // 初始安装
      if (!lastNodeId.current) {
        controls.current.target.copy(targetPos);
        state.camera.position.set(tx + 40, targetY + 30, tz + 40);
      }
    }

    // --- 3. 动态运镜引擎 ---

    // A. 计算相机相对于焦点的“战术偏移”
    // 即使在跳跃，我们也希望保持用户当前的旋转角度
    const currentOffset = new THREE.Vector3().subVectors(state.camera.position, controls.current.target);
    const idealCameraPos = targetPos.clone().add(currentOffset);

    // B. 差异化阻尼 (Damping)
    // 焦点(Target)移动稍快 (0.15s)，相机(Position)移动稍慢 (0.3s)
    // 这种微差会产生一种“镜头追逐目标”的电影感
    easing.damp3(controls.current.target, targetPos, 0.15, delta);
    easing.damp3(state.camera.position, idealCameraPos, 0.3, delta);

    // C. 动态视野 (FOV Kick)
    // 当相机离目标还很远时，增大 FOV 产生速度感
    const currentDist = controls.current.target.distanceTo(targetPos);
    const fovTarget = currentDist > 5 ? flightState.current.initialFov + 15 : flightState.current.initialFov;
    easing.damp(state.camera, 'fov', fovTarget, 0.4, delta);
    state.camera.updateProjectionMatrix();

    // D. 飞行高度修正 (Anti-Clipping)
    // 如果正在飞行中，强制让相机位置 Y 轴不要低于当前位置的地形高度
    const camTerrainY = getPhysicalHeight(state.camera.position.x, state.camera.position.z);
    if (state.camera.position.y < camTerrainY + 10) {
      state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, camTerrainY + 15, 0.1);
    }

    // --- 4. 状态收敛 ---
    if (currentDist < 0.1) {
      flightState.current.isFlying = false;
    }

    controls.current.update();
  });

  return (
    <OrbitControls
      ref={controls}
      enableRotate={true}
      enableZoom={true}
      enablePan={false}
      maxPolarAngle={Math.PI / 2 - 0.1} // 禁止进入地底
      minDistance={15}
      maxDistance={450}
      rotateSpeed={0.5}
      dampingFactor={0.08} // 稍微增加旋转惯性
    />
  );
}
