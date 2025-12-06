"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";

interface ProductCardProps {
  product: {
    id: string;
    title: string;
    price: number;
    images: string[];
    location?: string;
    category?: string;
    views: number;
    wishCount: number;
    createdAt: string;
    seller?: {
      id: string;
      name?: string;
    };
  };
  inWishlist?: boolean;
}

export default function ProductCard({ product, inWishlist: initialInWishlist }: ProductCardProps) {
  const { data: session } = useSession();
  const [inWishlist, setInWishlist] = useState(initialInWishlist || false);
  const [isToggling, setIsToggling] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [formattedDate, setFormattedDate] = useState<string>("");

  // Format date on client side only to avoid hydration mismatch
  useEffect(() => {
    const formatDate = (dateString: string) => {
      const date = new Date(dateString);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - date.getTime());
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 0) return "Today";
      if (diffDays === 1) return "Yesterday";
      if (diffDays < 7) return `${diffDays} days ago`;
      return date.toLocaleDateString("en-US", { day: "numeric", month: "short" });
    };

    setFormattedDate(formatDate(product.createdAt));
  }, [product.createdAt]);

  const toggleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!session) {
      window.location.href = "/signin";
      return;
    }

    setIsToggling(true);
    try {
      const res = await fetch(`/api/wishlist/${product.id}`, {
        method: "POST",
      });
      const data = await res.json();
      setInWishlist(data.inWishlist);
    } catch (error) {
      console.error("Error toggling wishlist:", error);
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow relative group">
      <Link href={`/products/${product.id}`} className="block">
        <div className="relative h-48 bg-gray-100 overflow-hidden">
          {product.images && product.images.length > 0 && !imageError ? (
            <>
              {imageLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              )}
              <img
                src={`/api/images/${product.images[0]}`}
                alt={product.title}
                className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${imageLoading ? "opacity-0" : "opacity-100"}`}
                loading="lazy"
                onLoad={() => setImageLoading(false)}
                onError={() => {
                  setImageError(true);
                  setImageLoading(false);
                }}
              />
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
          <button
            onClick={toggleWishlist}
            disabled={isToggling}
            className={`absolute top-2 right-2 p-2 rounded-full shadow-md transition-colors ${
              inWishlist
                ? "bg-red-500 text-white"
                : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
            aria-label="Add to wishlist"
          >
            <svg
              className="w-5 h-5"
              fill={inWishlist ? "currentColor" : "none"}
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
          </button>
        </div>
        <div className="p-4">
          <div className="flex items-start justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-900 line-clamp-2 flex-1">
              {product.title}
            </h3>
          </div>
          <p className="text-2xl font-bold text-blue-600 mb-2">
            ₹{product.price.toLocaleString("en-IN")}
          </p>
          {product.location && (
            <div className="flex items-center text-sm text-gray-500 mb-1">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {product.location}
            </div>
          )}
          <div className="flex items-center justify-between text-xs text-gray-400 mt-2 pt-2 border-t border-gray-100">
            <span>{formattedDate || "Loading..."}</span>
            <span>{product.views} views</span>
          </div>
        </div>
      </Link>
    </div>
  );
}

