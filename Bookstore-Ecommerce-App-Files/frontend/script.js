
const API = "https://bookstore-ecommerce-tryp.onrender.com/api";

const grid = document.getElementById("bookGrid");
const searchInput = document.getElementById("searchInput");
const categoryFilter = document.getElementById("categoryFilter");
const sortFilter = document.getElementById("sortFilter");
const cartPanel = document.getElementById("cartPanel");
const overlay = document.getElementById("overlay");
const cartItemsEl = document.getElementById("cartItems");
const cartCountEl = document.getElementById("cartCount");
const cartTotalEl = document.getElementById("cartTotal");
const adminMessage = document.getElementById("adminMessage");

let books = [];
let cart = [];

const money = value =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR"
  }).format(Number(value) || 0);

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

async function api(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Request failed. Please try again.");
  }

  return data;
}

// LOAD BOOKS FROM THE BACKEND

async function loadBooks() {
  try {
    const result = await api("/books");

    if (!Array.isArray(result)) {
      throw new Error("The backend returned an invalid book list.");
    }

    books = result;
    populateCategories();
    renderBooks();
  } catch (error) {
    grid.innerHTML = `
      <div class="empty-state">
        Unable to load books. Please check that your backend
        is running and refresh the page.
        <br><br>${escapeHTML(error.message)}
      </div>
    `;

    document.getElementById("bookCount").textContent =
      "Unable to load books";
  }
}

// CATEGORY FILTER

function populateCategories() {
  const previousCategory = categoryFilter.value;

  const categories = [
    ...new Set(
      books.map(book => book.category).filter(Boolean)
    )
  ].sort();

  categoryFilter.innerHTML =
    '<option value="">All categories</option>' +
    categories.map(category =>
      `<option value="${escapeHTML(category)}">${escapeHTML(category)}</option>`
    ).join("");

  categoryFilter.value = categories.includes(previousCategory)
    ? previousCategory
    : "";
}

// DISPLAY BOOKS

