#!/bin/bash

echo "🚀 Starting Family Hub..."
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if this is the first run
if [ ! -f "backend/.env" ]; then
    echo "📝 First time setup detected..."
    echo "Creating environment files..."
    cp backend/.env.example backend/.env
    cp frontend/.env.example frontend/.env
    echo "✅ Environment files created"
    echo ""
fi

# Start services
echo "🐳 Starting Docker containers..."
docker-compose down
docker-compose up -d

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
sleep 5

# Check if database exists
echo "🗄️  Setting up database..."
docker-compose exec -T backend sh -c "rails db:version" > /dev/null 2>&1

if [ $? -ne 0 ]; then
    echo "Creating and migrating database..."
    docker-compose exec -T backend sh -c "rails db:create db:migrate"
else
    echo "Running migrations..."
    docker-compose exec -T backend sh -c "rails db:migrate"
fi

echo ""
echo "✅ Family Hub is running!"
echo ""
echo "📱 Access your application:"
echo "   Frontend: http://localhost:5173"
echo "   Backend:  http://localhost:3000"
echo ""
echo "📚 Useful commands:"
echo "   View logs:           docker-compose logs -f"
echo "   Stop application:    docker-compose down"
echo "   Restart:             docker-compose restart"
echo "   Rails console:       docker-compose exec backend rails console"
echo ""
echo "💡 Tip: Check README.md for more information"
