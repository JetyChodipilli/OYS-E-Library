import Image from "next/image";
import type {Material} from "./sampleData";

/** Local, static SVG illustrations. Never GIF/video/remote AI artwork. */
export function MaterialCover({material, priority = false}: {material: Material; priority?: boolean}) {
  return <div className="material-cover"><Image src={material.cover} alt={`${material.title} — static illustrated cover`} fill priority={priority} sizes="(max-width:600px) 100vw, (max-width:1100px) 45vw, 300px" unoptimized className="cover-image" /></div>;
}
