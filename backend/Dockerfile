FROM ruby:3.2.2-alpine

# Install dependencies
RUN apk add --no-cache \
    build-base \
    postgresql-dev \
    nodejs \
    tzdata \
    git

# Set working directory
WORKDIR /app

# Copy Gemfile
COPY Gemfile* ./

# Install gems
RUN bundle install

# Copy application code
COPY . .

# Expose port
EXPOSE 3000

# Start server
CMD ["rails", "server", "-b", "0.0.0.0"]
