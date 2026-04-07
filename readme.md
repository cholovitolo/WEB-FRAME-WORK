# GatherSpot 🌐

> A full-stack meetup platform — discover events, meet people, explore real locations.

Built with **Node.js + Express**, **MongoDB**, **EJS**, and the **Google Places API**.

---

## Project Structure

```
gatherspot/
├── config/
│   ├── db.js           # Mongoose connection helper
│   ├── jwt.js          # Token signing, verification & cookie util
│   └── logger.js       # Winston logger (console + file)
├── controllers/
│   ├── AuthController.js    # register, login, logout, profile
│   ├── EventController.js   # CRUD, join/leave, messages
│   └── PlacesController.js  # Google Places API proxy
├── middleware/
│   ├── authMiddleware.js    # protect, optionalAuth, restrictTo
│   ├── errorMiddleware.js   # notFound + global errorHandler
│   ├── pageRoutes.js        # redirectIfAuthenticated
│   └── validateMiddleware.js# express-validator rules
├── models/
│   ├── User.js     # User schema with bcrypt hooks
│   ├── Event.js    # Event schema with location sub-doc
│   └── Message.js  # Event discussion messages
├── public/
│   └── css/
│       └── main.css    # Full design system (dark luxury theme)
├── routes/
│   ├── authRoutes.js   # /auth/* REST endpoints
│   ├── eventRoutes.js  # /events/* REST endpoints
│   ├── apiRoutes.js    # /api/places/* proxy
│   └── pageRoutes.js   # EJS server-rendered pages
├── views/
│   ├── partials/
│   │   ├── header.ejs      # Navbar + <head>
│   │   ├── footer.ejs      # Footer + global JS
│   │   └── eventCard.ejs   # Reusable event card component
│   ├── auth/
│   │   ├── login.ejs
│   │   └── register.ejs
│   ├── events/
│   │   ├── create.ejs
│   │   ├── edit.ejs
│   │   └── show.ejs
│   ├── home.ejs
│   ├── explore.ejs
│   ├── dashboard.ejs
│   ├── profile.ejs
│   └── error.ejs
├── .env                # Environment variables (never commit)
├── app.js              # Express entry point
├── package.json
└── ReadMe.md
```

---

## Getting Started

### Prerequisites
- Node.js ≥ 18
- MongoDB running on `localhost:27017`
- A [Google Places API key](https://developers.google.com/maps/documentation/places/web-service/get-api-key)

### Installation

```bash
# 1. Clone & install
git clone <your-repo-url>
cd gatherspot
npm install

# 2. Configure environment
cp .env .env.local
# Edit .env and fill in your values:
#   GOOGLE_PLACES_API_KEY=...
#   JWT_SECRET=...

# 3. Start MongoDB (if not running)
mongod --dbpath /data/db

# 4. Run the app
npm run dev          # development (nodemon)
npm start            # production
```

App runs at **http://localhost:3000**

---

## Environment Variables

| Variable             | Description                          | Default              |
|----------------------|--------------------------------------|----------------------|
| `PORT`               | Server port                          | `3000`               |
| `MONGO_URI`          | MongoDB connection string            | `mongodb://localhost:27017/Stats` |
| `JWT_SECRET`         | Secret for signing JWTs              | *(required)*         |
| `JWT_EXPIRES_IN`     | Token expiry duration                | `7d`                 |
| `GOOGLE_PLACES_API_KEY` | Google Places API key            | *(required)*         |
| `BCRYPT_SALT_ROUNDS` | bcrypt hashing rounds                | `12`                 |
| `NODE_ENV`           | `development` or `production`        | `development`        |

---

## API Reference

### Auth — `/auth`

| Method | Path               | Auth | Description            |
|--------|--------------------|------|------------------------|
| POST   | `/auth/register`   | —    | Register new user      |
| POST   | `/auth/login`      | —    | Login, receive JWT     |
| POST   | `/auth/logout`     | —    | Clear JWT cookie       |
| GET    | `/auth/me`         | ✓    | Get current user       |
| PUT    | `/auth/profile`    | ✓    | Update profile         |
| PUT    | `/auth/change-password` | ✓ | Change password      |

### Events — `/events`

| Method | Path                     | Auth | Description               |
|--------|--------------------------|------|---------------------------|
| GET    | `/events`                | opt  | List/search events        |
| POST   | `/events`                | ✓    | Create event              |
| GET    | `/events/:id`            | opt  | Get single event          |
| PUT    | `/events/:id`            | ✓    | Update event (organizer)  |
| DELETE | `/events/:id`            | ✓    | Delete event (organizer)  |
| POST   | `/events/:id/join`       | ✓    | Join event                |
| POST   | `/events/:id/leave`      | ✓    | Leave event               |
| GET    | `/events/:id/messages`   | ✓    | Get event discussion      |
| POST   | `/events/:id/messages`   | ✓    | Post message              |

### Places — `/api/places`

| Method | Path                          | Auth | Description                    |
|--------|-------------------------------|------|--------------------------------|
| GET    | `/api/places/autocomplete`    | ✓    | Search address predictions     |
| GET    | `/api/places/details`         | ✓    | Get place details by placeId   |
| GET    | `/api/places/nearby`          | ✓    | Find nearby places by lat/lng  |

---

## Architecture Decisions

- **MVC Pattern** — controllers handle logic, models own the schema, routes map URLs, views render HTML.
- **JWT + HTTP-only Cookies** — tokens stored in cookies (XSS protection) with Bearer fallback for API clients.
- **Google Places Proxy** — all Places requests go through `/api/places/*` so the API key is never exposed to the browser.
- **optionalAuth middleware** — public pages work for guests while showing personalised content for logged-in users.
- **Express-validator** — all inputs validated before reaching controllers.
- **Winston logging** — structured logs written to `logs/` in production.

---

## Security Highlights

- Passwords hashed with **bcrypt** (12 rounds)
- JWTs signed with a strong secret, stored in **httpOnly, SameSite=strict** cookies
- Authorization checks on every write operation — users can only edit/delete **their own** events
- Input validation on all routes (express-validator)
- Environment variables kept out of source via `.env` (add to `.gitignore`)
- Google Places API key never exposed to the client

---

## Tech Stack

| Layer      | Technology                              |
|------------|-----------------------------------------|
| Runtime    | Node.js 18+                             |
| Framework  | Express 4                               |
| Database   | MongoDB 7 via Mongoose                  |
| Templates  | EJS (Embedded JavaScript)               |
| Auth       | JWT + bcryptjs                          |
| Validation | express-validator                       |
| Logging    | Winston                                 |
| Maps       | Google Places API + Google Maps JS SDK  |
| Styling    | Vanilla CSS (design system in main.css) |
| Fonts      | Cormorant Garamond + DM Sans            |