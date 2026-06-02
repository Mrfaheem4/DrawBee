import { toPng, toJpeg, toSvg } from "html-to-image";

export const exportAsPNG = async () => {
  const element = document.getElementById("whiteboard-container");
  if (!element) return;

  const dataUrl = await toPng(element, {
    quality: 1.0,
    pixelRatio: 2, // high Quality export
  });

  const link = document.createElement("a");
  link.download = "drawbee-export.png";
  link.href = dataUrl;
  link.click();
};

export const exportAsJPEG = async () => {
  const element = document.getElementById("whiteboard-container");
  if (!element) return;

  const dataUrl = await toJpeg(element, {
    quality: 0.95,
    pixelRatio: 2,
  });

  const link = document.createElement("a");
  link.download = "drawbee-export.jpg";
  link.href = dataUrl;
  link.click();
};

export const exportAsSVG = async () => {
  const element = document.getElementById("whiteboard-container");
  if (!element) return;

  const dataUrl = await toSvg(element);

  const link = document.createElement("a");
  link.download = "drawbee-export.svg";
  link.href = dataUrl;
  link.click();
};
