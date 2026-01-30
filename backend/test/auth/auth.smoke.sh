#!/bin/bash

echo "Testing Keystone Authentication Endpoints"
echo "============================================="

BASE_URL="http://localhost:3000/api/v1"

# Test 1: Signup
echo -e "\nTest 1: Signup"
SIGNUP_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "company_name": "Test Company",
    "full_name": "Test User",
    "email": "test@example.com",
    "password": "password123"
  }')

echo "$SIGNUP_RESPONSE" | python3 -m json.tool

# Extract token
TOKEN=$(echo "$SIGNUP_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['token'])" 2>/dev/null)

if [ -z "$TOKEN" ]; then
  echo "Failed to get token from signup"
  exit 1
fi

echo "Token: ${TOKEN:0:50}..."

# Test 2: Get current user
echo -e "\nTest 2: GET /users/me (with token)"
curl -s -X GET "$BASE_URL/users/me" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool

# Test 3: Login
echo -e "\nTest 3: Login with same credentials"
curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }' | python3 -m json.tool

# Test 4: Login with wrong password
echo -e "\nTest 4: Login with wrong password (should fail)"
curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "wrongpassword"
  }' | python3 -m json.tool

# Test 5: Duplicate signup
echo -e "\nTest 5: Duplicate signup (should fail)"
curl -s -X POST "$BASE_URL/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "company_name": "Another Company",
    "full_name": "Another User",
    "email": "test@example.com",
    "password": "password123"
  }' | python3 -m json.tool

# Test 6: Case-insensitive email
echo -e "\nTest 6: Case-insensitive email signup (should fail)"
curl -s -X POST "$BASE_URL/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "company_name": "Yet Another Company",
    "full_name": "Yet Another User",
    "email": "TEST@EXAMPLE.COM",
    "password": "password123"
  }' | python3 -m json.tool

# Test 7: /users/me without token
echo -e "\nTest 7: GET /users/me without token (should fail)"
curl -s -X GET "$BASE_URL/users/me" | python3 -m json.tool

echo -e "\nAll tests complete!"
