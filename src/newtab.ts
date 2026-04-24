import "./styles.css";

type BookmarkNode = chrome.bookmarks.BookmarkTreeNode;
const ORDER_STORAGE_KEY = "bookmarkOrder";

function getTree(): Promise<BookmarkNode[]> {
  return new Promise((resolve, reject) => {
    chrome.bookmarks.getTree((tree) => {
      const runtimeError = chrome.runtime.lastError;
      if (runtimeError) {
        reject(new Error(runtimeError.message));
        return;
      }
      resolve(tree);
    });
  });
}

function getBookmarksBarNode(tree: BookmarkNode[]): BookmarkNode | null {
  const root = tree[0];
  if (!root?.children || root.children.length === 0) {
    return null;
  }

  const byId = root.children.find((node) => node.id === "1");
  if (byId) {
    return byId;
  }

  return root.children[0] ?? null;
}

function getDirectBookmarkLinks(barNode: BookmarkNode): BookmarkNode[] {
  return (barNode.children ?? []).filter((node) => Boolean(node.url));
}

function getStoredOrder(): Promise<string[]> {
  return new Promise((resolve) => {
    chrome.storage.local.get([ORDER_STORAGE_KEY], (result) => {
      const runtimeError = chrome.runtime.lastError;
      if (runtimeError) {
        resolve([]);
        return;
      }

      const value = result[ORDER_STORAGE_KEY];
      if (!Array.isArray(value)) {
        resolve([]);
        return;
      }

      resolve(value.filter((item): item is string => typeof item === "string"));
    });
  });
}

function saveOrder(order: string[]): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [ORDER_STORAGE_KEY]: order }, () => {
      resolve();
    });
  });
}

function applyStoredOrder(bookmarks: BookmarkNode[], savedOrder: string[]): BookmarkNode[] {
  if (savedOrder.length === 0) {
    return bookmarks;
  }

  const byId = new Map(bookmarks.map((bookmark) => [bookmark.id, bookmark]));
  const ordered: BookmarkNode[] = [];

  for (const id of savedOrder) {
    const match = byId.get(id);
    if (match) {
      ordered.push(match);
      byId.delete(id);
    }
  }

  for (const bookmark of bookmarks) {
    if (byId.has(bookmark.id)) {
      ordered.push(bookmark);
    }
  }

  return ordered;
}

function moveBookmarkRelative(
  items: BookmarkNode[],
  fromId: string,
  toId: string,
  position: "before" | "after"
): BookmarkNode[] {
  if (fromId === toId) {
    return items;
  }

  const fromIndex = items.findIndex((item) => item.id === fromId);
  const toIndex = items.findIndex((item) => item.id === toId);
  if (fromIndex < 0 || toIndex < 0) {
    return items;
  }

  const reordered = [...items];
  const [moved] = reordered.splice(fromIndex, 1);

  const targetIndexAfterRemoval = reordered.findIndex((item) => item.id === toId);
  const insertionIndex =
    position === "before" ? targetIndexAfterRemoval : targetIndexAfterRemoval + 1;

  reordered.splice(insertionIndex, 0, moved);
  return reordered;
}

function renderStatus(app: HTMLElement, text: string, variant: "default" | "error" = "default"): void {
  app.innerHTML = `
    <p class="status ${variant === "error" ? "status-error" : ""}">${text}</p>
  `;
}

