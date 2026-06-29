"use client";

import { type CSSProperties, useEffect, useRef, useState } from "react";

type NotificationItem = {
  actionUrl?: string | null;
  category: string;
  categoryLabel: string;
  createdAt: string;
  groupCount: number;
  icon: string;
  id: string;
  isRead: boolean;
  message: string;
  priority: "alta" | "media" | "baja";
  priorityKey: "HIGH" | "MEDIUM" | "LOW";
  title: string;
  type: string;
};

type NotificationsResponse = {
  notifications: NotificationItem[];
  unreadCount: number;
};

type NotificationsBellProps = {
  userEmail: string;
};

export function NotificationsBell({ userEmail }: NotificationsBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [deletingNotificationIds, setDeletingNotificationIds] = useState<string[]>([]);
  const [dragOffsets, setDragOffsets] = useState<Record<string, number>>({});
  const [unreadCount, setUnreadCount] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const cardTouchStartRef = useRef<{ id: string; x: number; y: number } | null>(null);
  const ignoredClickRef = useRef<string | null>(null);

  useEffect(() => {
    void loadNotifications();
  }, [userEmail]);

  useEffect(() => {
    if (!userEmail || typeof EventSource === "undefined") {
      return;
    }

    const stream = new EventSource(`/api/notifications/stream?email=${encodeURIComponent(userEmail)}`);

    stream.addEventListener("notifications", (event) => {
      try {
        const data = JSON.parse((event as MessageEvent).data) as NotificationsResponse;
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      } catch {
        void loadNotifications();
      }
    });

    stream.onerror = () => {
      void loadNotifications();
    };

    return () => {
      stream.close();
    };
  }, [userEmail]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeNotifications();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  async function loadNotifications() {
    if (!userEmail) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`/api/notifications?email=${encodeURIComponent(userEmail)}`);
      if (!response.ok) {
        throw new Error("No se pudieron cargar las notificaciones.");
      }

      const data = (await response.json()) as NotificationsResponse;
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
      setDeletingNotificationIds([]);
      setDragOffsets({});
    } catch {
      setNotifications([]);
    } finally {
      setIsLoading(false);
    }
  }

  async function markAsRead(notification: NotificationItem) {
    if (notification.isRead) {
      return;
    }

    setNotifications((current) => current.filter((item) => item.id !== notification.id));
    setUnreadCount((current) => Math.max(0, current - 1));

    await fetch("/api/notifications/read", {
      body: JSON.stringify({ email: userEmail, notificationId: notification.id }),
      headers: { "Content-Type": "application/json" },
      method: "POST"
    }).catch(() => undefined);
  }

  async function markAllAsRead() {
    setNotifications([]);
    setUnreadCount(0);

    await fetch("/api/notifications/read-all", {
      body: JSON.stringify({ email: userEmail }),
      headers: { "Content-Type": "application/json" },
      method: "POST"
    }).catch(() => undefined);
  }

  function closeNotifications() {
    setIsOpen(false);
    cardTouchStartRef.current = null;
    setDragOffsets({});
  }

  async function deleteNotification(notification: NotificationItem) {
    if (deletingNotificationIds.includes(notification.id)) {
      return;
    }

    setDeletingNotificationIds((current) => [...current, notification.id]);
    setDragOffsets((current) => ({ ...current, [notification.id]: -420 }));

    await fetch("/api/notifications/delete", {
      body: JSON.stringify({ email: userEmail, notificationId: notification.id }),
      headers: { "Content-Type": "application/json" },
      method: "POST"
    }).catch(() => undefined);

    window.setTimeout(() => {
      setNotifications((current) => current.filter((item) => item.id !== notification.id));
      setUnreadCount((current) => (notification.isRead ? current : Math.max(0, current - 1)));
      setDeletingNotificationIds((current) => current.filter((id) => id !== notification.id));
      setDragOffsets((current) => {
        const next = { ...current };
        delete next[notification.id];
        return next;
      });
    }, 180);
  }

  function openNotification(notification: NotificationItem) {
    void markAsRead(notification);

    if (notification.actionUrl) {
      window.location.href = notification.actionUrl;
    }
  }

  return (
    <div className="notificationsMenu" ref={panelRef}>
      <button
        className={unreadCount > 0 ? "notificationButton hasUnread" : "notificationButton"}
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label="Notificaciones"
        onClick={() => {
          if (isOpen) {
            closeNotifications();
            return;
          }

          setIsOpen(true);
        }}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 22a2.8 2.8 0 0 0 2.7-2h-5.4A2.8 2.8 0 0 0 12 22Zm7-6.4V11a7 7 0 0 0-5.2-6.8V3a1.8 1.8 0 1 0-3.6 0v1.2A7 7 0 0 0 5 11v4.6L3.3 18v.9h17.4V18Z" />
        </svg>
        {unreadCount > 0 ? <span className="notificationBadge">{unreadCount > 9 ? "9+" : unreadCount}</span> : null}
      </button>

      {isOpen ? (
        <section
          className="notificationsPanel"
          role="dialog"
          aria-label="Notificaciones recientes"
        >
          <header className="notificationsPanelHeader">
            <div>
              <strong>Notificaciones</strong>
              <span>{unreadCount > 0 ? `Tienes ${unreadCount} sin leer` : "Todo al dia"}</span>
            </div>
            <button type="button" onClick={markAllAsRead} disabled={unreadCount === 0}>
              <span className="notificationsMarkIcon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="m4.5 12.5 4.2 4.2L19.5 5.8" />
                  <path d="M20 12v6.2A1.8 1.8 0 0 1 18.2 20H5.8A1.8 1.8 0 0 1 4 18.2V5.8A1.8 1.8 0 0 1 5.8 4H15" />
                </svg>
              </span>
              Marcar todas como leidas
            </button>
          </header>

          <div className="notificationsList">
            {isLoading ? <p className="notificationsEmpty">Cargando notificaciones...</p> : null}
            {!isLoading && notifications.length === 0 ? <p className="notificationsEmpty">Sin notificaciones recientes.</p> : null}
            {!isLoading
              ? notifications.map((notification) => (
                  <div
                    className={[
                      "notificationSwipeRow",
                      dragOffsets[notification.id] ? "dragging" : "",
                      deletingNotificationIds.includes(notification.id) ? "removing" : ""
                    ].filter(Boolean).join(" ")}
                    key={notification.id}
                  >
                    <span className="notificationDeleteReveal" aria-hidden="true">
                      <svg viewBox="0 0 24 24">
                        <path d="M4 7h16" />
                        <path d="M10 11v6" />
                        <path d="M14 11v6" />
                        <path d="M6 7l1 14h10l1-14" />
                        <path d="M9 7V4h6v3" />
                      </svg>
                      Eliminar
                    </span>
                    <button
                      className={[
                        notification.isRead ? "notificationCard" : "notificationCard unread",
                        dragOffsets[notification.id] ? "dragging" : "",
                        deletingNotificationIds.includes(notification.id) ? "removing" : ""
                      ].filter(Boolean).join(" ")}
                      onClick={() => {
                        if (ignoredClickRef.current === notification.id) {
                          ignoredClickRef.current = null;
                          return;
                        }

                        openNotification(notification);
                      }}
                      onTouchEnd={(event) => {
                        const start = cardTouchStartRef.current;
                        const touch = event.changedTouches[0];

                        if (!start || !touch || start.id !== notification.id) {
                          return;
                        }

                        cardTouchStartRef.current = null;
                        const deltaX = touch.clientX - start.x;
                        const deltaY = touch.clientY - start.y;
                        const cardWidth = event.currentTarget.getBoundingClientRect().width;
                        const deleteThreshold = cardWidth * 0.6;

                        if (deltaX <= -deleteThreshold && Math.abs(deltaY) < 34) {
                          event.preventDefault();
                          event.stopPropagation();
                          ignoredClickRef.current = notification.id;
                          void deleteNotification(notification);
                          return;
                        }

                        setDragOffsets((current) => {
                          const next = { ...current };
                          delete next[notification.id];
                          return next;
                        });
                      }}
                      onTouchMove={(event) => {
                        const start = cardTouchStartRef.current;
                        const touch = event.touches[0];

                        if (!start || !touch || start.id !== notification.id) {
                          return;
                        }

                        const deltaX = touch.clientX - start.x;
                        const deltaY = touch.clientY - start.y;
                        const cardWidth = event.currentTarget.getBoundingClientRect().width;

                        if (deltaX < -18 && Math.abs(deltaX) > Math.abs(deltaY) * 1.35) {
                          event.preventDefault();
                          setDragOffsets((current) => ({
                            ...current,
                            [notification.id]: Math.max(deltaX, -(cardWidth * 0.72))
                          }));
                        }
                      }}
                      onTouchStart={(event) => {
                        const touch = event.touches[0];

                        if (touch) {
                          cardTouchStartRef.current = {
                            id: notification.id,
                            x: touch.clientX,
                            y: touch.clientY
                          };
                          setDragOffsets((current) => {
                            const next = { ...current };
                            delete next[notification.id];
                            return next;
                          });
                        }
                      }}
                      style={{ "--notification-drag-x": `${dragOffsets[notification.id] ?? 0}px` } as CSSProperties}
                      type="button"
                    >
                      <span className={`notificationUnreadDot ${notification.isRead ? "" : "active"}`} aria-hidden="true" />
                      <span className={`notificationIcon notificationIcon-${getNotificationTone(notification)}`} aria-hidden="true">
                        <NotificationGlyph notification={notification} />
                      </span>
                      <span className="notificationBody">
                        <strong>
                          {notification.title}
                          {notification.groupCount > 1 ? <em>{notification.groupCount}</em> : null}
                        </strong>
                        <span>{notification.message}</span>
                      </span>
                      <span className="notificationTime">{formatRelativeDate(notification.createdAt)}</span>
                      <span className="notificationChevron" aria-hidden="true">{">"}</span>
                    </button>
                  </div>
                ))
              : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function formatRelativeDate(value: string) {
  const diff = Math.max(0, Date.now() - new Date(value).getTime());
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const week = 7 * 24 * hour;
  const month = 30 * 24 * hour;
  const year = 365 * 24 * hour;

  if (diff < hour) {
    return `Hace ${Math.max(1, Math.floor(diff / minute))} min`;
  }

  if (diff < 24 * hour) {
    return `Hace ${Math.floor(diff / hour)} h`;
  }

  if (diff < month) {
    return `Hace ${Math.floor(diff / week) || 1} sem`;
  }

  if (diff < year) {
    return `Hace ${Math.floor(diff / month)} m`;
  }

  return `Hace ${Math.floor(diff / year)} a`;
}

function getNotificationTone(notification: NotificationItem) {
  const text = `${notification.title} ${notification.message} ${notification.category}`.toLowerCase();

  if (text.includes("referido")) {
    return "purple";
  }

  if (text.includes("bono") || text.includes("nivel")) {
    return "blue";
  }

  if (text.includes("retiro") || text.includes("wallet") || text.includes("pago")) {
    return "yellow";
  }

  return "green";
}

function NotificationGlyph({ notification }: { notification: NotificationItem }) {
  const tone = getNotificationTone(notification);

  if (tone === "purple") {
    return (
      <svg viewBox="0 0 24 24">
        <path d="M15 19a6 6 0 0 0-12 0" />
        <path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
        <path d="M19 8v6" />
        <path d="M16 11h6" />
      </svg>
    );
  }

  if (tone === "blue") {
    return (
      <svg viewBox="0 0 24 24">
        <path d="M20 12v8H4v-8" />
        <path d="M22 7H2v5h20V7Z" />
        <path d="M12 7v13" />
        <path d="M12 7H7.5A2.5 2.5 0 1 1 10 4.5C10 6 12 7 12 7Z" />
        <path d="M12 7h4.5A2.5 2.5 0 1 0 14 4.5C14 6 12 7 12 7Z" />
      </svg>
    );
  }

  if (tone === "yellow") {
    return (
      <svg viewBox="0 0 24 24">
        <path d="M4 7h16v12H4z" />
        <path d="M4 10h16" />
        <path d="M16 15h2" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24">
      <path d="M4 7h16v12H4z" />
      <path d="M4 7l3-3h13v3" />
      <path d="M16 14h3v3h-3z" />
    </svg>
  );
}
