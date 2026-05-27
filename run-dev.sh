#!/bin/bash

# Azure AD B2C Configuration
# Update these placeholders with your real values
export AZURE_AD_B2C_CLIENT_ID="{{CLIENT_ID}}"
export AZURE_AD_B2C_CLIENT_SECRET="{{CLIENT_SECRET}}"
export AZURE_AD_B2C_INSTANCE="https://example.b2clogin.com"
export AZURE_AD_B2C_DOMAIN="example.onmicrosoft.com"
export AZURE_AD_B2C_USER_FLOW="{{USER_FLOW}}"
# export AZURE_AD_B2C_TENANT_ID="your-tenant-id-guid" # Optional if DOMAIN is provided
export AZURE_AD_B2C_REDIRECT_URI="{{redirect_uri}}" # Optional: Explicit redirect URI
export ACCOUNT_API_BASE_URL=""

# Authentication Cookie Configuration
# export AUTH_COOKIE_PASSWORD="at-least-32-characters-long-secret-password"
export AUTH_COOKIE_SECURE="false" # Set to false for local HTTP development

# epr-regulator-gateway API
export GATEWAY_API_BASE_URL="http://localhost:8085/"
export GATEWAY_API_BASIC_AUTH_USERNAME=""
export GATEWAY_API_BASIC_AUTH_PASSWORD=""

# Application Configuration
export PORT=7154
export NODE_ENV="development"

# Terminate anything running on the application port
echo "Checking for any process running on port $PORT..."
PID=$(lsof -ti :$PORT)
if [ -n "$PID" ]; then
  echo "Terminating process $PID running on port $PORT..."
  kill -9 "$PID"
fi

# Run the application
npm run dev
