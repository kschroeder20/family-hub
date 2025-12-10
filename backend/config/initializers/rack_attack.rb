class Rack::Attack
  # Configure cache store (uses Rails cache by default)
  Rack::Attack.cache.store = ActiveSupport::Cache::MemoryStore.new

  # Allow localhost in development
  safelist('allow-localhost') do |req|
    req.ip == '127.0.0.1' || req.ip == '::1'
  end

  # Throttle all requests by IP
  # Allow 100 requests per minute per IP
  throttle('req/ip', limit: 100, period: 1.minute) do |req|
    req.ip
  end

  # Throttle POST/PUT/DELETE requests more aggressively
  # Allow 20 write requests per minute per IP
  throttle('write/ip', limit: 20, period: 1.minute) do |req|
    if ['POST', 'PUT', 'PATCH', 'DELETE'].include?(req.env['REQUEST_METHOD'])
      req.ip
    end
  end

  # Throttle specific endpoints that create data
  # Allow 10 creates per minute per IP for chores
  throttle('chores/create/ip', limit: 10, period: 1.minute) do |req|
    if req.path == '/api/v1/chores' && req.post?
      req.ip
    end
  end

  # Allow 10 creates per minute per IP for grocery items
  throttle('grocery_items/create/ip', limit: 10, period: 1.minute) do |req|
    if req.path == '/api/v1/grocery_items' && req.post?
      req.ip
    end
  end

  # Block requests from known bad IPs (you can add IPs here)
  blocklist('block-bad-ips') do |req|
    # Example: Rack::Attack::Fail2Ban.filter("bad-ip-#{req.ip}", maxretry: 5, findtime: 1.minute, bantime: 1.hour) { true }
    false
  end

  # Custom response for throttled requests
  self.throttled_responder = lambda do |env|
    retry_after = env['rack.attack.match_data'][:period]
    [
      429,
      {
        'Content-Type' => 'application/json',
        'Retry-After' => retry_after.to_s
      },
      [{ error: 'Rate limit exceeded. Please try again later.' }.to_json]
    ]
  end

  # Custom response for blocked requests
  self.blocklisted_responder = lambda do |env|
    [
      403,
      { 'Content-Type' => 'application/json' },
      [{ error: 'Forbidden' }.to_json]
    ]
  end
end