function renderBooks() {
  const search = searchInput.value.trim().toLowerCase();
  const category = categoryFilter.value;

  let visibleBooks = books.filter(book => {
    const searchableText =
      `${book.title} ${book.author} ${book.category}`.toLowerCase();

    return searchableText.includes(search) &&
      (!category || book.category === category);
  });

  if (sortFilter.value === "price-low") {
    visibleBooks.sort((a, b) => a.price - b.price);
  } else if (sortFilter.value === "price-high") {
    visibleBooks.sort((a, b) => b.price - a.price);
  } else if (sortFilter.value === "title") {
    visibleBooks.sort((a, b) => a.title.localeCompare(b.title));
  }

  document.getElementById("bookCount").textContent =
    `${visibleBooks.length} books to explore`;

  if (visibleBooks.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        No books found. Try another search or add a new book.
      </div>
    `;
    return;
  }

  grid.innerHTML = visibleBooks.map(book => {
    const imageHTML = book.image
      ? `
        <img
          class="cover"
          src="${escapeHTML(book.image)}"
          alt="Cover of ${escapeHTML(book.title)}"
          onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'"
        >
        <div class="cover-placeholder"
             style="--cover:${coverColor(book.id)};display:none">
          ${escapeHTML(book.title)}
        </div>
      `
      : `
        <div class="cover-placeholder"
             style="--cover:${coverColor(book.id)}">
          ${escapeHTML(book.title)}
        </div>
      `;

    return `
      <article class="book-card">
        <div class="cover-wrap">
          ${imageHTML}
          <span class="stock-tag">
            ${book.stock > 0
              ? `${book.stock} in stock`
              : "Sold out"}
          </span>
        </div>

        <div class="book-category">
          ${escapeHTML(book.category)}
        </div>

        <h3 class="book-title">
          ${escapeHTML(book.title)}
        </h3>

        <p class="book-author">
          by ${escapeHTML(book.author)}
        </p>

        <div class="book-bottom">
          <span class="price">${money(book.price)}</span>

          <button
            class="add-button"
            data-add="${Number(book.id)}"
            ${book.stock < 1 ? "disabled" : ""}
          >
            ${book.stock > 0 ? "＋ Add" : "Sold out"}
          </button>
        </div>
      </article>
    `;
  }).join("");
}

function coverColor(id) {
  const colors = [
    "#536b4c",
    "#b86f52",
    "#5c7088",
    "#8a7655",
    "#765c78",
    "#bf9d57"
  ];

  return colors[Math.abs(Number(id) || 0) % colors.length];
}

// SHOPPING CART

function openCart() {
  cartPanel.classList.add("open");
  overlay.classList.add("show");
  cartPanel.setAttribute("aria-hidden", "false");
}

function closeCart() {
  cartPanel.classList.remove("open");
  overlay.classList.remove("show");
  cartPanel.setAttribute("aria-hidden", "true");
}

function addToCart(id) {
  const book = books.find(item => item.id === Number(id));

  if (!book || book.stock < 1) return;

  const existingItem = cart.find(item => item.bookId === book.id);

  if (existingItem) {
    if (existingItem.quantity >= book.stock) {
      alert("You have reached the available stock limit.");
      return;
    }

    existingItem.quantity++;
  } else {
    cart.push({
      bookId: book.id,
      title: book.title,
      price: Number(book.price),
      quantity: 1,
      stock: Number(book.stock)
    });
  }

  renderCart();
}

function changeQuantity(id, change) {
  const item = cart.find(row => row.bookId === Number(id));

  if (!item) return;

  const newQuantity = item.quantity + change;

  if (newQuantity <= 0) {
    cart = cart.filter(row => row.bookId !== Number(id));
  } else if (newQuantity > item.stock) {
    alert("You have reached the available stock limit.");
  } else {
    item.quantity = newQuantity;
  }

  renderCart();
}

function renderCart() {
  const count = cart.reduce(
    (sum, item) => sum + item.quantity, 0
  );

  const total = cart.reduce(
    (sum, item) => sum + item.price * item.quantity, 0
  );

  cartCountEl.textContent = count;
  cartTotalEl.textContent = money(total);

  if (cart.length === 0) {
    cartItemsEl.innerHTML =
      '<p class="muted">Your cart is empty. Add a book you love.</p>';
    return;
  }

  cartItemsEl.innerHTML = cart.map(item => `
    <div class="cart-row">
      <div>
        <strong>${escapeHTML(item.title)}</strong>
        <small>${money(item.price)} each</small>

        <div class="qty-controls">
          <button
            data-qty="${item.bookId}"
            data-delta="-1"
            aria-label="Decrease quantity"
          >−</button>

          <span>${item.quantity}</span>

          <button
            data-qty="${item.bookId}"
            data-delta="1"
            aria-label="Increase quantity"
          >+</button>
        </div>
      </div>

      <strong>${money(item.price * item.quantity)}</strong>
    </div>
  `).join("");
}

// CHECKOUT AND SAVE ORDER TO BACKEND

async function checkout() {
  if (cart.length === 0) {
    alert("Your cart is empty.");
    return;
  }

  const customerName = prompt("Enter your full name:");
  if (!customerName || !customerName.trim()) return;

  const email = prompt("Enter your email address:");
  if (!email || !email.trim()) return;

  const address = prompt("Enter your delivery address:");
  if (!address || !address.trim()) return;

  try {
    const result = await api("/orders", {
      method: "POST",
      body: JSON.stringify({
        customerName: customerName.trim(),
        email: email.trim(),
        address: address.trim(),
        items: cart.map(item => ({
          bookId: item.bookId,
          quantity: item.quantity
        }))
      })
    });

    alert(
      `Order placed successfully!\n` +
      `Order ID: ${result.order.id}\n` +
      `Total: ${money(result.order.total)}\n\n` +
      "Your order has been saved in backend/orders.json."
    );

    cart = [];
    renderCart();
    closeCart();

    await loadBooks();
  } catch (error) {
    alert(error.message);
    await loadBooks();
  }
}

// ADD NEW BOOK — FIXED FORM HANDLER

document.getElementById("addBookForm").addEventListener(
  "submit",
  async function (event) {
    event.preventDefault();

    // Save the form reference BEFORE the first await.
    const formElement = event.currentTarget;
    const formData = new FormData(formElement);

    adminMessage.textContent = "Saving book...";

    const payload = {
      title: String(formData.get("title") || "").trim(),
      author: String(formData.get("author") || "").trim(),
      category: String(formData.get("category") || "").trim(),
      price: Number(formData.get("price")),
      stock: Number(formData.get("stock")),
      image: String(formData.get("image") || "").trim()
    };

    if (!payload.title || !payload.author || !payload.category) {
      adminMessage.textContent =
        "Please enter the title, author, and category.";
      return;
    }

    if (!Number.isFinite(payload.price) || payload.price <= 0) {
      adminMessage.textContent = "Enter a valid price greater than zero.";
      return;
    }

    if (!Number.isInteger(payload.stock) || payload.stock < 0) {
      adminMessage.textContent =
        "Stock must be a whole number of zero or more.";
      return;
    }

    try {
      await api("/books", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      // Use formElement, not event.currentTarget, after await.
      formElement.reset();
      formElement.elements.stock.value = 10;

      adminMessage.textContent =
        "Book added successfully and saved to books.json.";

      await loadBooks();
    } catch (error) {
      adminMessage.textContent =
        `Could not add book: ${error.message}`;
    }
  }
);

// EVENT LISTENERS

grid.addEventListener("click", event => {
  const button = event.target.closest("[data-add]");

  if (button) {
    addToCart(button.dataset.add);
    openCart();
  }
});

cartItemsEl.addEventListener("click", event => {
  const button = event.target.closest("[data-qty]");

  if (button) {
    changeQuantity(
      button.dataset.qty,
      Number(button.dataset.delta)
    );
  }
});

searchInput.addEventListener("input", renderBooks);
categoryFilter.addEventListener("change", renderBooks);
sortFilter.addEventListener("change", renderBooks);

document.getElementById("cartToggle").addEventListener(
  "click", openCart
);

document.getElementById("closeCart").addEventListener(
  "click", closeCart
);

overlay.addEventListener("click", closeCart);

document.getElementById("checkoutButton").addEventListener(
  "click", checkout
);

document.addEventListener("keydown", event => {
  if (event.key === "Escape") closeCart();
});

// START APPLICATION

renderCart();
loadBooks();
