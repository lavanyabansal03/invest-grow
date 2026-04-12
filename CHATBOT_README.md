# Chatbot Integration Setup

## Overview
Your PaperTrade app now includes an AI chatbot powered by Google's Gemini API. The chatbot appears as a mascot button in the header and provides educational assistance for investing and trading.

## Features
- **Mascot Button**: Click the "AI Assistant" button in the header to open the chatbot
- **Sidebar Integration**: If the sidebar is collapsed, clicking the mascot will open it first
- **Responsive Design**: Chat panel slides in from the right on all devices
- **Real-time Chat**: Send messages and receive AI responses instantly
- **Educational Focus**: The AI is specifically trained to help with investing education

## Setup Instructions

### 1. Get Gemini API Key
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Create a new API key
4. Copy the API key

### 2. Configure Environment Variable
1. Open your `.env` file in the project root
2. Replace `your_gemini_api_key_here` with your actual Gemini API key:
   ```
   VITE_GEMINI_API_KEY=your_actual_api_key_here
   ```

### 3. Restart Development Server
After adding the API key, restart your development server:
```bash
npm run dev
```

## How It Works

### Mascot Button Behavior
- **Header Location**: The mascot button is positioned in the top-right header
- **Click Action**: Opens the chatbot panel (and expands sidebar if collapsed)
- **Visual**: MessageCircle icon with "AI Assistant" text (text hidden on small screens)

### Chatbot Features
- **Sliding Panel**: Animates in from the right side
- **Message History**: Maintains conversation context
- **Loading States**: Shows spinner while AI is responding
- **Error Handling**: Graceful fallbacks if API is unavailable
- **Mobile Friendly**: Full overlay on mobile devices

### AI Agent Configuration
The chatbot uses a specialized prompt that makes it behave as an educational investing assistant:
- Focuses on learning and education
- Provides clear explanations
- Uses real market examples
- Encourages responsible investing
- Never gives actual financial advice

## Customization

### Replacing the Chatbot UI
If you have your own chatbot UI component, you can replace the current `Chatbot.tsx` component. The interface expects:
- `isOpen`: boolean prop to control visibility
- `onClose`: function to close the chatbot

### Modifying the AI Prompt
Edit the `INVESTING_AGENT_PROMPT` in `src/lib/gemini.ts` to change how the AI behaves.

### Styling
The chatbot uses your existing design system (shadcn/ui components) and can be customized by modifying the component styles.

## API Integration Details

The Gemini integration is handled in `src/lib/gemini.ts`:
- Uses the `gemini-pro` model
- Configured for educational responses
- Includes proper error handling
- Maintains conversation history

## Troubleshooting

### API Key Issues
- Ensure the API key is correctly set in `.env`
- Check that the key has proper permissions
- Verify the key format (should start with "AIza...")

### Build Issues
- Make sure all dependencies are installed: `npm install`
- Check for TypeScript errors: `npm run build`

### Chatbot Not Appearing
- Verify the mascot button is visible in the header
- Check browser console for errors
- Ensure the sidebar context is properly set up

## Next Steps
1. Add your Gemini API key to the `.env` file
2. Test the chatbot functionality
3. Customize the AI prompt if needed
4. Replace with your custom UI if desired