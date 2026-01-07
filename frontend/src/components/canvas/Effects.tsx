// @ts-nocheck
import { EffectComposer, Bloom, Vignette, Noise, TiltShift2 } from '@react-three/postprocessing';

export default function Effects() {
  return (
    <EffectComposer disableNormalPass>
      {/* 1. 辉光：保持高亮 */}
      <Bloom 
        luminanceThreshold={1.1} 
        mipmapBlur 
        intensity={2.0} 
        radius={0.5} 
      />
      
      {/* 2. 噪点：保持微量质感 */}
      <Noise opacity={0.04} />
      
      {/* 3. 暗角：稍微减弱一点，让边缘更亮 */}
      <Vignette eskil={false} offset={0.1} darkness={0.9} />
      
      {/* 4. 🔥 核心修改：大幅降低模糊度 */}
      {/* 之前是 0.15，现在改为 0.04，几乎清晰，只留一点点电影感 */}
      <TiltShift2 blur={0.04} />
    </EffectComposer>
  );
}