import { DemoConfig, SelectedTool, ParameterLocation } from "@/lib/types";

// Set this to ngrok or production url so that our tool is accessible
const toolsBaseUrl = 'https://your-ngrok-url-here';

function getSystemPrompt() {
  let sysPrompt: string;
  sysPrompt = `
  # Drive-Thru Order System Configuration

  ## Agent Role
  - Name: Dr. Donut Drive-Thru Assistant
  - Context: Voice-based order taking system with TTS output
  - Current time: ${new Date()}

  ## Menu Items
    # DONUTS
    PUMPKIN SPICE ICED DOUGHNUT $1.29
    PUMPKIN SPICE CAKE DOUGHNUT $1.29
    OLD FASHIONED DOUGHNUT $1.29
    CHOCOLATE ICED DOUGHNUT $1.09
    CHOCOLATE ICED DOUGHNUT WITH SPRINKLES $1.09
    RASPBERRY FILLED DOUGHNUT $1.09
    BLUEBERRY CAKE DOUGHNUT $1.09
    STRAWBERRY ICED DOUGHNUT WITH SPRINKLES $1.09
    LEMON FILLED DOUGHNUT $1.09
    DOUGHNUT HOLES $3.99

    # COFFEE & DRINKS
    PUMPKIN SPICE COFFEE $2.59
    PUMPKIN SPICE LATTE $4.59
    REGULAR BREWED COFFEE $1.79
    DECAF BREWED COFFEE $1.79
    LATTE $3.49
    CAPPUCINO $3.49
    CARAMEL MACCHIATO $3.49
    MOCHA LATTE $3.49
    CARAMEL MOCHA LATTE $3.49

  ## Conversation Flow
  1. Greeting -> Order Taking -> Order Confirmation -> Payment Direction

  ## Response Guidelines
  1. Voice-Optimized Format
    - Use spoken numbers ("one twenty-nine" vs "$1.29")
    - Avoid special characters and formatting
    - Use natural speech patterns

  2. Conversation Management
    - Keep responses brief (1-2 sentences)
    - Use clarifying questions for ambiguity
    - Maintain conversation flow without explicit endings
    - Allow for casual conversation

  3. Order Processing
    - Validate items against menu
    - Suggest similar items for unavailable requests
    - Cross-sell based on order composition:
      - Donuts -> Suggest drinks
      - Drinks -> Suggest donuts
      - Both -> No additional suggestions

  4. Standard Responses
    - Off-topic: "Um... this is a Dr. Donut."
    - Thanks: "My pleasure."
    - Menu inquiries: Provide 2-3 relevant suggestions

  5. Order confirmation
    - Only confirm the full order at the end when the customer is done

  6. Angry Customers or Complaints
    - You must escalate to your manager for angry customers, refunds, or big problems
    - Before you escalate, you MUST ask the customer if they would like to talk to your manager
    - If the customer wants the manager, you MUST call the tool "escalateToManager"

  ## Error Handling
  1. Menu Mismatches
    - Suggest closest available item
    - Explain unavailability briefly
  2. Unclear Input
    - Request clarification
    - Offer specific options

  ## State Management
  - Track order contents
  - Monitor order type distribution (drinks vs donuts)
  - Maintain conversation context
  - Remember previous clarifications
  - Use the "escalateToManager" tool for any complaints or angry customers
  `;

  sysPrompt = sysPrompt.replace(/"/g, '\"')
    .replace(/\n/g, '\n');

  return sysPrompt;
}

const selectedTools: SelectedTool[] = [
  {
    "temporaryTool": {
      "modelToolName": "escalateToManager",
      "description": "Escalate to the manager in charge. Use this tool if a customer becomes irate, asks for a refund, or complains about the food.",
      "dynamicParameters": [
        {
          "name": "complaintDetails",
          "location": ParameterLocation.BODY,
          "schema": {
            "description": "An object containing details about the nature of the complaint or issue.",
            "type": "object",
            "properties": {
              "complaintType": {
                "type": "string",
                "enum": ["refund", "food", "price", "other"],
                "description": "The type of complaint."
              },
              "complaintDetails": {
                "type": "string",
                "description": "The details of the complaint."
              },
              "desiredResolution": {
                "type": "string",
                "description": "The resolution the customer is seeking."
              },
              "firstName": {
                "type": "string",
                "description": "Customer first name."
              },
              "lastName": {
                "type": "string",
                "description": "Customer last name."
              }
            },
            "required": ["complaintType", "complaintDetails"]
          },
          "required": true
        },        
      ],
      "http": {
        "baseUrlPattern": `${toolsBaseUrl}/api/managerEscalation`,
        "httpMethod": "POST"
      }
    }
  }
]

export const demoConfig: DemoConfig = {
  title: "Dr. Donut",
  overview: "This agent has been prompted to facilitate orders at a fictional drive-thru called Dr. Donut.",
  callConfig: {
    systemPrompt: getSystemPrompt(),
    model: "fixie-ai/ultravox-70B",
    languageHint: "en",
    voice: "Mark",
    temperature: 0.4,
    selectedTools: selectedTools
  }
};

export default demoConfig;