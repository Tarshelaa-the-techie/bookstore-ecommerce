const express = require("express");
const cors = require("cors");
const path = require("path");
const {
  initializeDatabase, getBooks, saveBooks, getOrders, saveOrders
} = require("./database");

const app = express();
const PORT = process.env.PORT || 3000;
const FRONTEND_DIR = path.join(__dirname, "..", "frontend");

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.static(FRONTEND_DIR));

initializeDatabase();

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Bookstore backend is running." });
});

app.get("/api/books", (req, res) => {
  try {
    const books = getBooks();
    const search = String(req.query.search || "").toLowerCase();
    const category = String(req.query.category || "").toLowerCase();
    const result = books.filter(book =>
      `${book.title} ${book.author} ${book.category}`.toLowerCase().includes(search) &&
      (!category || book.category.toLowerCase() === category)
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/books", (req, res) => {
  const title = String(req.body.title || "").trim();
  const author = String(req.body.author || "").trim();
  const category = String(req.body.category || "").trim();
  const price = Number(req.body.price);
  const stock = Number(req.body.stock);
  const image = String(req.body.image || "").trim();

  if (!title || !author || !category) {
    return res.status(400).json({ error: "Title, author, and category are required." });
  }
  if (!Number.isFinite(price) || price <= 0) {
    return res.status(400).json({ error: "Price must be greater than zero." });
  }
  if (!Number.isInteger(stock) || stock < 0) {
    return res.status(400).json({ error: "Stock must be a whole number of zero or more." });
  }
  if (image && !/^https?:\/\/\S+/i.test(image)) {
    return res.status(400).json({ error: "Cover image must be a valid http or https URL." });
  }

  try {
    const books = getBooks();
    const nextId = books.reduce((max, book) => Math.max(max, Number(book.id) || 0), 0) + 1;
    const newBook = { id: nextId, title, author, category, price, stock, image };
    books.push(newBook);
    saveBooks(books);
    res.status(201).json({ message: "Book saved successfully.", book: newBook });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/orders", (req, res) => {
  try {
    res.json(getOrders());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/orders", (req, res) => {
  const customerName = String(req.body.customerName || "").trim();
  const email = String(req.body.email || "").trim();
  const address = String(req.body.address || "").trim();
  const requestedItems = req.body.items;

  if (!customerName || !email || !address) {
    return res.status(400).json({ error: "Customer name, email, and address are required." });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "Enter a valid email address." });
  }
  if (!Array.isArray(requestedItems) || requestedItems.length === 0) {
    return res.status(400).json({ error: "Your order must contain at least one book." });
  }

  try {
    const books = getBooks();
    const orders = getOrders();
    const orderItems = [];
    let total = 0;

    for (const requested of requestedItems) {
      const bookId = Number(requested.bookId);
      const quantity = Number(requested.quantity);
      const book = books.find(item => item.id === bookId);

      if (!book) return res.status(400).json({ error: `Book ${bookId} no longer exists.` });
      if (!Number.isInteger(quantity) || quantity < 1) {
        return res.status(400).json({ error: "Book quantities must be positive whole numbers." });
      }
      if (quantity > book.stock) {
        return res.status(400).json({ error: `Only ${book.stock} copies of "${book.title}" are available.` });
      }
      const subtotal = Number((book.price * quantity).toFixed(2));
      total += subtotal;
      orderItems.push({ bookId: book.id, title: book.title, quantity, unitPrice: book.price, subtotal });
    }

    for (const item of orderItems) {
      const book = books.find(book => book.id === item.bookId);
      book.stock -= item.quantity;
    }

    const nextId = orders.reduce((max, order) => Math.max(max, Number(order.id) || 1000), 1000) + 1;
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
    res.status(201).json({ message: "Order placed successfully.", order });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Bookstore running at http://localhost:${PORT}`);
  console.log(`Books database: ${path.join(__dirname, "books.json")}`);
  console.log(`Orders database: ${path.join(__dirname, "orders.json")}`);
});
