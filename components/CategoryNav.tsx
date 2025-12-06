"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

const categories = [
  { name: "All Categories", value: "" },
  { name: "Electronics", value: "Electronics" },
  { name: "Fashion", value: "Fashion" },
  { name: "Furniture", value: "Furniture" },
  { name: "Vehicles", value: "Vehicles" },
  { name: "Real Estate", value: "Real Estate" },
  { name: "Mobile Phones", value: "Mobile Phones" },
  { name: "Home & Garden", value: "Home & Garden" },
  { name: "Sports & Hobbies", value: "Sports & Hobbies" },
  { name: "Books & Media", value: "Books & Media" },
  { name: "Other", value: "Other" },
];

export default function CategoryNav() {
  const searchParams = useSearchParams();
  const currentCategory = searchParams.get("category") || "";

  return (
    <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center space-x-1 overflow-x-auto py-3 scrollbar-hide">
          {categories.map((category) => (
            <Link
              key={category.value}
              href={category.value ? `/?category=${encodeURIComponent(category.value)}` : "/"}
              className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
                currentCategory === category.value
                  ? "bg-blue-600 text-white"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              {category.name}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

