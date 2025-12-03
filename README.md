# Family Hub

A beautiful, modern family organization SPA featuring a shared calendar, chores management, and grocery list. Built with Ruby on Rails backend and React frontend, fully dockerized for easy local development.

## Features

- 📅 **Family Calendar** - Large, interactive calendar taking up the majority of the page
- ✅ **Chores Management** - Organize chores by family member with tabs, due dates, and overdue notifications
- 🛒 **Grocery List** - Simple grocery list with quantity tracking and purchase status
- 🎨 **Monthly Themes** - Background automatically changes based on the current month
- 🐳 **Dockerized** - Complete Docker setup for seamless local development

## Tech Stack

### Backend
- Ruby on Rails 7.1 (API mode)
- PostgreSQL 15
- Google Calendar API integration (ready for implementation)

### Frontend
- React 18
- Vite
- Tailwind CSS
- Headless UI & Heroicons
- TanStack Query (React Query)
- react-calendar
- date-fns

## Getting Started

### Prerequisites
- Docker
- Docker Compose

### Installation

1. Clone the repository:
```bash
cd family-hub
```

2. Start the application with Docker Compose:
```bash
docker-compose up --build
```

This will:
- Start PostgreSQL database on port 5432
- Start Rails backend on port 3000
- Start React frontend on port 5173

3. In a new terminal, set up the database:
```bash
docker-compose exec backend rails db:create db:migrate
```

4. Access the application:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000

## Family Members

The application comes pre-configured with four family members:
- Mom (Pink)
- Dad (Blue)
- Gabi (Purple)
- Kayce (Green)

## Chores Features

- Create chores assigned to specific family members
- Set due dates (or leave without a due date)
- Overdue chores are highlighted in red
- Tab navigation to view chores by family member
- Mark chores as complete
- Delete chores

## Grocery List Features

- Add items with quantities
- Mark items as purchased
- Separate views for unpurchased and purchased items
- Delete items

## Monthly Background Themes

The app automatically changes its gradient background based on the month:
- January: Winter blues and cyans
- February: Valentine's day pinks and reds
- March: Spring greens
- April: Fresh spring yellows and greens
- May: Flower purples and pinks
- June: Summer sky blues
- July: Summer reds and oranges
- August: Warm summer ambers
- September: Autumn oranges
- October: Halloween oranges and purples
- November: Thanksgiving ambers and reds
- December: Winter holiday blues and purples

## Google Calendar Integration

The backend includes placeholder endpoints for Google Calendar sync. To implement:

1. Set up Google Calendar API credentials
2. Add credentials to Rails backend
3. Implement sync logic in `app/controllers/api/v1/google_calendar_controller.rb`

## Deployment

### Free Hosting Options

**Backend (Railway):**
1. Sign up at [Railway.app](https://railway.app)
2. Create new project from GitHub repo
3. Add PostgreSQL plugin
4. Set environment variables
5. Deploy

**Frontend (Vercel):**
1. Sign up at [Vercel.com](https://vercel.com)
2. Import your GitHub repository
3. Set build command: `cd frontend && npm run build`
4. Set output directory: `frontend/dist`
5. Set environment variable: `VITE_API_URL=<your-railway-backend-url>`
6. Deploy

## Development

### Backend Development

```bash
# Access Rails console
docker-compose exec backend rails console

# Run migrations
docker-compose exec backend rails db:migrate

# View logs
docker-compose logs -f backend
```

### Frontend Development

```bash
# Install new npm package
docker-compose exec frontend npm install <package-name>

# View logs
docker-compose logs -f frontend
```

### Stopping the Application

```bash
docker-compose down
```

### Removing Volumes (Clean Slate)

```bash
docker-compose down -v
```

## API Endpoints

### Family Members
- `GET /api/v1/family_members` - List all family members

### Chores
- `GET /api/v1/chores` - List all chores
- `POST /api/v1/chores` - Create a chore
- `PUT /api/v1/chores/:id` - Update a chore
- `DELETE /api/v1/chores/:id` - Delete a chore

### Grocery Items
- `GET /api/v1/grocery_items` - List all grocery items
- `POST /api/v1/grocery_items` - Create a grocery item
- `PUT /api/v1/grocery_items/:id` - Update a grocery item
- `DELETE /api/v1/grocery_items/:id` - Delete a grocery item

### Google Calendar
- `POST /api/v1/google_calendar/sync` - Sync with Google Calendar (placeholder)

## Customization

### Adding Family Members

Edit the migration file at `backend/db/migrate/20231203000001_create_family_members.rb` before running migrations, or add them via Rails console:

```ruby
FamilyMember.create(name: "New Member", color: "#FF6B6B")
```

### Changing Colors

Each family member has an associated color. You can modify these in the database or through the Rails console.

## License

MIT

## Support

For issues or questions, please open an issue on GitHub.
