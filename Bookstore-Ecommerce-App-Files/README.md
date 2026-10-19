# Chapter & Co. — Bookstore E-commerce App

## Requirements
- Install Node.js (LTS) from https://nodejs.org/
- Internet is only needed for the optional Google Fonts stylesheet and remote cover images.

## Run the project
1. Extract the project folder.
2. Open a terminal / Command Prompt inside `Bookstore-Ecommerce-App`.
3. Run `npm install`.
4. Run `npm start`.
5. Open http://localhost:3000 in your browser.

Keep the terminal open while using the website.

## File-based database
When the server starts, it automatically creates:
- `backend/books.json` — book catalogue and stock
- `backend/orders.json` — placed orders

Both files are ordinary JSON files and can be opened with Notepad. They are created in the backend folder and persist after the server stops.

## Features
- Browse, search, filter, and sort books
- Add books to the catalogue
- Add books to a cart and change quantities
- Demo checkout with customer name, email, and address
- Orders saved in JSON and stock adjusted after purchase

## Important
This is an educational local demo. It does not process payments and has no admin authentication. Do not use it as a public production store without adding authentication, security, and a proper database.
