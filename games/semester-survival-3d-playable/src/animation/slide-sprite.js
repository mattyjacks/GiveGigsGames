/* Rear-view slide sprite-sheet decoder.
 * Removes only near-white pixels connected to the cell edges, preserving enclosed
 * white clothing details. Original source artwork remains untouched.
 */
export function prepareSlideFrames(image, columns = 4, rows = 2) {
  if (!image || !image.naturalWidth || !image.naturalHeight) {
    throw new Error("Slide source image must be decoded before processing.");
  }
  if (image.naturalWidth % columns || image.naturalHeight % rows) {
    throw new Error("Slide sheet dimensions must divide evenly into its frame grid.");
  }
  const width = image.naturalWidth / columns;
  const height = image.naturalHeight / rows;
  const frames = [];
  for (let index = 0; index < columns * rows; index += 1) {
    const canvas = document.createElement("canvas");
    canvas.width = width; canvas.height = height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    context.drawImage(image, (index % columns) * width, Math.floor(index / columns) * height, width, height, 0, 0, width, height);
    const data = context.getImageData(0, 0, width, height);
    const pixels = data.data;
    const seen = new Uint8Array(width * height);
    const queue = new Int32Array(width * height);
    let head = 0, tail = 0;
    const isBackground = (p) => pixels[p * 4] >= 246 && pixels[p * 4 + 1] >= 246 &&
      pixels[p * 4 + 2] >= 246 && Math.max(pixels[p * 4], pixels[p * 4 + 1], pixels[p * 4 + 2]) -
      Math.min(pixels[p * 4], pixels[p * 4 + 1], pixels[p * 4 + 2]) <= 14;
    const add = (p) => {
      if (!seen[p] && isBackground(p)) { seen[p] = 1; queue[tail++] = p; }
    };
    for (let x = 0; x < width; x += 1) { add(x); add((height - 1) * width + x); }
    for (let y = 0; y < height; y += 1) { add(y * width); add(y * width + width - 1); }
    while (head < tail) {
      const p = queue[head++], x = p % width, y = (p - x) / width;
      pixels[p * 4 + 3] = 0;
      if (x > 0) add(p - 1);
      if (x + 1 < width) add(p + 1);
      if (y > 0) add(p - width);
      if (y + 1 < height) add(p + width);
    }
    context.putImageData(data, 0, 0);
    const bounds = context.getImageData(0, 0, width, height).data;
    let left = width, top = height, right = -1, bottom = -1;
    for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
      if (bounds[(y * width + x) * 4 + 3] > 12) {
        if (x < left) left = x; if (x > right) right = x;
        if (y < top) top = y; if (y > bottom) bottom = y;
      }
    }
    if (right < left || bottom < top) throw new Error("Slide frame " + index + " contains no visible character.");
    frames.push(Object.freeze({ canvas, width, height, pivotX: (left + right) / 2, pivotY: bottom }));
  }
  return Object.freeze(frames);
}
