#!/bin/bash

# Check if AUTH_TOKEN is set
if [ -z "$AUTH_TOKEN" ]; then
  # Generate a random token (32 bytes hex encoded = 64 characters)
  GENERATED_TOKEN=$(openssl rand -hex 32)

  # Export the token for the current session
  export AUTH_TOKEN="$GENERATED_TOKEN"

  # Output the token to stdout
  echo "=========================================="
  echo "AUTH_TOKEN not configured. Generated token:"
  echo "=========================================="
  echo ""
  echo "$GENERATED_TOKEN"
  echo ""
  echo "=========================================="
  echo "Use this token to access the application."
  echo "To persist this token, set AUTH_TOKEN environment variable."
  echo "=========================================="
else
  echo "Using existing AUTH_TOKEN from environment"
fi

# Run the command passed to this script
exec "$@"
