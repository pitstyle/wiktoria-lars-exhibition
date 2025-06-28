#!/bin/bash

# Transcript Terminal Commands - Quick Access Script
# Usage: ./transcript-commands.sh [command] [options]

BASE_URL="http://localhost:3000"

show_help() {
    echo "🎯 Transcript Terminal Commands"
    echo "================================"
    echo ""
    echo "Quick Commands:"
    echo "  ./transcript-commands.sh speakers           # Get all speakers"
    echo "  ./transcript-commands.sh topics             # Get topic distribution"
    echo "  ./transcript-commands.sh latest             # Get latest conversation"
    echo "  ./transcript-commands.sh search [term]      # Search for term"
    echo "  ./transcript-commands.sh user [id]          # Get user messages"
    echo "  ./transcript-commands.sh lars [id]          # Get Lars messages"
    echo "  ./transcript-commands.sh wiktoria [id]      # Get Wiktoria messages"
    echo "  ./transcript-commands.sh summary [id]       # Get conversation summary"
    echo "  ./transcript-commands.sh tools [id]         # Get tool calls"
    echo ""
    echo "Examples:"
    echo "  ./transcript-commands.sh search cycling"
    echo "  ./transcript-commands.sh user 892969db-8e17-47d0-b443-02f69f77cf2e"
    echo "  ./transcript-commands.sh summary 892969db"
}

get_speakers() {
    echo "🎭 Available Speakers:"
    curl -s "$BASE_URL/api/transcript-search?action=speakers" | jq -r '.unique_speakers[]' | sed 's/^/  - /'
}

get_topics() {
    echo "📝 Topic Distribution:"
    curl -s "$BASE_URL/api/transcript-search?action=topics" | jq -r '.topic_distribution | to_entries[] | "  \(.key): \(.value)"'
}

get_latest() {
    echo "📅 Latest Conversation:"
    LATEST=$(curl -s "$BASE_URL/api/test-db?action=query" | jq -r '.conversations[0]')
    echo "$LATEST" | jq '{id, user_name, topic, start_time}'
}

search_term() {
    if [ -z "$1" ]; then
        echo "❌ Please provide search term"
        exit 1
    fi
    echo "🔍 Search Results for: '$1'"
    curl -s "$BASE_URL/api/transcript-search?q=$1" | jq '.results[] | {conversation_id, speaker: .message.speaker, preview: .message.text[0:100]}'
}

get_user_messages() {
    if [ -z "$1" ]; then
        echo "❌ Please provide conversation ID"
        exit 1
    fi
    echo "👤 User Messages:"
    curl -s "$BASE_URL/api/transcript-filter?id=$1&speaker=User&format=text" | jq -r '.text_format'
}

get_lars_messages() {
    if [ -z "$1" ]; then
        echo "❌ Please provide conversation ID"
        exit 1
    fi
    echo "🚬 Leader Lars Messages:"
    curl -s "$BASE_URL/api/transcript-filter?id=$1&speaker=Leader Lars&format=text" | jq -r '.text_format'
}

get_wiktoria_messages() {
    if [ -z "$1" ]; then
        echo "❌ Please provide conversation ID"
        exit 1
    fi
    echo "🇵🇱 Wiktoria Messages:"
    curl -s "$BASE_URL/api/transcript-filter?id=$1&speaker=Wiktoria Cukt 2.0&format=text" | jq -r '.text_format'
}

get_summary() {
    if [ -z "$1" ]; then
        echo "❌ Please provide conversation ID"
        exit 1
    fi
    echo "📊 Conversation Summary:"
    curl -s "$BASE_URL/api/transcript-search?action=conversation-summary&id=$1" | jq '{basic_info, speaker_statistics, message_breakdown}'
}

get_tools() {
    if [ -z "$1" ]; then
        echo "❌ Please provide conversation ID"
        exit 1
    fi
    echo "🛠️ Tool Calls:"
    curl -s "$BASE_URL/api/transcript-filter?id=$1&role=MESSAGE_ROLE_TOOL_CALL" | jq '.messages[].text | fromjson'
}

# Main command router
case "$1" in
    "speakers"|"s")
        get_speakers
        ;;
    "topics"|"t")
        get_topics
        ;;
    "latest"|"l")
        get_latest
        ;;
    "search"|"find")
        search_term "$2"
        ;;
    "user"|"u")
        get_user_messages "$2"
        ;;
    "lars"|"L")
        get_lars_messages "$2"
        ;;
    "wiktoria"|"w")
        get_wiktoria_messages "$2"
        ;;
    "summary"|"sum")
        get_summary "$2"
        ;;
    "tools"|"tool")
        get_tools "$2"
        ;;
    "help"|"h"|""|"--help")
        show_help
        ;;
    *)
        echo "❌ Unknown command: $1"
        show_help
        exit 1
        ;;
esac