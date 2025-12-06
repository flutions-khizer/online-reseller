"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";

interface Order {
  id: string;
  total: number;
  status: string;
  createdAt: string;
  productIds: string[];
  buyer: {
    id: string;
    name?: string;
    email: string;
  };
  seller: {
    id: string;
    name?: string;
    email: string;
  };
}

export default function OrdersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/signin");
      return;
    }

    if (status === "authenticated" && session) {
      fetch("/api/orders")
        .then((res) => res.json())
        .then((data) => {
          setOrders(data.orders || []);
          setLoading(false);
        });
    }
  }, [session, status, router]);

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="text-center py-12">Loading...</div>
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-8">My Orders</h1>
        {orders.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No orders yet</div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order.id} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-sm text-gray-500">Order ID: {order.id}</p>
                    <p className="text-sm text-gray-500">
                      {mounted
                        ? new Date(order.createdAt).toLocaleDateString()
                        : new Date(order.createdAt).toISOString().split("T")[0]}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      order.status === "pending"
                        ? "bg-yellow-100 text-yellow-800"
                        : order.status === "completed"
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {order.status}
                  </span>
                </div>
                <div className="mb-4">
                  <p className="text-sm text-gray-600">
                    {session?.user?.id === order.buyer.id ? "Seller" : "Buyer"}:{" "}
                    {session?.user?.id === order.buyer.id
                      ? order.seller.name || order.seller.email
                      : order.buyer.name || order.buyer.email}
                  </p>
                  <p className="text-sm text-gray-600">
                    Products: {order.productIds.length} item(s)
                  </p>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-2xl font-bold text-blue-600">
                    ₹{order.total.toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

