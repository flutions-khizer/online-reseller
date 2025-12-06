import { Suspense } from "react";
import Navbar from "@/components/Navbar";
import ProductGrid from "@/components/ProductGrid";
import SearchBar from "@/components/SearchBar";
import CategoryNav from "@/components/CategoryNav";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <Suspense fallback={<div className="h-12 bg-gray-100 animate-pulse"></div>}>
        <CategoryNav />
      </Suspense>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Fresh recommendations
          </h1>
          <Suspense fallback={<div className="h-12 bg-gray-100 animate-pulse rounded-lg"></div>}>
            <SearchBar />
          </Suspense>
        </div>
        <Suspense fallback={
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-500">Loading products...</p>
          </div>
        }>
          <ProductGrid />
        </Suspense>
      </main>
    </div>
  );
}
