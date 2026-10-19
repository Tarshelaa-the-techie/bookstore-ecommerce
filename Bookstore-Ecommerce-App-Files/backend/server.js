const express = require("express");
const cors = require("cors");
const path = require("path");

const {
  initializeDatabase,
  getBooks,
  saveBooks,
  getOrders,
  saveOrders
} = require("./database");

const app = express();
const PORT = process.env.PORT || 3000;

const FRONTEND_DIR = path.join(__dirname, "..", "frontend");

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "DELETE", "PUT", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json({ limit: "1mb" }));

// DEBUG: Log every incoming request and its response status.
app.use((req, res, next) => {
  console.log(`[REQUEST] ${req.method} ${req.originalUrl}`);

  res.on("finish", () => {
    console.log(
      `[RESPONSE] ${req.method} ${req.originalUrl} -> ${res.statusCode}`
    );
  });

  next();
});

app.use(express.static(FRONTEND_DIR));

// Initialize the JSON database.
try {
  initializeDatabase();
  console.log("Database initialized successfully.");
} catch (error) {
  console.error("Database initialization failed:", error);
  throw error;
}

// HEALTH CHECK
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Bookstore backend is running."
  });
});

// GET ALL BOOKS
app.get("/api/books", (req, res) => {
  try {
    const books = getBooks();

    const search = String(req.query.search || "").toLowerCase();
    const category = String(req.query.category || "").toLowerCase();

    const result = books.filter(book =>
      `${book.title} ${book.author} ${book.category}`
        .toLowerCase()
        .includes(search) &&
      (!category ||
        String(book.category || "").toLowerCase() === category)
    );

    res.json(result);
  } catch (error) {
    console.error("GET BOOKS ERROR:", error);
    res.status(500).json({
      error: "Unable to retrieve books."
    });
  }
});

// ADD A NEW BOOK
app.post("/api/books", (req, res) => {
  const title = String(req.body.title || "").trim();
  const author = String(req.body.author || "").trim();
  const category = String(req.body.category || "").trim();
  const price = Number(req.body.price);
  const stock = Number(req.body.stock);
  const image = String(req.body.image || "").trim();

  if (!title || !author || !category) {
    return res.status(400).json({
      error: "Title, author, and category are required."
    });
  }

  if (!Number.isFinite(price) || price <= 0) {
    return res.status(400).json({
      error: "Price must be greater than zero."
    });
  }

  if (!Number.isInteger(stock) || stock < 0) {
    return res.status(400).json({
      error: "Stock must be a whole number of zero or more."
    });
  }

  if (image && !/^https?:\/\/\S+/i.test(image)) {
    return res.status(400).json({
      error: "Cover image must be a valid HTTP or HTTPS URL."
    });
  }

  try {
    const books = getBooks();

    const nextId =
      books.reduce(
        (max, book) => Math.max(max, Number(book.id) || 0),
        0
      ) + 1;

    const newBook = {
      id: nextId,
      title,
      author,
      category,
      price,
      stock,
      image
    };

    books.push(newBook);
    saveBooks(books);

    console.log("BOOK ADDED:", newBook.id);

    res.status(201).json({
      message: "Book saved successfully.",
      book: newBook
    });
  } catch (error) {
    console.error("ADD BOOK ERROR:", error);

    res.status(500).json({
      error: "Unable to save the new book."
    });
  }
});

