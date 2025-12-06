"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import ImageUpload from "@/components/ImageUpload";

export default function EditProductPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    category: "",
    location: "",
    condition: "",
  });
  const [images, setImages] = useState<File[]>([]);
  const [existingImageIds, setExistingImageIds] = useState<string[]>([]);
  const [removedImageIds, setRemovedImageIds] = useState<string[]>([]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/signin");
      return;
    }

    if (status !== "authenticated" || !session) {
      return;
    }

    // Fetch product data
    fetch(`/api/products/${params.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
          setLoading(false);
          return;
        }

        // Check if user owns this product
        if (data.seller?.id !== session?.user?.id) {
          setError("You don't have permission to edit this product");
          setLoading(false);
          return;
        }

        // Populate form with existing data
        setFormData({
          title: data.title || "",
          description: data.description || "",
          price: data.price?.toString() || "",
          category: data.category || "",
          location: data.location || "",
          condition: data.condition || "",
        });
        setExistingImageIds(data.images || []);
        setLoading(false);
      })
      .catch((err) => {
        setError("Failed to load product");
        setLoading(false);
      });
  }, [session, router, params.id]);

  const handleImagesChange = (files: File[]) => {
    setImages(files);
  };

  const handleRemoveExistingImage = (imageId: string) => {
    setExistingImageIds(existingImageIds.filter((id) => id !== imageId));
    setRemovedImageIds([...removedImageIds, imageId]);
  };

  const uploadImages = async () => {
    if (images.length === 0) return [];

    const formData = new FormData();
    images.forEach((img) => formData.append("images", img));

    const res = await fetch("/api/uploads/product", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      throw new Error("Failed to upload images");
    }

    const data = await res.json();
    return data.fileIds;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);

    try {
      // Upload new images
      const newImageIds = await uploadImages();
      
      // Combine existing (non-removed) images with new images
      const remainingExisting = existingImageIds.filter((id) => !removedImageIds.includes(id));
      const finalImageIds = [...remainingExisting, ...newImageIds];

      if (finalImageIds.length === 0) {
        setError("Please keep at least one image or upload new images");
        setSaving(false);
        return;
      }

      if (finalImageIds.length > 6) {
        setError(`You can only have up to 6 images. You currently have ${remainingExisting.length} existing images and are trying to add ${newImageIds.length} new ones. Please remove some images.`);
        setSaving(false);
        return;
      }

      // Update product
      const res = await fetch(`/api/products/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          price: parseFloat(formData.price),
          images: finalImageIds,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update product");
      }

      router.push("/dashboard/listings");
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setSaving(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="text-center py-12">Loading...</div>
      </div>
    );
  }

  if (error && !formData.title) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
          <button
            onClick={() => router.push("/dashboard/listings")}
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            Back to Listings
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-8">Edit Product</h1>
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description *
            </label>
            <textarea
              required
              rows={6}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Price (₹) *
              </label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a category</option>
                <option value="Electronics">Electronics</option>
                <option value="Fashion">Fashion</option>
                <option value="Furniture">Furniture</option>
                <option value="Vehicles">Vehicles</option>
                <option value="Real Estate">Real Estate</option>
                <option value="Mobile Phones">Mobile Phones</option>
                <option value="Home & Garden">Home & Garden</option>
                <option value="Sports & Hobbies">Sports & Hobbies</option>
                <option value="Books & Media">Books & Media</option>
                <option value="Musical Instruments">Musical Instruments</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Condition
              </label>
              <select
                value={formData.condition}
                onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select condition</option>
                <option value="New">New</option>
                <option value="Like New">Like New</option>
                <option value="Good">Good</option>
                <option value="Fair">Fair</option>
                <option value="Poor">Poor</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Images <span className="text-red-500">*</span>
            </label>
            
            {/* Existing Images */}
            {existingImageIds.length > 0 && (
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">Current Images:</p>
                <div className="grid grid-cols-3 gap-4">
                  {existingImageIds.map((imageId) => (
                    <div key={imageId} className="relative group">
                      <img
                        src={`/api/images/${imageId}`}
                        alt="Product"
                        className="w-full h-32 object-cover rounded border border-gray-200"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveExistingImage(imageId)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Remove image"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upload New Images */}
            <p className="text-sm text-gray-600 mb-2">Add New Images (optional):</p>
            <ImageUpload 
              onImagesChange={handleImagesChange} 
              maxImages={6 - existingImageIds.filter((id) => !removedImageIds.includes(id)).length} 
              required={false} 
            />
            <p className="text-xs text-gray-500 mt-2">
              You can add up to {6 - existingImageIds.filter((id) => !removedImageIds.includes(id)).length} more images. Total images cannot exceed 6.
            </p>
          </div>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => router.push("/dashboard/listings")}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 rounded-md font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-md font-medium disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

