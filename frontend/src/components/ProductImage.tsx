"use client";

// Shows a product photo, or a grey box with the first letter if there is none.
//
// The backend saves the photo path like "/uploads/products/abc.jpg".
// The file lives on the BACKEND server (port 3000), so we put the
// backend address in front:  http://localhost:3000/uploads/products/abc.jpg
import { API_URL } from "@/lib/api";

// "http://localhost:3000/api/v1" -> "http://localhost:3000"
const BACKEND_ORIGIN = new URL(API_URL).origin;

export function imageSrc(imageUrl: string | null | undefined) {
  if (!imageUrl) return null;
  // already a full link (e.g. https://...) -> use it as it is
  if (imageUrl.startsWith("http")) return imageUrl;
  return BACKEND_ORIGIN + imageUrl;
}

type Props = {
  imageUrl: string | null | undefined;
  name: string;
  size?: number; // width + height in pixels
  className?: string;
};

export default function ProductImage({ imageUrl, name, size = 40, className = "" }: Props) {
  const src = imageSrc(imageUrl);

  if (!src) {
    return (
      <div
        className={`flex shrink-0 items-center justify-center rounded-md bg-slate-100 font-semibold text-slate-400 ${className}`}
        style={{ width: size, height: size, fontSize: size / 2.5 }}
      >
        {name.charAt(0).toUpperCase()}
      </div>
    );
  }

  return (
    // We use a normal <img> (not next/image) because the photo
    // comes from our backend server, and this keeps it simple.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={name}
      width={size}
      height={size}
      className={`shrink-0 rounded-md object-cover ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
