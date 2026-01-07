import { createNoise2D } from 'simplex-noise';

const noise2D = createNoise2D(() => 0.5); 

const MOUNTAIN_HEIGHT = 25; 
export const WATER_LEVEL = -9;     

// 🔥 [核心] 获取单点精确高度 (用于底座)
export const getTerrainHeight = (x: number, z: number) => {
  // 1. 基础地形
  let y = noise2D(x * 0.01, z * 0.01) * MOUNTAIN_HEIGHT;
  
  // 2. 细节叠加
  y += noise2D(x * 0.04, z * 0.04) * 3;
  y += noise2D(x * 0.1, z * 0.1) * 0.5;

  // 3. 平原化
  if (y < 5) {
    y = y * 0.4; 
  }

  // 4. 边缘压低
  const dist = Math.sqrt(x*x + z*z);
  if (dist > 100) y -= (dist - 100) * 0.5;

  // 5. 河流切削
  if (y < WATER_LEVEL) {
    return WATER_LEVEL - 1; 
  }

  return y; // 返回纯净高度
};

// 安全高度 (仅用于防止连线穿模，不用于底座定位)
export const getSafeHeight = (x: number, z: number) => {
    // 采样周围，取最大值，防止穿模
    // 依然保留这个函数给 NetworkLines 使用
    const radius = 2; 
    const samples = [
        getTerrainHeight(x, z),
        getTerrainHeight(x + radius, z),
        getTerrainHeight(x - radius, z),
        getTerrainHeight(x, z + radius),
        getTerrainHeight(x, z - radius),
    ];
    let maxH = Math.max(...samples);

    if (maxH < WATER_LEVEL + 3) {
        maxH = WATER_LEVEL + 3;
    }

    return maxH + 1.0; // 连线可以稍微高一点
};