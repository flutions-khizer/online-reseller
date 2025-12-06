"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Navbar from "@/components/Navbar";

interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  images: string[];
  location?: string;
  category?: string;
  condition?: string;
  views: number;
  wishCount: number;
  seller: {
    id: string;
    name?: string;
    email: string;
  };
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [inWishlist, setInWishlist] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetch(`/api/products/${params.id}`)
        .then((res) => res.json())
        .then((data) => {
          setProduct(data);
          setLoading(false);
          // Reset image loading state when product changes
          setImageLoading(true);
          setImageError(false);
          setSelectedImage(0);
        });
    }
  }, [params.id]);

  // Reset image loading when selected image changes
  useEffect(() => {
    if (product && product.images && product.images.length > 0) {
      setImageLoading(true);
      setImageError(false);
    }
  }, [selectedImage, product?.images]);

  const toggleWishlist = async () => {
    if (!session) {
      router.push("/signin");
      return;
    }

    const res = await fetch(`/api/wishlist/${product?.id}`, {
      method: "POST",
    });
    const data = await res.json();
    setInWishlist(data.inWishlist);
  };

  const handleCheckout = async () => {
    if (!session) {
      router.push("/signin");
      return;
    }

    const res = await fetch("/api/orders/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productIds: [product?.id] }),
    });

    if (res.ok) {
      router.push("/dashboard/orders");
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="text-center py-12">Loading...</div>
      </>
    );
  }

  if (!product) {
    return (
      <>
        <Navbar />
        <div className="text-center py-12">Product not found</div>
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-8">
            <div>
              <div className="relative h-96 mb-4 bg-gray-200 rounded-lg overflow-hidden">
                {product.images && product.images.length > 0 ? (
                  <>
                    {imageLoading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-200 z-10">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                      </div>
                    )}
                    {!imageError ? (
                      <img
                        key={`${product.images[selectedImage]}-${selectedImage}`}
                        src={`/api/images/${product.images[selectedImage]}`}
                        alt={product.title}
                        className={`w-full h-full object-cover ${imageLoading ? "opacity-0 absolute" : "opacity-100"} transition-opacity duration-300`}
                        onLoad={() => {
                          setImageLoading(false);
                          setImageError(false);
                        }}
                        onError={(e) => {
                          console.error("Image load error:", e);
                          setImageError(true);
                          setImageLoading(false);
                        }}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-400">
                        <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400">
                    <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
              </div>
              {product.images && product.images.length > 1 && (
                <div className="grid grid-cols-4 gap-2">
                  {product.images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        if (selectedImage !== idx) {
                          setSelectedImage(idx);
                          setImageLoading(true);
                          setImageError(false);
                        }
                      }}
                      className={`relative h-20 rounded overflow-hidden border-2 ${
                        selectedImage === idx ? "border-blue-500" : "border-gray-200"
                      }`}
                    >
                      <img
                        src={`/api/images/${img}`}
                        alt={`${product.title} ${idx + 1}`}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = "none";
                        }}
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <h1 className="text-3xl font-bold mb-4">{product.title}</h1>
              <p className="text-4xl font-bold text-blue-600 mb-6">
                ₹{product.price.toLocaleString()}
              </p>
              <div className="space-y-2 mb-6">
                {product.location && (
                  <p className="text-gray-600">
                    <span className="font-semibold">Location:</span> {product.location}
                  </p>
                )}
                {product.category && (
                  <p className="text-gray-600">
                    <span className="font-semibold">Category:</span> {product.category}
                  </p>
                )}
                {product.condition && (
                  <p className="text-gray-600">
                    <span className="font-semibold">Condition:</span> {product.condition}
                  </p>
                )}
                <p className="text-gray-600">
                  <span className="font-semibold">Views:</span> {product.views}
                </p>
              </div>
              <div className="mb-6">
                <h2 className="text-xl font-semibold mb-2">Description</h2>
                <p className="text-gray-700 whitespace-pre-wrap">{product.description}</p>
              </div>
              <div className="mb-6">
                <h2 className="text-xl font-semibold mb-2">Seller</h2>
                <p className="text-gray-700">{product.seller.name || product.seller.email}</p>
              </div>
                  <div className="flex gap-4">
                    {session?.user?.id && session.user.id !== product.seller.id && (
                  <>
                    <button
                      onClick={toggleWishlist}
                      className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium"
                    >
                      {inWishlist ? "Remove from Wishlist" : "Add to Wishlist"}
                    </button>
                    <Link
                      href={`/dashboard/messages?userId=${product.seller.id}&productId=${product.id}`}
                      className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-center"
                    >
                      Message Seller
                    </Link>
                    <button
                      onClick={handleCheckout}
                      className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium"
                    >
                      Buy Now
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

