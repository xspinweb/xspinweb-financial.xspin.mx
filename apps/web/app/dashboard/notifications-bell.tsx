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
  const touchStartYRef = useRef<number | null>(null);
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

    function handleClick(event: MouseEvent) {
      if (!panelRef.current?.contains(event.target as Node)) {
        closeNotifications();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeNotifications();
      }
    }

    function handleScroll() {
      closeNotifications();
    }

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", handleScroll);
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
    touchStartYRef.current = null;
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
          onTouchStart={(event) => {
            touchStartYRef.current = event.touches[0]?.clientY ?? null;
          }}
          onTouchMove={(event) => {
            const startY = touchStartYRef.current;

            if (startY === null) {
              return;
            }

            const currentY = event.touches[0]?.clientY ?? startY;

            if (currentY - startY > 42) {
              touchStartYRef.current = null;
              closeNotifications();
            }
          }}
        >
          <header className="notificationsPanelHeader">
            <div>
              <strong>Notificaciones</strong>
              <span>{unreadCount > 0 ? `${unreadCount} sin leer` : "Todo al dia"}</span>
            </div>
            <button type="button" onClick={markAllAsRead} disabled={unreadCount === 0}>
              Marcar todas como leidas
            </button>
          </header>

          <div className="notificationsList">
            {isLoading ? <p className="notificationsEmpty">Cargando notificaciones...</p> : null}
            {!isLoading && notifications.length === 0 ? <p className="notificationsEmpty">Sin notificaciones recientes.</p> : null}
            {!isLoading
              ? notifications.map((notification) => (
                  <button
                    className={[
                      notification.isRead ? "notificationCard" : "notificationCard unread",
                      dragOffsets[notification.id] ? "dragging" : "",
                      deletingNotificationIds.includes(notification.id) ? "removing" : ""
                    ].filter(Boolean).join(" ")}
                    key={notification.id}
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

                      if (deltaX < -64 && Math.abs(deltaY) < 48) {
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

                      if (deltaX < -8 && Math.abs(deltaX) > Math.abs(deltaY)) {
                        setDragOffsets((current) => ({
                          ...current,
                          [notification.id]: Math.max(deltaX, -126)
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
                    <span className="notificationBody">
                      <span className="notificationMeta">
                        <span>{formatRelativeDate(notification.createdAt)}</span>
                      </span>
                      <strong>
                        {notification.title}
                        {notification.groupCount > 1 ? <em>{notification.groupCount}</em> : null}
                      </strong>
                      <span>{notification.message}</span>
                    </span>
                    {notification.actionUrl ? <span className="notificationAction">Abrir</span> : null}
                  </button>
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
    return `hace ${Math.max(1, Math.floor(diff / minute))} min`;
  }

  if (diff < 24 * hour) {
    return `hace ${Math.floor(diff / hour)} h`;
  }

  if (diff < month) {
    return `hace ${Math.floor(diff / week) || 1} sem`;
  }

  if (diff < year) {
    return `hace ${Math.floor(diff / month)} m`;
  }

  return `hace ${Math.floor(diff / year)} a`;
}
