import { useMemo, type ReactElement } from 'react';
import { QuadraticBezierLine, Line } from '@react-three/drei';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber'; // 🔥 引入场景访问权限
import { useGameStore } from '../../store/store';
import { useShallow } from 'zustand/react/shallow';
// getTerrainHeight 仅作为射线打不到时的兜底
import { getTerrainHeight } from '../../utils/terrain';

// 🔥 必须与 NodeMarker 保持一致
const CRYSTAL_HOVER_HEIGHT = 6.0;

type NetworkLinesProps = {
  onHoverLink?: (narrative: string | null) => void;
};

type NeighborNode = {
  id: string;
  position?: [number, number, number];
  is_linked?: boolean;
  narrative?: string;
};

type CenterNode = {
  position?: [number, number, number];
};

export default function NetworkLines({ onHoverLink }: NetworkLinesProps) {
  const { centerNode, neighbors } = useGameStore(
    useShallow((state) => ({ centerNode: state.centerNode, neighbors: state.neighbors })),
  );
  const { scene } = useThree(); // 获取 3D 场景

  // 使用 useMemo 优化计算，依赖项加入 scene 确保地形加载后能重算
  const lines = useMemo(() => {
    const typedCenterNode = centerNode as CenterNode | null;
    const typedNeighbors = neighbors as NeighborNode[];

    if (!typedCenterNode?.position) return [];

    const terrainMesh = scene.getObjectByName('ground-mesh');

    const getTrueHeight = (x: number, z: number) => {
      if (terrainMesh) {
        const raycaster = new THREE.Raycaster();
        raycaster.set(new THREE.Vector3(x, 100, z), new THREE.Vector3(0, -1, 0));
        const hits = raycaster.intersectObject(terrainMesh);
        if (hits.length > 0) return hits[0].point.y;
      }
      return getTerrainHeight(x, z);
    };

    const getPos = (coords: [number, number, number]) => {
      const [x, , z] = coords;
      const trueGroundY = getTrueHeight(x, z);
      return new THREE.Vector3(x, trueGroundY + CRYSTAL_HOVER_HEIGHT, z);
    };

    const centerPos = getPos(typedCenterNode.position);
    const renderedLines: ReactElement[] = [];

    typedNeighbors.forEach((node) => {
      if (!node.position) return;

      const targetPos = getPos(node.position);

      // A. 已连接：金色贝塞尔曲线
      if (node.is_linked) {
        const mid = centerPos.clone().add(targetPos).multiplyScalar(0.5);

        // 中点避障计算
        // 也要用射线检测中点的地面高度，防止穿山
        const midGroundY = getTrueHeight(mid.x, mid.z);

        // 弧度算法：
        // 基础高度 = 两个端点中较高的那个
        // 避障高度 = 地形高度 + 3 (保证不穿山)
        const baseHeight = Math.max(centerPos.y, targetPos.y);
        const safeMidHeight = Math.max(baseHeight, midGroundY + 3);

        const dist = centerPos.distanceTo(targetPos);
        mid.y = safeMidHeight + dist * 0.15;

        renderedLines.push(
          <QuadraticBezierLine
            key={`link-${node.id}`}
            start={centerPos}
            end={targetPos}
            mid={mid}
            color="#FFD700"
            lineWidth={1.5}
            transparent
            opacity={0.8}
            toneMapped={false}
            onPointerOver={() => onHoverLink?.(node.narrative ?? null)}
            onPointerOut={() => onHoverLink?.(null)}
          />
        );
      }
      // B. 未连接：蓝色虚线
      else {
        renderedLines.push(
          <Line
            key={`scan-${node.id}`}
            points={[centerPos, targetPos]}
            color="#00f2ff"
            lineWidth={1}
            transparent
            opacity={0.15} // 稍微淡一点
            dashed={true}
            dashScale={10}
            dashSize={0.5}
            gapSize={0.5}
          />
        );
      }
    });

    return renderedLines;
  }, [centerNode, neighbors, scene, onHoverLink]); // 依赖 scene

  return <>{lines}</>;
}
