// Upload a product photo.
// Files are sent as "multipart/form-data" (not JSON).
// The field name must be "image" (same as the backend FileInterceptor('image')).
import { api } from "./api";

export async function uploadProductImage(productId: string, file: File) {
  const formData = new FormData();
  formData.append("image", file);

  const res = await api.post(`/products/${productId}/image`, formData);
  return res.data.data;
}

// check the file in the browser BEFORE uploading (the backend checks again)
export function checkImageFile(file: File): string | null {
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (!allowed.includes(file.type)) return "Only JPG, PNG or WEBP images are allowed";
  if (file.size > 5 * 1024 * 1024) return "Image must be smaller than 5 MB";
  return null;
}