function escapeHtml(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getFaviconUrl(url: string): string {
  const base = chrome.runtime.getURL("/_favicon/");
  return `${base}?pageUrl=${encodeURIComponent(url)}&size=32`;
}

function renderBookmarks(app: HTMLElement, bookmarks: BookmarkNode[]): void {
  const cards = bookmarks
    .map((bookmark) => {
      const title = escapeHtml(bookmark.title || "Untitled");
      const url = bookmark.url ?? "#";
      let hostname = "";
      if (url !== "#") {
        try {
          hostname = new URL(url).hostname;
        } catch {
          hostname = url;
        }
      }
      const safeUrl = escapeHtml(url);
      const faviconUrl = escapeHtml(getFaviconUrl(url));
      return `
        <a class="bookmark-card" data-bookmark-id="${bookmark.id}" draggable="true" href="${safeUrl}" target="_blank" rel="noopener noreferrer">
          <span class="bookmark-main">
            <img class="bookmark-favicon" src="${faviconUrl}" alt="" width="16" height="16" loading="lazy" decoding="async" />
            <span class="bookmark-title">${title}</span>
          </span>
          <span class="bookmark-url">${escapeHtml(hostname)}</span>
        </a>
      `;
    })
    .join("");

  app.innerHTML = `
    <section id="bookmarks-grid" class="grid">
      ${cards}
    </section>
  `;
}

function attachDragAndDrop(
  app: HTMLElement,
  bookmarks: BookmarkNode[],
  onReorder: (nextBookmarks: BookmarkNode[]) => void
): void {
  const grid = app.querySelector<HTMLElement>("#bookmarks-grid");
  if (!grid) {
    return;
  }

  let draggedId: string | null = null;
  let isDragging = false;
  let dropTargetId: string | null = null;
  let dropPosition: "before" | "after" = "before";

  const clearDropPreview = (): void => {
    grid.querySelectorAll<HTMLElement>(".bookmark-card").forEach((card) => {
      card.classList.remove("drop-before", "drop-after");
    });
    dropTargetId = null;
  };

  grid.addEventListener("dragstart", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const card = target.closest<HTMLElement>(".bookmark-card");
    if (!card) {
      return;
    }

    draggedId = card.dataset.bookmarkId ?? null;
    if (!draggedId) {
      return;
    }

    isDragging = true;
    card.classList.add("is-dragging");
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", draggedId);
    }
  });

  grid.addEventListener("dragover", (event) => {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "move";
    }

    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      clearDropPreview();
      return;
    }

    const targetCard = target.closest<HTMLElement>(".bookmark-card");
    if (!targetCard) {
      clearDropPreview();
      return;
    }

    const targetId = targetCard.dataset.bookmarkId ?? null;
    if (!draggedId || !targetId || targetId === draggedId) {
      clearDropPreview();
      return;
    }

    const rect = targetCard.getBoundingClientRect();
    const isBefore = event.clientY < rect.top + rect.height / 2;
    dropPosition = isBefore ? "before" : "after";
    dropTargetId = targetId;

    clearDropPreview();
    targetCard.classList.add(dropPosition === "before" ? "drop-before" : "drop-after");
  });

  grid.addEventListener("drop", (event) => {
    event.preventDefault();
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const targetCard = target.closest<HTMLElement>(".bookmark-card");
    const targetId = dropTargetId ?? targetCard?.dataset.bookmarkId ?? null;
    if (!draggedId || !targetId) {
      clearDropPreview();
      return;
    }

    const next = moveBookmarkRelative(bookmarks, draggedId, targetId, dropPosition);
    clearDropPreview();
    onReorder(next);
  });

  grid.addEventListener("dragend", () => {
    draggedId = null;
    clearDropPreview();
    if (!isDragging) {
      return;
    }

    isDragging = false;
    const active = grid.querySelector(".bookmark-card.is-dragging");
    active?.classList.remove("is-dragging");
  });

  // Avoid opening links on accidental click immediately after drag.
  grid.addEventListener(
    "click",
    (event) => {
      if (isDragging) {
        event.preventDefault();
        event.stopPropagation();
      }
    },
    true
  );
}

async function init(): Promise<void> {
  const app = document.querySelector<HTMLElement>("#app");
  if (!app) {
    throw new Error("App container not found.");
  }

  renderStatus(app, "Loading bookmarks...");

  try {
    const tree = await getTree();
    const barNode = getBookmarksBarNode(tree);

    if (!barNode) {
      renderStatus(app, "Bookmarks bar was not found.");
      return;
    }

    const links = getDirectBookmarkLinks(barNode);
    if (links.length === 0) {
      renderStatus(app, "No direct bookmark links found in your bookmarks bar.");
      return;
    }

    const savedOrder = await getStoredOrder();
    let orderedLinks = applyStoredOrder(links, savedOrder);

    const renderAndBind = (): void => {
      renderBookmarks(app, orderedLinks);
      attachDragAndDrop(app, orderedLinks, (nextLinks) => {
        orderedLinks = nextLinks;
        void saveOrder(orderedLinks.map((bookmark) => bookmark.id));
        renderAndBind();
      });
    };

    renderAndBind();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    renderStatus(app, `Failed to load bookmarks: ${message}`, "error");
  }
}

void init();