// DELETE A BOOK BY ID
app.delete("/api/books/:id", (req, res) => {
  const requestedId = String(req.params.id).trim();

  console.log("[DELETE ROUTE HIT] Requested book ID:", requestedId);

  if (!/^\d+$/.test(requestedId)) {
    return res.status(400).json({
      error: "Invalid book ID."
    });
  }

  try {
    const books = getBooks();

    console.log(
      "[DELETE DEBUG] Available book IDs:",
      books.map(book => book.id)
    );

    const bookToDelete = books.find(
      book => Number(book.id) === Number(requestedId)
    );

    if (!bookToDelete) {
      console.log(
        "[DELETE DEBUG] Book not found:",
        requestedId
      );

      return res.status(404).json({
        error: `Book with ID ${requestedId} not found.`
      });
    }

    const updatedBooks = books.filter(
      book => Number(book.id) !== Number(requestedId)
    );

    saveBooks(updatedBooks);

    console.log(
      "[DELETE SUCCESS] Deleted book:",
      bookToDelete.title,
      "ID:",
      requestedId
    );

    res.json({
      message: "Book deleted successfully.",
      deletedId: Number(requestedId)
    });
  } catch (error) {
    console.error("[DELETE ERROR]", error);

    res.status(500).json({
      error: "Unable to delete the book. Check the backend logs."
    });
  }
});

// GET ALL ORDERS
app.get("/api/orders", (req, res) => {
  try {
    res.json(getOrders());
  } catch (error) {
    console.error("GET ORDERS ERROR:", error);

    res.status(500).json({
      error: "Unable to retrieve orders."
    });
  }
});

// PLACE AN ORDER
app.post("/api/orders", (req, res) => {
  const customerName = String(req.body.customerName || "").trim();
  const email = String(req.body.email || "").trim();
  const address = String(req.body.address || "").trim();
  const requestedItems = req.body.items;

  if (!customerName || !email || !address) {
    return res.status(400).json({
      error: "Customer name, email, and address are required."
    });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({
      error: "Enter a valid email address."
    });
  }

  if (!Array.isArray(requestedItems) || requestedItems.length === 0) {
    return res.status(400).json({
      error: "Your order must contain at least one book."
    });
  }

  try {
    const books = getBooks();
    const orders = getOrders();

    const orderItems = [];
    let total = 0;

    for (const requested of requestedItems) {
      const bookId = Number(requested.bookId);
      const quantity = Number(requested.quantity);

      const book = books.find(
        item => Number(item.id) === bookId
      );

      if (!book) {
        return res.status(400).json({
          error: `Book ${bookId} no longer exists.`
        });
      }

      if (!Number.isInteger(quantity) || quantity < 1) {
        return res.status(400).json({
          error: "Book quantities must be positive whole numbers."
        });
      }

      if (quantity > book.stock) {
        return res.status(400).json({
          error: `Only ${book.stock} copies of "${book.title}" are available.`
        });
      }

      const subtotal = Number(
        (book.price * quantity).toFixed(2)
      );

      total += subtotal;

      orderItems.push({
        bookId: book.id,
        title: book.title,
        quantity,
        unitPrice: book.price,
        subtotal
      });
    }

    for (const item of orderItems) {
      const book = books.find(
        entry => Number(entry.id) === Number(item.bookId)
      );

      if (book) {
        book.stock -= item.quantity;
      }
    }

    const nextId =
      orders.reduce(
        (max, order) => Math.max(max, Number(order.id) || 1000),
        1000
      ) + 1;

    const order = {
      id: nextId,
      customerName,
      email,
      address,
      items: orderItems,
      total: Number(total.toFixed(2)),
      status: "Placed",
      createdAt: new Date().toISOString()
    };

    saveBooks(books);

    orders.push(order);
    saveOrders(orders);

    console.log("[ORDER SUCCESS] Order ID:", order.id);

    res.status(201).json({
      message: "Order placed successfully.",
      order
    });
  } catch (error) {
    console.error("PLACE ORDER ERROR:", error);

    res.status(500).json({
      error: "Unable to place the order."
    });
  }
});

// API FALLBACK: Never return index.html for an unknown API endpoint.
app.use("/api", (req, res) => {
  console.log(
    "[API ROUTE NOT FOUND]",
    req.method,
    req.originalUrl
  );

  res.status(404).json({
    error: "API endpoint not found.",
    method: req.method,
    path: req.originalUrl
  });
});

// SERVE FRONTEND
app.get("*", (req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, "index.html"));
});

// START SERVER
app.listen(PORT, () => {
  console.log(`Bookstore running on port ${PORT}`);
  console.log("Frontend directory:", FRONTEND_DIR);
});