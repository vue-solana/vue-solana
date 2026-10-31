/**
 * A small QR renderer for Solana Pay URLs.
 *
 * The `qrcode` package is loaded lazily so apps that only encode/parse payment
 * URLs never pay for the QR encoder in their initial bundle.
 */
export interface QROptions {
  width?: number;
  margin?: number;
  color?: {
    dark?: string;
    light?: string;
  };
  errorCorrectionLevel?: "L" | "M" | "Q" | "H";
  logo?: string;
  logoSize?: number;
  logoBackgroundColor?: string;
  logoMargin?: number;
  dotStyle?: "dots" | "rounded" | "square";
  cornerStyle?: "square" | "rounded" | "extra-rounded" | "full-rounded" | "maximum-rounded";
}

interface QrMatrix {
  modules: {
    size: number;
    get(row: number, col: number): number;
  };
}

async function loadQRCode() {
  const mod = await import("qrcode");
  return mod.default ?? mod;
}

/**
 * Build the default styling options for a Solana Pay QR code.
 */
export function createQROptions(
  _url: string | URL,
  size = 512,
  background = "white",
  color = "black",
): QROptions {
  return {
    width: size,
    margin: 2,
    color: {
      dark: color,
      light: background,
    },
    errorCorrectionLevel: "Q",
    dotStyle: "rounded",
    cornerStyle: "extra-rounded",
  };
}

/**
 * Render a Solana Pay URL as styled SVG.
 */
export async function createStyledQRCode(url: string | URL, options: QROptions): Promise<string> {
  const QRCode = await loadQRCode();
  const qrMatrix = QRCode.create(String(url), {
    errorCorrectionLevel: options.errorCorrectionLevel ?? "Q",
  }) as QrMatrix;

  const size = options.width ?? 512;
  const margin = options.margin ?? 2;
  const moduleCount = qrMatrix.modules.size;
  const cellSize = (size - margin * 2) / moduleCount;
  const dotSize = cellSize * 0.8;

  const darkColor = options.color?.dark ?? "black";
  const lightColor = options.color?.light ?? "white";

  let svg = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">`;

  svg += `<rect width="${size}" height="${size}" fill="${lightColor}"/>`;

  const isFinderPattern = (row: number, col: number): boolean => {
    if (row < 7 && col < 7) return true;
    if (row < 7 && col >= moduleCount - 7) return true;
    if (row >= moduleCount - 7 && col < 7) return true;
    return false;
  };

  const drawFinderPattern = (centerX: number, centerY: number) => {
    const patternSize = 7 * cellSize;
    const innerSize = 3 * cellSize;
    const middleSize = 5 * cellSize;

    let outerRadius = cellSize;
    let middleRadius = cellSize * 0.5;
    let innerRadius = cellSize * 0.3;

    switch (options.cornerStyle) {
      case "square":
        outerRadius = 0;
        middleRadius = 0;
        innerRadius = 0;
        break;
      case "rounded":
        outerRadius = cellSize * 0.5;
        middleRadius = cellSize * 0.3;
        innerRadius = cellSize * 0.2;
        break;
      case "extra-rounded":
        outerRadius = cellSize;
        middleRadius = cellSize * 0.5;
        innerRadius = cellSize * 0.3;
        break;
      case "full-rounded":
        outerRadius = cellSize * 1.5;
        middleRadius = cellSize * 0.8;
        innerRadius = cellSize * 0.5;
        break;
      case "maximum-rounded":
        outerRadius = cellSize * 2.0;
        middleRadius = cellSize * 1.2;
        innerRadius = cellSize * 0.8;
        break;
    }

    svg += `<rect x="${centerX}" y="${centerY}" width="${patternSize}" height="${patternSize}" fill="${darkColor}" rx="${outerRadius}" ry="${outerRadius}"/>`;
    svg += `<rect x="${centerX + cellSize}" y="${centerY + cellSize}" width="${middleSize}" height="${middleSize}" fill="${lightColor}" rx="${middleRadius}" ry="${middleRadius}"/>`;
    svg += `<rect x="${centerX + 2 * cellSize}" y="${centerY + 2 * cellSize}" width="${innerSize}" height="${innerSize}" fill="${darkColor}" rx="${innerRadius}" ry="${innerRadius}"/>`;
  };

  drawFinderPattern(margin, margin);
  drawFinderPattern(margin + (moduleCount - 7) * cellSize, margin);
  drawFinderPattern(margin, margin + (moduleCount - 7) * cellSize);

  for (let row = 0; row < moduleCount; row++) {
    for (let col = 0; col < moduleCount; col++) {
      if (!qrMatrix.modules.get(row, col) || isFinderPattern(row, col)) continue;

      const x = margin + col * cellSize + (cellSize - dotSize) / 2;
      const y = margin + row * cellSize + (cellSize - dotSize) / 2;

      if (options.dotStyle === "dots") {
        svg += `<circle cx="${x + dotSize / 2}" cy="${y + dotSize / 2}" r="${dotSize / 2}" fill="${darkColor}"/>`;
      } else if (options.dotStyle === "rounded") {
        const radius = dotSize * 0.3;
        svg += `<rect x="${x}" y="${y}" width="${dotSize}" height="${dotSize}" fill="${darkColor}" rx="${radius}" ry="${radius}"/>`;
      } else {
        svg += `<rect x="${x}" y="${y}" width="${dotSize}" height="${dotSize}" fill="${darkColor}"/>`;
      }
    }
  }

  if (options.logo) {
    const logoSize = options.logoSize ?? size * 0.2;
    const logoMargin = options.logoMargin ?? 8;
    const logoX = (size - logoSize) / 2;
    const logoY = (size - logoSize) / 2;

    if (options.logoBackgroundColor) {
      const bgSize = logoSize + logoMargin * 2;
      const bgX = (size - bgSize) / 2;
      const bgY = (size - bgSize) / 2;
      svg += `<rect x="${bgX}" y="${bgY}" width="${bgSize}" height="${bgSize}" fill="${options.logoBackgroundColor}" rx="${logoMargin}" ry="${logoMargin}"/>`;
    }

    svg += `<image x="${logoX}" y="${logoY}" width="${logoSize}" height="${logoSize}" href="${options.logo}" preserveAspectRatio="xMidYMid meet"/>`;
  }

  svg += "</svg>";

  return svg;
}

/**
 * Render a Solana Pay URL as an SVG string.
 */
export async function createQR(
  url: string | URL,
  size = 512,
  background = "white",
  color = "black",
): Promise<string> {
  return createStyledQRCode(url, createQROptions(url, size, background, color));
}

/**
 * Render a Solana Pay URL as a `data:` URL containing SVG markup.
 *
 * Percent-encoding keeps this free of `Buffer`, so it works in the browser and
 * during SSR without the Buffer polyfill.
 */
export async function createQRDataURL(url: string | URL, options: QROptions): Promise<string> {
  const svg = await createStyledQRCode(url, options);
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/**
 * Render a Solana Pay URL into an existing canvas element.
 */
export async function createQRCanvas(
  canvas: HTMLCanvasElement,
  url: string | URL,
  options: QROptions,
): Promise<void> {
  const QRCode = await loadQRCode();
  await QRCode.toCanvas(canvas, String(url), {
    width: options.width,
    margin: options.margin,
    color: options.color,
    errorCorrectionLevel: options.errorCorrectionLevel,
  });
}
