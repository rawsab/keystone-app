#!/bin/bash
# Quick script to get the direct URL for the most recent report

set -e

# Login
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@keystone.com", "password": "password123"}')

TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*' | sed 's/"token":"//')

if [ -z "$TOKEN" ]; then
    echo "❌ Login failed. Run ./scripts/create-test-report.sh first"
    exit 1
fi

# Get projects
PROJECTS=$(curl -s -X GET http://localhost:3000/api/v1/projects \
  -H "Authorization: Bearer $TOKEN")

PROJECT_ID=$(echo "$PROJECTS" | grep -o '"id":"[^"]*' | head -1 | sed 's/"id":"//')

if [ -z "$PROJECT_ID" ]; then
    echo "❌ No projects found. Run ./scripts/create-test-report.sh first"
    exit 1
fi

# Get reports
REPORTS=$(curl -s -X GET "http://localhost:3000/api/v1/projects/$PROJECT_ID/daily-reports" \
  -H "Authorization: Bearer $TOKEN")

REPORT_ID=$(echo "$REPORTS" | grep -o '"id":"[^"]*' | head -1 | sed 's/"id":"//')

if [ -z "$REPORT_ID" ]; then
    echo "❌ No reports found. Run ./scripts/create-test-report.sh first"
    exit 1
fi

echo ""
echo "📝 Most Recent Report URL:"
echo "http://localhost:3001/projects/$PROJECT_ID/daily-reports/$REPORT_ID"
echo ""
