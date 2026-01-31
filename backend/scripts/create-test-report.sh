#!/bin/bash

# Script to create a draft daily report for testing
# Usage: ./scripts/create-test-report.sh

set -e

echo "======================================"
echo "Create Test Daily Report"
echo "======================================"
echo ""

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo "⚠️  jq is not installed. Install it with: brew install jq (macOS)"
    echo "   Without jq, you'll see raw JSON responses."
    JQ_AVAILABLE=false
else
    JQ_AVAILABLE=true
fi

echo "Step 1: Login/Signup"
echo "--------------------"

# Use a test account
EMAIL="test@keystone.com"
PASSWORD="password123"
COMPANY="Test Construction Co"
FULL_NAME="Test User"

echo "Creating/logging in as: $EMAIL"

# Try signup first (will fail if already exists, that's ok)
SIGNUP_RESPONSE=$(curl -s -X POST http://localhost:3000/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d "{
    \"company_name\": \"$COMPANY\",
    \"full_name\": \"$FULL_NAME\",
    \"email\": \"$EMAIL\",
    \"password\": \"$PASSWORD\"
  }")

# Try login
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"password\": \"$PASSWORD\"
  }")

if [ "$JQ_AVAILABLE" = true ]; then
    TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.token')
else
    TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*' | sed 's/"token":"//')
fi

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
    echo "❌ Failed to login"
    echo "$LOGIN_RESPONSE"
    exit 1
fi

echo "✅ Logged in successfully"
echo ""

echo "Step 2: Get Projects"
echo "--------------------"

PROJECTS_RESPONSE=$(curl -s -X GET http://localhost:3000/api/v1/projects \
  -H "Authorization: Bearer $TOKEN")

if [ "$JQ_AVAILABLE" = true ]; then
    PROJECT_COUNT=$(echo "$PROJECTS_RESPONSE" | jq '.data | length')
    echo "Found $PROJECT_COUNT project(s)"
    PROJECT_ID=$(echo "$PROJECTS_RESPONSE" | jq -r '.data[0].id')
else
    echo "$PROJECTS_RESPONSE"
    PROJECT_ID=$(echo "$PROJECTS_RESPONSE" | grep -o '"id":"[^"]*' | head -1 | sed 's/"id":"//')
fi

if [ -z "$PROJECT_ID" ] || [ "$PROJECT_ID" = "null" ]; then
    echo ""
    echo "⚠️  No projects found. Creating one..."
    
    CREATE_PROJECT_RESPONSE=$(curl -s -X POST http://localhost:3000/api/v1/projects \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d "{
        \"project_number\": \"PRJ-001\",
        \"name\": \"Test Project\",
        \"company_name\": \"Test Construction Co\",
        \"address_line_1\": \"123 Main Street\",
        \"address_line_2\": \"Suite 100\",
        \"city\": \"Toronto\",
        \"region\": \"Ontario\",
        \"postal_code\": \"M5H 2N2\",
        \"country\": \"Canada\",
        \"location\": \"Test Site\"
      }")
    
    if [ "$JQ_AVAILABLE" = true ]; then
        PROJECT_ID=$(echo "$CREATE_PROJECT_RESPONSE" | jq -r '.data.id')
        echo "✅ Created project: $(echo "$CREATE_PROJECT_RESPONSE" | jq -r '.data.name')"
    else
        PROJECT_ID=$(echo "$CREATE_PROJECT_RESPONSE" | grep -o '"id":"[^"]*' | head -1 | sed 's/"id":"//')
        echo "✅ Created project"
    fi
fi

echo ""
echo "Selected Project ID:"
echo "$PROJECT_ID"
echo ""

echo "Step 3: Create Draft Report"
echo "----------------------------"

# Use today's date
REPORT_DATE=$(date +%Y-%m-%d)

echo "Creating report for date: $REPORT_DATE"

CREATE_REPORT_RESPONSE=$(curl -s -X POST "http://localhost:3000/api/v1/projects/$PROJECT_ID/daily-reports" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"report_date\": \"$REPORT_DATE\"
  }")

if [ "$JQ_AVAILABLE" = true ]; then
    REPORT_ID=$(echo "$CREATE_REPORT_RESPONSE" | jq -r '.data.id')
    REPORT_STATUS=$(echo "$CREATE_REPORT_RESPONSE" | jq -r '.data.status')
    
    echo ""
    echo "✅ Report created/retrieved"
    echo "Status: $REPORT_STATUS"
else
    REPORT_ID=$(echo "$CREATE_REPORT_RESPONSE" | grep -o '"id":"[^"]*' | head -1 | sed 's/"id":"//')
    echo ""
    echo "✅ Report created/retrieved"
fi

echo ""
echo "======================================"
echo "✅ Success!"
echo "======================================"
echo ""
echo "📋 IDs (copy these carefully):"
echo "---------------------"
echo ""
echo "Project ID:"
echo "$PROJECT_ID"
echo ""
echo "Report ID:"
echo "$REPORT_ID"
echo ""
echo "Report Date: $REPORT_DATE"
echo ""
echo "======================================"
echo "🌐 OPEN THIS URL IN YOUR BROWSER:"
echo "======================================"
echo ""
echo "http://localhost:3001/projects/$PROJECT_ID/daily-reports/$REPORT_ID"
echo ""
echo "======================================"
echo ""
echo "Other useful URLs:"
echo "- Project Dashboard: http://localhost:3001/projects/$PROJECT_ID"
echo "- All Reports: http://localhost:3001/projects/$PROJECT_ID/daily-reports"
echo ""
echo "======================================"
