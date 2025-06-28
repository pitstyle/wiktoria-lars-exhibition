# Terminal Commands for Transcript Access

Complete guide for accessing and analyzing transcript data via terminal commands.

## Prerequisites
- Dev server running: `npm run dev` (port 3000)
- MCP Supabase connection active

## 🔍 Basic Search Commands

### Get All Available Speakers
```bash
curl -s "http://localhost:3000/api/transcript-search?action=speakers" | jq
```

### Get Topic Distribution
```bash
curl -s "http://localhost:3000/api/transcript-search?action=topics" | jq
```

### Get Recent Conversations List
```bash
curl -s "http://localhost:3000/api/test-db?action=query" | jq '.conversations[]'
```

## 📝 Conversation-Specific Commands

### Get Full Transcript (Raw JSON)
```bash
curl -s "http://localhost:3000/api/test-db?action=transcript&id=CONVERSATION_ID" | jq
```

### Get Conversation Summary & Analytics
```bash
curl -s "http://localhost:3000/api/transcript-search?action=conversation-summary&id=CONVERSATION_ID" | jq
```

## 🎯 Filter by Speaker

### Get Only User Messages (Text Format)
```bash
curl -s "http://localhost:3000/api/transcript-filter?id=CONVERSATION_ID&speaker=User&format=text"
```

### Get Only Lars Messages
```bash
curl -s "http://localhost:3000/api/transcript-filter?id=CONVERSATION_ID&speaker=Leader Lars&format=json" | jq
```

### Get Only Wiktoria Messages
```bash
curl -s "http://localhost:3000/api/transcript-filter?id=CONVERSATION_ID&speaker=Wiktoria Cukt 2.0&format=text"
```

### Get System Messages (Tool Calls)
```bash
curl -s "http://localhost:3000/api/transcript-filter?id=CONVERSATION_ID&speaker=System&format=json" | jq
```

## 🔎 Content Search

### Search for Specific Words
```bash
curl -s "http://localhost:3000/api/transcript-search?q=cycling" | jq
curl -s "http://localhost:3000/api/transcript-search?q=rower" | jq
curl -s "http://localhost:3000/api/transcript-search?q=Janek" | jq
```

### Search Within Specific Speaker
```bash
curl -s "http://localhost:3000/api/transcript-search?q=speed&speaker=User" | jq
curl -s "http://localhost:3000/api/transcript-search?q=transfer&speaker=Leader Lars" | jq
```

### Search by Topic
```bash
curl -s "http://localhost:3000/api/transcript-search?topic=Sports & Performance" | jq
curl -s "http://localhost:3000/api/transcript-search?topic=General Discussion" | jq
```

## 📊 Filter by Message Properties

### Get Long Messages Only (>100 characters)
```bash
curl -s "http://localhost:3000/api/transcript-filter?id=CONVERSATION_ID&minLength=100&format=text"
```

### Get Tool Calls Only
```bash
curl -s "http://localhost:3000/api/transcript-filter?id=CONVERSATION_ID&role=MESSAGE_ROLE_TOOL_CALL" | jq
```

### Get Agent Messages Only
```bash
curl -s "http://localhost:3000/api/transcript-filter?id=CONVERSATION_ID&role=MESSAGE_ROLE_AGENT&format=summary" | jq
```

## 🛠️ Data Enhancement Commands

### Extract User Data (Name & Topic)
```bash
curl -s "http://localhost:3000/api/test-db?action=extract&id=CONVERSATION_ID" | jq
```

### Enhance with Speaker Labels
```bash
curl -s "http://localhost:3000/api/test-db?action=enhance&id=CONVERSATION_ID" | jq
```

### Get Transcript Analytics
```bash
curl -s "http://localhost:3000/api/transcript-analytics" | jq
```

## 📱 Practical Examples

### Example 1: Analyze User Input in Recent Call
```bash
# Get latest conversation ID
LATEST_ID=$(curl -s "http://localhost:3000/api/test-db?action=query" | jq -r '.conversations[0].id')

# Get user messages from that conversation
curl -s "http://localhost:3000/api/transcript-filter?id=$LATEST_ID&speaker=User&format=text"
```

### Example 2: Find All Cycling-Related Conversations
```bash
curl -s "http://localhost:3000/api/transcript-search?q=rower" | jq '.results[] | {conversation_id, speaker: .message.speaker, text: .message.text}'
```

### Example 3: Get Conversation Flow Summary
```bash
curl -s "http://localhost:3000/api/transcript-search?action=conversation-summary&id=CONVERSATION_ID" | jq '.conversation_flow'
```

### Example 4: Export User Statements for Analysis
```bash
curl -s "http://localhost:3000/api/transcript-filter?id=CONVERSATION_ID&speaker=User&format=text" > user_statements.txt
```

## 🎨 Pretty Output with jq

### Colorized JSON Output
```bash
curl -s "http://localhost:3000/api/transcript-search?action=speakers" | jq -C
```

### Extract Specific Fields
```bash
curl -s "http://localhost:3000/api/test-db?action=query" | jq '.conversations[] | {id, user_name, topic}'
```

### Count Messages by Speaker
```bash
curl -s "http://localhost:3000/api/transcript-search?action=conversation-summary&id=CONVERSATION_ID" | jq '.speaker_statistics'
```

## 🔧 Advanced Combinations

### Find Technical Discussions
```bash
curl -s "http://localhost:3000/api/transcript-search?q=technology&topic=Technology & Innovation" | jq
```

### Get All Transfer Events
```bash
curl -s "http://localhost:3000/api/transcript-search?q=transfer" | jq '.results[] | select(.message.role == "MESSAGE_ROLE_TOOL_CALL")'
```

### Export Conversation Timeline
```bash
curl -s "http://localhost:3000/api/transcript-search?action=conversation-summary&id=CONVERSATION_ID" | jq '.conversation_flow[] | "\(.index): \(.speaker) - \(.preview)"' -r
```

## 📝 Quick Reference IDs

Recent conversation IDs (use in commands above):
- Latest cycling conversation: `892969db-8e17-47d0-b443-02f69f77cf2e`
- Previous cycling conversation: `d4e0a4d1-ca4f-4ff4-908b-0a9015b82c47`

## 💡 Pro Tips

1. **Pipe to jq** for pretty formatting: `| jq`
2. **Save output** to files: `> output.json`
3. **Use variables** for conversation IDs: `ID=892969db-8e17-47d0-b443-02f69f77cf2e`
4. **Combine with grep** for text filtering: `| grep "cycling"`
5. **Use -s flag** with curl to suppress progress bars

## ⚡ Quick Scripts

### Get Today's Conversations
```bash
curl -s "http://localhost:3000/api/test-db?action=query" | jq '.conversations[] | select(.start_time | startswith("2025-06-27"))'
```

### Find Conversations by User Name
```bash
curl -s "http://localhost:3000/api/test-db?action=query" | jq '.conversations[] | select(.user_name == "Janek")'
```

### Get All Tool Call Data
```bash
curl -s "http://localhost:3000/api/transcript-search?role=MESSAGE_ROLE_TOOL_CALL" | jq '.results[].message.text | fromjson'
```