import sonyCameraImg from './images/product_sony_camera_1793317819712.jpg';
import ps5ConsoleImg from './images/product_ps5_console_1793317823122.jpg';
import boschDrillImg from './images/product_bosch_drill_1793317824345.jpg';
import campingTentImg from './images/product_camping_tent_1793317822877.jpg';
import fenderGuitarImg from './images/product_fender_guitar_1793317827044.jpg';
import projector4kImg from './images/product_projector_4k_1793317826665.jpg';

export const PRODUCT_IMAGES: Record<string, string> = {
  sony_camera: sonyCameraImg,
  ps5_console: ps5ConsoleImg,
  bosch_drill: boschDrillImg,
  camping_tent: campingTentImg,
  fender_guitar: fenderGuitarImg,
  projector_4k: projector4kImg,
};

export function resolveProductImage(keyOrUrl: string): string {
  return PRODUCT_IMAGES[keyOrUrl] || keyOrUrl;
}
