import { Image as ImageIcon } from "lucide-react";
import { widgetStyle, type WidgetProps } from "./types";
export function ImageWidget({ element }: WidgetProps) {
  return element.image ? (
    <img
      alt={element.text}
      src={element.image}
      style={{
        ...widgetStyle(element),
        objectFit: element.imageFit ?? "contain",
        objectPosition: element.imagePosition ?? "center",
        background: element.background,
      }}
      draggable={false}
    />
  ) : (
    <div className="image-placeholder" style={widgetStyle(element)}>
      <ImageIcon size={24} />
      圖片
    </div>
  );
}
