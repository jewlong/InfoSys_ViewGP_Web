import { Image as ImageIcon } from "lucide-react";
import { LvglSurface } from "./LvglCanvas";
import { widgetStyle, type WidgetProps } from "./types";

export function ImageWidget({ element, assets }: WidgetProps) {
  const source =
    assets?.find((a) => a.id === element.imageAssetId)?.data ?? element.image;
  return source ? (
    <img
      alt={element.text}
      src={source}
      data-lvgl-class="lv_image"
      style={{
        ...widgetStyle(element),
        objectFit: element.imageFit ?? "contain",
        objectPosition: element.imagePosition ?? "center",
        background: element.background,
      }}
      draggable={false}
    />
  ) : (
    <div
      className="image-placeholder"
      data-lvgl-class="lv_image"
      style={{ ...widgetStyle(element), position: "relative" }}
    >
      <LvglSurface element={element} lvglClass="lv_image" draw={() => {}} />
      <ImageIcon size={24} />
      圖片
    </div>
  );
}
