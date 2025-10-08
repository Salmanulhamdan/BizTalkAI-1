# Design Guidelines: Hainager Voice Directory

## Design Approach
**Reference-Based: iOS/Apple HIG** - The existing minimalist interface establishes a strong foundation. We'll maintain the clean iOS aesthetic while layering in conversational UI patterns inspired by modern voice apps (Voice Memos, phone calls).

## Core Design Principles
1. **Mobile-First Interaction**: Touch-optimized, thumb-friendly, single-handed operation
2. **Conversational Clarity**: Clear visual states distinguish browsing from talking modes
3. **Minimal Distraction**: During voice conversations, UI recedes to let audio take center stage
4. **Instant Feedback**: Every interaction provides immediate visual confirmation

## Color Palette

**Light Mode (Primary)**
- Background: 255 0% 100% (white)
- Card Surface: 255 0% 100% (white) 
- Text Primary: 0 0% 7% (#111)
- Text Muted: 220 9% 46% (#6b7280)
- Brand Blue: 211 100% 50% (#007aff - iOS blue)
- Success Green: 142 71% 45% (call connected)
- Error Red: 0 84% 60% (connection issues)
- Divider: 0 0% 95% (#f1f1f1)

**Dark Mode**
- Background: 0 0% 7% (#111)
- Card Surface: 0 0% 11% (#1c1c1e)
- Text Primary: 0 0% 100% (white)
- Text Muted: 220 9% 63%
- Brand Blue: 211 100% 50% (same)
- Divider: 0 0% 20%

## Typography
- **Font Stack**: -apple-system, SF Pro Text, Helvetica Neue, Arial
- **Header Title**: 20px, weight 700, -0.2px letter-spacing
- **Subtitle**: 13px, muted color
- **Company Names**: 16px, weight 400
- **Voice UI Labels**: 15px, weight 600
- **Status Text**: 13px, weight 500

## Layout System
**Spacing Units**: Tailwind 2, 3, 4, 6, 8, 12, 16 (8px base grid)
- Container padding: 16px horizontal
- Card max-width: 420px
- Safe area insets respected (iOS notch/home indicator)
- Sticky header stays at viewport top
- Smooth scroll behavior

## Component Library

### 1. Directory View (Existing)
- Sticky header with logo + morphing subtitle
- Search input (44px height, rounded)
- Scrollable company list with bullet indicators
- Active state: light blue background on tap

### 2. Voice Conversation Overlay
**Full-screen modal** that slides up from bottom when company is selected:

**Header Section** (80px)
- Company name (18px, weight 600)
- Subtitle: "AI Assistant" (13px, muted)
- Close button (top-right, 44px tap target)

**Center Voice Visualizer** (expands to fill space)
- Large circular waveform (200px diameter on mobile)
- Pulsing animation during active speech
- Company initial letter in center when idle
- States: Idle → Connecting → Listening → Speaking → Error

**Visual States**:
- Idle: Static circle, light gray
- Connecting: Rotating spinner, brand blue
- Listening: Gentle pulse, brand blue glow
- Speaking: Active waveform bars, green accent
- Error: Red border pulse

**Bottom Controls** (120px, safe-area-inset-bottom padding)
- Primary action button (64px circle)
  - Microphone icon when idle/listening
  - Stop square when recording
  - Phone icon for hang-up
- Mute button (48px, left side)
- Speaker toggle (48px, right side)

### 3. Connection States
**Toast notifications** (top of voice overlay):
- "Connecting..." - Spinner + text
- "Connected" - Checkmark + fade out after 1s
- "Connection lost" - Red background, retry button
- Semi-transparent background blur

### 4. Buttons
- Primary: Brand blue, 44px min height, 12px border-radius
- Secondary: Light gray background (#f1f1f1), same dimensions
- Icon buttons: 44px square, circular on press
- All buttons: 600 weight, no letter-spacing

## Voice UI Interaction Flow

**Step 1**: User taps company name
**Step 2**: Modal slides up (300ms ease-out)
**Step 3**: "Connecting..." state shows immediately
**Step 4**: On connection, auto-start AI greeting
**Step 5**: Visual waveform during conversation
**Step 6**: Tap close or hang-up to return to directory

## Animations (Minimal)
- Modal slide-up: 300ms cubic-bezier
- Waveform pulse: 1.5s ease-in-out infinite
- Button press: Scale 0.95, 100ms
- Connecting spinner: 1s linear infinite
- NO scroll-triggered animations
- NO complex page transitions

## Accessibility
- 44px minimum tap targets
- High contrast text (4.5:1 minimum)
- Voice state changes announced to screen readers
- Dark mode maintains same contrast ratios
- Focus indicators on all interactive elements

## Mobile Optimizations
- Viewport height: 100svh (safe area aware)
- Touch feedback on all tappable items
- No hover states (touch-only)
- Haptic feedback on call connect/disconnect (if available)
- Portrait-only orientation lock recommended

## Images
**None required** - This is a utility app focused on voice interaction. The waveform visualizer and company initial circles provide sufficient visual interest without photography.