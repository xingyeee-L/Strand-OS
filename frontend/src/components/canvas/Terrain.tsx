// @ts-nocheck
import { useRef, useLayoutEffect } from 'react';
import * as THREE from 'three';
import { getTerrainHeight, WATER_LEVEL } from '../../utils/terrain';
import { MeshDistortMaterial } from '@react-three/drei';

// ==========================================
// 1. 开罗尔之海 (黑金流体 - 增强版)
// ==========================================
function LivingSea() {
  return (
    <group>
      {/* 液态表面 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, WATER_LEVEL, 0]}>
        <planeGeometry args={[500, 500, 128, 128]} />
        <MeshDistortMaterial
          color="#000000"      // 底色：纯黑
          emissive="#ffaa00"   // 金色辉光
          emissiveIntensity={0.5} // 🔥 提亮：从 0.3 -> 0.5
          attach="material"
          distort={0.4}        // 增加波动幅度
          speed={1.5}
          roughness={0.1}
          metalness={1.0}
        />
      </mesh>
      {/* 水面辅助网格 (稍微抬高一点点，防止闪烁) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, WATER_LEVEL + 0.2, 0]}>
        <planeGeometry args={[500, 500, 64, 64]} />
        <meshBasicMaterial color="#ffaa00" wireframe={true} transparent opacity={0.08} />
      </mesh>
    </group>
  );
}

// ==========================================
// 2. 地形组件 (高对比度 + 苔藓强化)
// ==========================================
export default function Terrain() {
  const meshRef = useRef(null);
  const wireframeRef = useRef(null);
  const size = [500, 500, 150, 150];

  useLayoutEffect(() => {
    if (meshRef.current && wireframeRef.current) {
      const geometry = meshRef.current.geometry;
      const { position } = geometry.attributes;
      
      const colors = new Float32Array(position.count * 3);
      const colorObj = new THREE.Color();

      for (let i = 0; i < position.count; i++) {
        const x = position.getX(i);
        const y = position.getY(i);
        const height = getTerrainHeight(x, y);
        
        // 同步几何体高度
        position.setZ(i, height);

        // --- 🎨 顶点着色 (Neon Moss Theme) ---
        
        if (height < WATER_LEVEL + 1.5) {
            // A. 岸边 (焦油黑)
            colorObj.setRGB(0.02, 0.02, 0.02); 
        } else if (height < 6) {
            // B. 🔥 苔藓平原 (高亮全息绿)
            // 之前的颜色太暗，现在调得更鲜艳、更“毒”一点
            // R:0.0, G:0.6, B:0.3 (典型的赛博绿)
            const noise = Math.random() * 0.1;
            colorObj.setRGB(0.0, 0.5 + noise, 0.25); 
        } else if (height < 18) {
            // C. 玄武岩山体 (深青灰)
            const t = (height - 6) / 12;
            // 随着高度增加，从深青过渡到灰白
            colorObj.setRGB(0.1 + t*0.2, 0.15 + t*0.2, 0.2 + t*0.2);
        } else {
            // D. 山顶 (发光白)
            colorObj.setRGB(0.9, 0.95, 1.0); 
        }

        colors[i * 3] = colorObj.r;
        colors[i * 3 + 1] = colorObj.g;
        colors[i * 3 + 2] = colorObj.b;
      }
      
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      position.needsUpdate = true;
      geometry.computeVertexNormals();
      // 线框层同步几何体
      wireframeRef.current.geometry = geometry;
    }
  }, []);

  return (
    <group>
      <LivingSea />
      
      <group rotation={[-Math.PI / 2, 0, 0]}>
        {/* 1. 实体地形层 */}
        {/* 1. 实体地形层 */}
        <mesh 
          name="ground-mesh" // 🔥 [关键]：给地形起个名，方便雷达锁定
          ref={meshRef} 
          receiveShadow 
          castShadow
        >
          <planeGeometry args={size} />
          <meshStandardMaterial 
            vertexColors={true} 
            roughness={0.6} // 稍微光滑一点，反射光线
            metalness={0.4} // 增加金属感，像外星地表
            flatShading={true} // 低多边形风格
            // 🔥 自发光：让颜色在黑暗中透出来
            emissive="#001122" 
            emissiveIntensity={0.4} 
          />
        </mesh>

        {/* 2. 线框辅助层 (极细、极淡) */}
        <mesh ref={wireframeRef} position={[0, 0, 0.02]}>
          <planeGeometry args={size} />
          <meshBasicMaterial 
            color="#00f2ff" // 还是用标志性的青色
            wireframe={true} 
            transparent 
            opacity={0.04} // 🔥 极低透明度，只在近处可见
          />
        </mesh>
      </group>
    </group>
  );
}