import { useState } from "react";
import { Download } from "lucide-react";
import { getErrorMessage } from "@/lib/api";
import type { Order, OrderStatus } from "@/lib/types";

const orderStatuses: OrderStatus[] = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"];

function formatMoney(value: number) {
  return `PKR ${Number(value || 0).toLocaleString()}`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-PK", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function OrdersPage({
  orders,
  onStatusChange,
  onDownloadPdf,
}: {
  orders: Order[];
  onStatusChange: (id: string, status: OrderStatus) => Promise<void>;
  onDownloadPdf: (id: string) => Promise<void>;
}) {
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleStatusChange = async (order: Order, status: OrderStatus) => {
    setError(null);
    setBusyOrderId(order.id);

    try {
      await onStatusChange(order.id, status);
    } catch (statusError) {
      setError(getErrorMessage(statusError));
    } finally {
      setBusyOrderId(null);
    }
  };

  const handleDownload = async (order: Order) => {
    setError(null);
    setBusyOrderId(order.id);

    try {
      await onDownloadPdf(order.id);
    } catch (downloadError) {
      setError(getErrorMessage(downloadError));
    } finally {
      setBusyOrderId(null);
    }
  };

  return (
    <div className="container">
      <section className="card padding-xl">
        <div className="section-row">
          <div>
            <p className="section-subtitle">Customer orders</p>
            <h2 className="section-title">Orders</h2>
          </div>
          <span className="badge">{orders.length} total</span>
        </div>

        {error ? <p className="error-text">{error}</p> : null}

        {orders.length > 0 ? (
          <div className="orders-list">
            {orders.map((order) => (
              <article key={order.id} className="order-card">
                <div className="order-card-header">
                  <div>
                    <p className="section-subtitle">Order {order.id.slice(-8).toUpperCase()}</p>
                    <h3 className="order-customer">{order.customer.name}</h3>
                    <p className="order-meta">{formatDate(order.createdAt)} | {order.customer.phone} | COD</p>
                  </div>

                  <div className="order-actions">
                    <select className="select" value={order.status} disabled={busyOrderId === order.id} onChange={(event) => void handleStatusChange(order, event.target.value as OrderStatus)}>
                      {orderStatuses.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                    <button className="button secondary" type="button" disabled={busyOrderId === order.id} onClick={() => void handleDownload(order)}>
                      <Download className="nav-icon" />
                      PDF
                    </button>
                  </div>
                </div>

                <div className="order-contact-grid">
                  <div>
                    <span>Email</span>
                    <strong>{order.customer.email}</strong>
                  </div>
                  <div>
                    <span>Address</span>
                    <strong>{order.customer.address}</strong>
                  </div>
                  {order.customer.notes ? (
                    <div>
                      <span>Notes</span>
                      <strong>{order.customer.notes}</strong>
                    </div>
                  ) : null}
                </div>

                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Color</th>
                        <th>Qty</th>
                        <th>Unit</th>
                        <th>Delivery</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.items.map((item, index) => (
                        <tr key={`${order.id}-${index}`}>
                          <td>{item.productName}</td>
                          <td>{item.color || "-"}</td>
                          <td>{item.quantity}</td>
                          <td>{formatMoney(item.unitPrice)}</td>
                          <td>{formatMoney(item.deliveryCharge)}</td>
                          <td>{formatMoney(item.unitPrice * item.quantity + item.deliveryCharge)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="order-totals">
                  <span>Subtotal: {formatMoney(order.subtotal)}</span>
                  <span>Delivery: {formatMoney(order.deliveryTotal)}</span>
                  <strong>Total: {formatMoney(order.total)}</strong>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="card padding-lg">
            <p className="section-subtitle">No customer orders have arrived yet.</p>
          </div>
        )}
      </section>
    </div>
  );
}
