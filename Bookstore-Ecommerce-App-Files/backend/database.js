const fs = require("fs");
const path = require("path");

const DATA_DIR = __dirname;
const BOOKS_FILE = path.join(DATA_DIR, "books.json");
const ORDERS_FILE = path.join(DATA_DIR, "orders.json");

const initialBooks = [
  { id: 1, title: "Atomic Habits", author: "James Clear", category: "Self Development", price: 399, stock: 12, image: "" },
  { id: 2, title: "The Alchemist", author: "Paulo Coelho", category: "Fiction", price: 299, stock: 8, image: "" },
  { id: 3, title: "Ikigai", author: "Héctor García & Francesc Miralles", category: "Lifestyle", price: 349, stock: 10, image: "" },
  { id: 4, title: "The Psychology of Money", author: "Morgan Housel", category: "Finance", price: 450, stock: 6, image: "" },
  { id: 5, title: "Wings of Fire", author: "A. P. J. Abdul Kalam", category: "Biography", price: 250, stock: 15, image: "" },
  { id: 6, title: "Deep Work", author: "Cal Newport", category: "Productivity", price: 425, stock: 7, image: "" },
  { id: 7, title: "Pride and Prejudice", author: "Jane Austen", category: "Classic", price: 275, stock: 5, image: "" },
  { id: 8, title: "The Hobbit", author: "J. R. R. Tolkien", category: "Fantasy", price: 499, stock: 4, image: "" }
];

function ensureFile(filePath, defaultData) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2), "utf8");
  }
}

function initializeDatabase() {
  ensureFile(BOOKS_FILE, initialBooks);
  ensureFile(ORDERS_FILE, []);
}

function readJSON(filePath) {
  initializeDatabase();
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    throw new Error(`Could not read ${path.basename(filePath)}. Check that it contains valid JSON.`);
  }
}

function writeJSON(filePath, data) {
  initializeDatabase();
  const temporaryPath = `${filePath}.tmp`;
  fs.writeFileSync(temporaryPath, JSON.stringify(data, null, 2), "utf8");
  fs.renameSync(temporaryPath, filePath);
}

function getBooks() { return readJSON(BOOKS_FILE); }
function saveBooks(books) { writeJSON(BOOKS_FILE, books); }
function getOrders() { return readJSON(ORDERS_FILE); }
function saveOrders(orders) { writeJSON(ORDERS_FILE, orders); }

module.exports = { initializeDatabase, getBooks, saveBooks, getOrders, saveOrders };
